import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { requireArea } from "../../../lib/permissions";

export async function GET() {
  try { await requireArea("TASKS"); } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "FORBIDDEN" }, { status: 403 });
  }
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}
