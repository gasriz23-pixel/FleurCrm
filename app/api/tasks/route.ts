import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { requireArea } from "../../../lib/permissions";

export async function GET(req: Request) {
  try { await requireArea("TASKS"); } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "FORBIDDEN" }, { status: 403 });
  }
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
  let user;
  try { user = await requireArea("TASKS"); } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "FORBIDDEN" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "Titolo obbligatorio" }, { status: 400 });
  if (body.recurrenceRule && !["DAILY", "WEEKLY", "MONTHLY"].includes(body.recurrenceRule)) {
    return NextResponse.json({ error: "Ricorrenza non valida" }, { status: 400 });
  }
  if (body.recurrenceRule && !body.dueAt) {
    return NextResponse.json({ error: "Una attività ricorrente richiede una scadenza" }, { status: 400 });
  }
  if (body.dueAt && Number.isNaN(new Date(body.dueAt).getTime())) {
    return NextResponse.json({ error: "Scadenza non valida" }, { status: 400 });
  }
  const task = await db.$transaction(async tx => {
    const created = await tx.task.create({
      data: {
        title: body.title.trim(), description: body.description || null,
        priority: body.priority || "MEDIUM", status: body.status || "TODO",
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        recurrenceRule: body.recurrenceRule || null,
        nextRunAt: body.dueAt && body.recurrenceRule ? new Date(body.dueAt) : null,
        assigneeId: body.assigneeId || null, creatorId: user.id, companyId: body.companyId || null,
      },
      include: { assignee: true, company: true },
    });
    await tx.auditLog.create({ data: { userId: user.id, entityType: "Task", entityId: created.id, action: "CREATED", payload: body } });
    return created;
  });
  return NextResponse.json(task, { status: 201 });
}
