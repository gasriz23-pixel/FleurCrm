import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { createSession, hashPassword, verifyPassword } from "../../../../lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || password.length < 8) {
    return NextResponse.json({ error: "Email e password non valide" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
  }

  // Upgrade legacy hashes transparently after a successful login.
  if (!user.passwordHash.startsWith("scrypt$")) {
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password) },
    });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
