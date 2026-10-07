import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { requireArea } from "../../../../lib/permissions";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let user;
  try { user = await requireArea("TASKS"); } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "FORBIDDEN" }, { status: 403 });
  }
  const body = await req.json();
  const allowed = ["title","description","status","priority","dueAt","assigneeId","companyId"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) data[key] = key === "dueAt" && body[key] ? new Date(body[key]) : body[key];
  const task = await db.$transaction(async tx => {
    const updated = await tx.task.update({ where: { id: params.id }, data, include: { assignee: true, company: true } });
    await tx.auditLog.create({ data: { userId: user.id, entityType: "Task", entityId: params.id, action: "UPDATED", payload: data } });
    return updated;
  });
  return NextResponse.json(task);
}
