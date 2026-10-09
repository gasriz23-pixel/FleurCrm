import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { hashPassword } from "../../../../lib/auth";
import { UserRole } from "@prisma/client";

export async function POST(req: Request) {
  const expected = process.env.ADMIN_BOOTSTRAP_TOKEN;
  if (!expected) return NextResponse.json({ error: "Configurazione iniziale non disponibile" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  if (token.length !== expected.length || token !== expected) {
    return NextResponse.json({ error: "Link di configurazione non valido" }, { status: 403 });
  }

  const password = String(body.password ?? "");
  if (password.length < 12) {
    return NextResponse.json({ error: "La password deve contenere almeno 12 caratteri" }, { status: 400 });
  }

  const email = "gasriz23@gmail.com";
  const existing = await db.user.findUnique({ where: { email } });
  if (existing?.passwordHash) {
    return NextResponse.json({ error: "L'account è già configurato. Accedi dalla pagina di login." }, { status: 409 });
  }

  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: { name: "Gaspare", role: UserRole.ADMIN, passwordHash: hashPassword(password) },
    });
  } else {
    await db.user.create({
      data: { name: "Gaspare", email, role: UserRole.ADMIN, passwordHash: hashPassword(password) },
    });
  }

  return NextResponse.json({ ok: true });
}
