import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { createSession, hashPassword, verifyPassword } from "../../../../lib/auth";
import { consumeRateLimit } from "../../../../lib/rate-limit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || password.length < 8) {
    return NextResponse.json({ error: "Email e password non valide" }, { status: 400 });
  }

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const [emailLimit, ipLimit] = await Promise.all([
    consumeRateLimit(`login-email:${email}`, 10, 15 * 60),
    consumeRateLimit(`login-ip:${forwarded}`, 30, 15 * 60),
  ]);
  if (!emailLimit.allowed || !ipLimit.allowed) {
    return NextResponse.json({ error: "Troppe richieste. Riprova più tardi." }, { status: 429 });
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
