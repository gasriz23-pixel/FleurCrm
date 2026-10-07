import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { hashPassword } from "../../../../lib/auth";
import { requireUser } from "../../../../lib/permissions";
import { UserRole } from "@prisma/client";

const roles = new Set(Object.values(UserRole));

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  let actor;
  try { actor = await requireUser([UserRole.ADMIN]); } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "FORBIDDEN" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const data: { name?: string; email?: string; role?: UserRole; passwordHash?: string } = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Nome non valido" }, { status: 400 });
    data.name = name;
  }
  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Email non valida" }, { status: 400 });
    data.email = email;
  }
  if (body.role !== undefined) {
    const role = String(body.role);
    if (!roles.has(role as UserRole)) return NextResponse.json({ error: "Ruolo non valido" }, { status: 400 });
    data.role = role as UserRole;
  }
  if (body.password !== undefined) {
    const password = String(body.password);
    if (password.length < 8) return NextResponse.json({ error: "La password deve avere almeno 8 caratteri" }, { status: 400 });
    data.passwordHash = hashPassword(password);
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: "Nessuna modifica richiesta" }, { status: 400 });

  try {
    const updated = await db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, role: true },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          entityType: "User",
          entityId: id,
          action: "UPDATED",
          payload: { ...data, passwordHash: undefined },
        },
      });
      return user;
    });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Esiste già un utente con questa email" }, { status: 409 });
    }
    return NextResponse.json({ error: "Impossibile aggiornare l'utente" }, { status: 500 });
  }
}
