import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { requireArea } from "../../../lib/permissions";

export async function GET(req: Request) {
  try { await requireArea("CRM"); } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "FORBIDDEN" }, { status: 403 });
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const category = url.searchParams.get("category") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const city = url.searchParams.get("city")?.trim() || undefined;
  const missing = url.searchParams.get("missing") || undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || 25)));
  const where = {
    deletedAt: null,
    ...(category ? { category } : {}),
    ...(status ? { status: status as never } : {}),
    ...(city ? { city: { contains: city, mode: "insensitive" as const } } : {}),
    ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { email: { contains: q, mode: "insensitive" as const } },
      { phone: { contains: q, mode: "insensitive" as const } },
      { website: { contains: q, mode: "insensitive" as const } },
    ] } : {}),
    ...(missing === "email" ? { email: null } : {}),
    ...(missing === "phone" ? { phone: null } : {}),
    ...(missing === "website" ? { website: null } : {}),
    ...(missing === "decisionMaker" ? { decisionMakerName: null } : {}),
  };
  const [items, total] = await db.$transaction([
    db.company.findMany({
      where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      select: { id:true,name:true,category:true,address:true,city:true,province:true,website:true,email:true,phone:true,status:true,rating:true,reviewCount:true,decisionMakerName:true,decisionMakerRole:true,confidence:true,lastVerifiedAt:true,createdAt:true,updatedAt:true },
    }),
    db.company.count({ where }),
  ]);
  return NextResponse.json({ items, total, page, pageSize, pages: Math.ceil(total / pageSize) });
}
