import type {LeadCandidate} from "./providers";

function clean(value?: string | null) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeWebsite(value?: string | null) {
  if (!value) return "";
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.hostname
      .replace(/^www\./i, "")
      .toLowerCase()
      .replace(/\.$/, "");
  } catch {
    return clean(value)
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split(/[/?#]/, 1)[0];
  }
}

export function normalizePhone(value?: string | null) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0039")) return "39" + digits.slice(4);
  if (digits.startsWith("39") && digits.length >= 10) return digits;
  if (digits.length >= 8) return digits;
  return "";
}

function normalizeAddress(value?: string | null) {
  return clean(value)
    .replace(/\b(via|viale|piazza|corso|strada|loc|localita|lungomare)\b/g, "")
    .replace(/\b(n|nr|numero)\.?\s*/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeName(value?: string | null) {
  return clean(value)
    .replace(/\b(srl|srls|spa|s\.p\.a\.|snc|sas|societa|soc|cooperative|coop)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenSimilarity(a: string, b: string) {
  const aa = new Set(a.split(" ").filter(Boolean));
  const bb = new Set(b.split(" ").filter(Boolean));
  if (!aa.size || !bb.size) return 0;
  let intersection = 0;
  for (const token of aa) if (bb.has(token)) intersection++;
  return intersection / (aa.size + bb.size - intersection);
}

function sameIdentity(a: LeadCandidate, b: LeadCandidate) {
  const websiteA = normalizeWebsite(a.website);
  const websiteB = normalizeWebsite(b.website);
  if (websiteA && websiteB && websiteA === websiteB) return true;

  const phoneA = normalizePhone(a.phone);
  const phoneB = normalizePhone(b.phone);
  if (phoneA && phoneB && phoneA === phoneB) return true;

  const cityA = clean(a.city);
  const cityB = clean(b.city);
  const addressA = normalizeAddress(a.address);
  const addressB = normalizeAddress(b.address);
  if (cityA && cityB && cityA === cityB && addressA && addressB && addressA === addressB) {
    return true;
  }

  const nameA = normalizeName(a.name);
  const nameB = normalizeName(b.name);
  if (!nameA || !nameB) return false;
  if (cityA && cityB && cityA === cityB && tokenSimilarity(nameA, nameB) >= 0.75) return true;
  return !cityA && !cityB && tokenSimilarity(nameA, nameB) >= 0.9;
}

function score(lead: LeadCandidate) {
  return [
    lead.website, lead.email, lead.phone, lead.address, lead.city,
    lead.decisionMakerName, lead.linkedinUrl, lead.rating, lead.reviewCount,
    lead.roomsOrSeats,
  ].filter(value => value !== undefined && value !== null && String(value).trim() !== "").length;
}

function merge(existing: LeadCandidate, incoming: LeadCandidate): LeadCandidate {
  const preferred = score(incoming) > score(existing) ? incoming : existing;
  const providers = [...new Set([
    ...(existing.providers ?? (existing.provider ? [existing.provider] : [])),
    ...(incoming.providers ?? (incoming.provider ? [incoming.provider] : [])),
  ])].filter(Boolean);
  const sourceUrls = [...new Set([
    ...(existing.sourceUrls ?? (existing.sourceUrl ? [existing.sourceUrl] : [])),
    ...(incoming.sourceUrls ?? (incoming.sourceUrl ? [incoming.sourceUrl] : [])),
  ])].filter(Boolean);

  return {
    ...preferred,
    name: existing.name || incoming.name,
    category: existing.category ?? incoming.category,
    address: existing.address ?? incoming.address,
    city: existing.city ?? incoming.city,
    province: existing.province ?? incoming.province,
    region: existing.region ?? incoming.region,
    cap: existing.cap ?? incoming.cap,
    website: existing.website ?? incoming.website,
    phone: existing.phone ?? incoming.phone,
    email: existing.email ?? incoming.email,
    decisionMakerName: existing.decisionMakerName ?? incoming.decisionMakerName,
    decisionMakerRole: existing.decisionMakerRole ?? incoming.decisionMakerRole,
    linkedinUrl: existing.linkedinUrl ?? incoming.linkedinUrl,
    roomsOrSeats: existing.roomsOrSeats ?? incoming.roomsOrSeats,
    rating: existing.rating ?? incoming.rating,
    reviewCount: existing.reviewCount ?? incoming.reviewCount,
    sourceUrl: sourceUrls[0] ?? existing.sourceUrl ?? incoming.sourceUrl,
    sourceUrls,
    providers,
    provider: providers.join(",") || existing.provider || incoming.provider,
  };
}

export function dedupeLeads(leads: LeadCandidate[]) {
  const result: LeadCandidate[] = [];
  for (const lead of leads) {
    if (!lead.name?.trim()) continue;
    const index = result.findIndex(existing => sameIdentity(existing, lead));
    if (index === -1) result.push({
      ...lead,
      providers: lead.providers ?? (lead.provider ? [lead.provider] : []),
      sourceUrls: lead.sourceUrls ?? (lead.sourceUrl ? [lead.sourceUrl] : []),
    });
    else result[index] = merge(result[index], lead);
  }
  return result;
}
