import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { leadSearchQueue } from "../../../lib/queue";
import { requireArea } from "../../../lib/permissions";

export async function POST(req: Request) {
  try { await requireArea("SEARCH"); } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "FORBIDDEN" }, { status: 403 });
  }
  const body = await req.json();
  const job = await db.searchJob.create({ data: {
    query: body.query ?? "", city: body.city, province: body.province, region: body.region,
    cap: body.cap, radiusKm: body.radiusKm, categories: body.categories ?? [], filters: body.filters ?? {}
  }});
  await leadSearchQueue.add("search", { searchJobId: job.id }, { removeOnComplete:100, removeOnFail:100 });
  return NextResponse.json({ jobId: job.id, status: job.status }, { status: 202 });
}
