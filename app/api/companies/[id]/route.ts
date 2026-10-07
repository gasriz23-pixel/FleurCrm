import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const company = await db.company.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { contacts: true, sources: { orderBy: { createdAt: "desc" } }, tasks: { orderBy: { updatedAt: "desc" }, include: { assignee: true } } },
  });
  if (!company) return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
  return NextResponse.json(company);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const allowed = ["name","category","address","city","province","region","cap","website","phone","email","status","rating","reviewCount","roomsOrSeats","decisionMakerName","decisionMakerRole","linkedinUrl"];
  const data = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
  const existing = await db.company.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
  const updated = await db.$transaction(async tx => {
    const result = await tx.company.update({ where: { id: params.id }, data });
    await tx.auditLog.create({ data: { entityType: "Company", entityId: params.id, action: "UPDATED", payload: data } });
    return result;
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const existing = await db.company.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: "Lead non trovato" }, { status: 404 });
  await db.$transaction([
    db.company.update({ where: { id: params.id }, data: { deletedAt: new Date() } }),
    db.auditLog.create({ data: { entityType: "Company", entityId: params.id, action: "SOFT_DELETED" } }),
  ]);
  return NextResponse.json({ ok: true });
}
