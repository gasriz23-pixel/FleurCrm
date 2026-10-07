import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const allowed = ["title","description","status","priority","dueAt","assigneeId","creatorId","companyId"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) data[key] = key === "dueAt" && body[key] ? new Date(body[key]) : body[key];
  const task = await db.$transaction(async tx => {
    const updated = await tx.task.update({ where: { id: params.id }, data, include: { assignee: true, company: true } });
    await tx.auditLog.create({ data: { entityType: "Task", entityId: params.id, action: "UPDATED", payload: data } });
    return updated;
  });
  return NextResponse.json(task);
}
