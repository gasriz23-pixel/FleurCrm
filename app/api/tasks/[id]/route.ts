import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "../../../../lib/db";
import { requireArea } from "../../../../lib/permissions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let user;
  try { user = await requireArea("TASKS"); } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "FORBIDDEN" }, { status: 403 });
  }
  const {id}=await params;
  const body = await req.json();
  const allowed = ["title","description","status","priority","dueAt","recurrenceRule","nextRunAt","assigneeId","companyId"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) data[key] = key === "dueAt" && body[key] ? new Date(body[key]) : body[key];

  if ("recurrenceRule" in body) {
    if (body.recurrenceRule && !["DAILY", "WEEKLY", "MONTHLY"].includes(body.recurrenceRule)) {
      return NextResponse.json({ error: "Ricorrenza non valida" }, { status: 400 });
    }
    if (body.recurrenceRule) {
      const dueAt = "dueAt" in body ? (body.dueAt ? new Date(body.dueAt) : null) : undefined;
      if (dueAt === null) return NextResponse.json({ error: "Una attività ricorrente richiede una scadenza" }, { status: 400 });
      if (dueAt) data.nextRunAt = dueAt;
    } else {
      data.nextRunAt = null;
    }
  }
  const task = await db.$transaction(async tx => {
    const updated = await tx.task.update({ where: { id }, data, include: { assignee: true, company: true } });
    await tx.auditLog.create({ data: { userId: user.id, entityType: "Task", entityId: id, action: "UPDATED", payload: data as Prisma.InputJsonValue } });
    return updated;
  });
  return NextResponse.json(task);
}
