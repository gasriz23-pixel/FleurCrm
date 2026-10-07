import { Worker } from "bullmq";
import IORedis from "ioredis";
import { db } from "../../../lib/db";
import { providerRegistry } from "../../../lib/search/registry";
import { dedupeLeads } from "../../../lib/search/dedupe";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

function normalize(value?: string | null) {
  return (value ?? "").trim().toLowerCase().replace(/\\s+/g, " ");
}

function normalizeWebsite(value?: string | null) {
  if (!value) return "";
  try {
    const url = new URL(value.startsWith("http") ? value : "https://" + value);
    return url.hostname.replace(/^www\\./, "").toLowerCase() + url.pathname.replace(/\\/$/, "").toLowerCase();
  } catch {
    return normalize(value).replace(/^https?:\\/\\//, "").replace(/^www\\./, "").replace(/\\/$/, "");
  }
}

function identityKey(lead: { name: string; address?: string; city?: string; website?: string }) {
  const website = normalizeWebsite(lead.website);
  if (website) return "web:" + website;
  return "name:" + normalize(lead.name) + "|address:" + normalize(lead.address) + "|city:" + normalize(lead.city);
}

new Worker(
  "lead-search",
  async (job) => {
    const s = await db.searchJob.findUnique({ where: { id: job.data.searchJobId } });
    if (!s) return;

    try {
      await db.searchJob.update({
        where: { id: s.id },
        data: { status: "RUNNING", startedAt: new Date(), progress: 10, error: null },
      });

      const candidates = await providerRegistry.searchAll({
        query: s.query,
        city: s.city ?? undefined,
        province: s.province ?? undefined,
        region: s.region ?? undefined,
        cap: s.cap ?? undefined,
        radiusKm: s.radiusKm ?? undefined,
        categories: Array.isArray(s.categories) ? s.categories.map(String) : [],
        filters: s.filters ?? {},
      });

      const leads = dedupeLeads(candidates);
      let inserted = 0;

      for (const lead of leads) {
        if (!lead.name) continue;

        const key = identityKey(lead);
        const website = normalizeWebsite(lead.website);
        const existing = await db.company.findUnique({ where: { identityKey: key } });

        if (existing) {
          await db.company.update({
            where: { id: existing.id },
            data: {
              website: existing.website ?? lead.website,
              normalizedWebsite: existing.normalizedWebsite ?? website || null,
              phone: existing.phone ?? lead.phone,
              email: existing.email ?? lead.email,
              address: existing.address ?? lead.address,
              city: existing.city ?? lead.city,
              province: existing.province ?? lead.province,
              region: existing.region ?? lead.region,
              cap: existing.cap ?? lead.cap,
              sourceUrl: existing.sourceUrl ?? lead.sourceUrl,
              lastVerifiedAt: new Date(),
              confidence: Math.max(existing.confidence, lead.email && lead.phone ? 0.8 : 0.5),
              deletedAt: null,
            },
          });
          continue;
        }

        await db.company.create({
          data: {
            name: lead.name,
            normalizedName: normalize(lead.name),
            identityKey: key,
            category: lead.category,
            address: lead.address,
            city: lead.city,
            province: lead.province,
            region: lead.region,
            cap: lead.cap,
            website: lead.website,
            normalizedWebsite: website || null,
            phone: lead.phone,
            email: lead.email,
            sourceUrl: lead.sourceUrl,
            lastVerifiedAt: new Date(),
            confidence: lead.email && lead.phone ? 0.8 : 0.5,
          },
        });
        inserted++;
      }

      await db.searchJob.update({
        where: { id: s.id },
        data: { status: "COMPLETED", progress: 100, totalFound: inserted, completedAt: new Date() },
      });
    } catch (e) {
      await db.searchJob.update({
        where: { id: s.id },
        data: {
          status: "FAILED",
          error: e instanceof Error ? e.message : "Unknown error",
          completedAt: new Date(),
        },
      });
      throw e;
    }
  },
  { connection, concurrency: 3 }
);

console.log("FleurCrm worker online");
