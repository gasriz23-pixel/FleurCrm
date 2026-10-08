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
  const existing = await db.task.findUnique({
    where: { id },
    select: { dueAt: true, recurrenceRule: true },
  });
  if (!existing) return NextResponse.json({ error: "Task non trovata" }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = key === "dueAt" && body[key] ? new Date(body[key]) : body[key];
  }

  if ("dueAt" in body && body.dueAt) {
    const dueAt = new Date(body.dueAt);
    if (Number.isNaN(dueAt.getTime())) {
      return NextResponse.json({ error: "Scadenza non valida" }, { status: 400 });
    }
  }

  if ("recurrenceRule" in body) {
    if (body.recurrenceRule && !["DAILY", "WEEKLY", "MONTHLY"].includes(body.recurrenceRule)) {
      return NextResponse.json({ error: "Ricorrenza non valida" }, { status: 400 });
    }

    data.recurrenceRule = body.recurrenceRule || null;

    if (body.recurrenceRule) {
      const dueAt = "dueAt" in body
        ? (body.dueAt ? new Date(body.dueAt) : null)
        : existing.dueAt;

      if (!dueAt) {
        return NextResponse.json({ error: "Una attività ricorrente richiede una scadenza" }, { status: 400 });
      }

      data.nextRunAt = dueAt;
    } else {
      data.nextRunAt = null;
    }
  } else if ("dueAt" in body && existing.recurrenceRule) {
    data.nextRunAt = body.dueAt ? new Date(body.dueAt) : null;
  }
  const task = await db.$transaction(async tx => {
    const updated = await tx.task.update({ where: { id }, data, include: { assignee: true, company: true } });
    await tx.auditLog.create({ data: { userId: user.id, entityType: "Task", entityId: id, action: "UPDATED", payload: data as Prisma.InputJsonValue } });
    return updated;
  });
  return NextResponse.json(task);
}
