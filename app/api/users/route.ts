import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

export async function GET() {
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}
