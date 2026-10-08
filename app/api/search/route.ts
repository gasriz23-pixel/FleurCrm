import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { leadSearchQueue } from "../../../lib/queue";
import { requireArea } from "../../../lib/permissions";

export async function POST(req: Request) {
  try { await requireArea("SEARCH"); } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "FORBIDDEN" }, { status: 403 });
  }
  const body = await req.json();
  const filters = body.filters && typeof body.filters === "object" ? body.filters : {};
  const radiusKm = body.radiusKm == null ? undefined : Math.min(100, Math.max(0, Number(body.radiusKm)));
  const categories = Array.isArray(body.categories) ? body.categories.map(String).filter(Boolean).slice(0, 20) : [];
  const safeFilters = {
    ...filters,
    cities: Array.isArray(filters.cities) ? filters.cities.map(String).map((x:string)=>x.trim()).filter(Boolean).slice(0, 500) : [],
    regions: Array.isArray(filters.regions) ? filters.regions.map(String).map((x:string)=>x.trim()).filter(Boolean).slice(0, 20) : [],
    providerConcurrency: Math.min(3, Math.max(1, Number(filters.providerConcurrency ?? 3)))
  };
  const job = await db.searchJob.create({ data: {
    query: body.query ?? "", city: body.city, province: body.province, region: body.region,
    cap: typeof body.cap === "string" ? body.cap.trim() : undefined, radiusKm, categories, filters: safeFilters
  }});
  await leadSearchQueue.add("search", { searchJobId: job.id }, { removeOnComplete:100, removeOnFail:100 });
  return NextResponse.json({ jobId: job.id, status: job.status }, { status: 202 });
}
