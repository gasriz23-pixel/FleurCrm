import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { createSession, hashPassword, verifyPassword } from "../../../../lib/auth";
import { consumeRateLimit } from "../../../../lib/rate-limit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const rememberDevice = body.rememberDevice === true;

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

  // Persistent login is reserved for the explicitly configured owner account.
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  if (rememberDevice && !ownerEmail) {
    return NextResponse.json({
      error: "Accesso persistente non configurato. Imposta OWNER_EMAIL nelle variabili ambiente di Vercel.",
    }, { status: 503 });
  }
  const canRemember = rememberDevice && user.role === "ADMIN" && email === ownerEmail;

  // Upgrade legacy hashes transparently after a successful login.
  if (!user.passwordHash.startsWith("scrypt$")) {
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password) },
    });
  }

  await createSession(user.id, canRemember);
  return NextResponse.json({ ok: true, remembered: canRemember });
}
