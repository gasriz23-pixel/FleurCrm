import { cookies } from "next/headers";
import crypto from "node:crypto";
import { db } from "./db";

const COOKIE = "fleur_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const REMEMBERED_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function sign(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET non configurato");
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  if (!stored.startsWith("scrypt$")) {
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("AUTH_SECRET non configurato");
    const actual = crypto.scryptSync(password, secret, 64);
    const expected = Buffer.from(stored, "hex");
    return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
  }

  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

export async function createSession(userId: string, rememberDevice = false) {
  const ttlSeconds = rememberDevice ? REMEMBERED_SESSION_TTL_SECONDS : SESSION_TTL_SECONDS;
  const value = `${userId}.${Date.now() + ttlSeconds * 1000}`;
  const token = `${value}.${sign(value)}`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttlSeconds,
  });
}

export function verifySessionToken(token: string) {
  const [userId, expires, signature] = token.split(".");
  if (!userId || !expires || !signature || Number(expires) < Date.now()) return null;
  try {
    const expectedSignature = sign(`${userId}.${expires}`);
    const actual = Buffer.from(signature, "hex");
    const expected = Buffer.from(expectedSignature, "hex");
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    return { userId, expires: Number(expires) };
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = verifySessionToken(token);
  if (!session) return null;

  return db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}
