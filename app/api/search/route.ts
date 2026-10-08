import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../lib/db";
import { leadSearchQueue } from "../../../lib/queue";
import { requireArea } from "../../../lib/permissions";

const text = z.string().trim().max(200);
const list = z.array(z.string().trim().min(1).max(120));

const searchSchema = z.object({
  query: text.default(""),
  city: text.optional(),
  province: text.optional(),
  region: text.optional(),
  cap: z.string().trim().regex(/^\d{5}$/).optional(),
  radiusKm: z.number().finite().min(0).max(100).optional(),
  categories: list.max(20).default([]),
  filters: z.object({
    cities: list.max(500).default([]),
    regions: list.max(20).default([]),
    providerConcurrency: z.number().finite().int().min(1).max(3).default(3),
    searchConcurrency: z.number().finite().int().min(1).max(8).default(4),
  }).catch({
    cities: [],
    regions: [],
    providerConcurrency: 3,
    searchConcurrency: 4,
  }).default({
    cities: [],
    regions: [],
    providerConcurrency: 3,
    searchConcurrency: 4,
  }),
});

export async function POST(req: Request) {
  try {
    await requireArea("SEARCH");
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "FORBIDDEN" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_SEARCH_REQUEST", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const {query, city, province, region, cap, radiusKm, categories, filters} = parsed.data;
  const safeFilters = {
    ...filters,
    cities: filters.cities.slice(0, 500),
    regions: filters.regions.slice(0, 20),
  };

  const job = await db.searchJob.create({
    data: {
      query,
      city,
      province,
      region,
      cap,
      radiusKm,
      categories,
      filters: safeFilters,
    },
  });

  await leadSearchQueue.add(
    "search",
    {searchJobId: job.id},
    {removeOnComplete: 100, removeOnFail: 100},
  );

  return NextResponse.json(
    {jobId: job.id, status: job.status},
    {status: 202},
  );
}
