import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { hashPassword } from "../../../lib/auth";
import { requireUser } from "../../../lib/permissions";
import { UserRole } from "@prisma/client";

const roles = new Set(Object.values(UserRole));
const MIN_PASSWORD_LENGTH = 12;

export async function GET() {
  try { await requireUser([UserRole.ADMIN]); } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "FORBIDDEN" }, { status: 403 });
  }
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  let actor;
  try { actor = await requireUser([UserRole.ADMIN]); } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = String(body.role ?? "COMMERCIAL");

  if (!name || !email || !password || password.length < MIN_PASSWORD_LENGTH || !roles.has(role as UserRole)) {
    return NextResponse.json(
      { error: `Nome, email, ruolo e password di almeno ${MIN_PASSWORD_LENGTH} caratteri sono obbligatori` },
      { status: 400 },
    );
  }

  try {
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email, role: role as UserRole, passwordHash: hashPassword(password) },
        select: { id: true, name: true, email: true, role: true },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          entityType: "User",
          entityId: created.id,
          action: "CREATED",
          payload: { name, email, role },
        },
      });
      return created;
    });
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Esiste già un utente con questa email" }, { status: 409 });
    }
    return NextResponse.json({ error: "Impossibile creare l'utente" }, { status: 500 });
  }
}
