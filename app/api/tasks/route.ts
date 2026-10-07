import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const assigneeId = url.searchParams.get("assigneeId") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const companyId = url.searchParams.get("companyId") || undefined;
  const tasks = await db.task.findMany({
    where: { ...(assigneeId ? { assigneeId } : {}), ...(status ? { status: status as never } : {}), ...(companyId ? { companyId } : {}) },
    include: { assignee: true, creator: true, company: { select: { id: true, name: true } } },
    orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
  });
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "Titolo obbligatorio" }, { status: 400 });
  const task = await db.$transaction(async tx => {
    const created = await tx.task.create({
      data: {
        title: body.title.trim(), description: body.description || null,
        priority: body.priority || "MEDIUM", status: body.status || "TODO",
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        assigneeId: body.assigneeId || null, creatorId: body.creatorId || null, companyId: body.companyId || null,
      },
      include: { assignee: true, company: true },
    });
    await tx.auditLog.create({ data: { entityType: "Task", entityId: created.id, action: "CREATED", payload: body } });
    return created;
  });
  return NextResponse.json(task, { status: 201 });
}
