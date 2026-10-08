import {NextResponse} from "next/server";
import {requireArea} from "../../../../../lib/permissions";
import {db} from "../../../../../lib/db";

const emptyStats = {
  total: 0,
  queued: 0,
  running: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
  leadsFound: 0,
};

export async function GET(_: Request, {params}: {params: {id: string}}) {
  try {
    await requireArea("SEARCH");
  } catch (e) {
    return NextResponse.json(
      {error: e instanceof Error ? e.message : "FORBIDDEN"},
      {status: 403},
    );
  }

  const grouped = await db.searchJobChunk.groupBy({
    by: ["status"],
    where: {searchJobId: params.id},
    _count: {_all: true},
    _sum: {found: true},
  });

  const stats = grouped.reduce(
    (acc, group) => {
      const status = group.status.toLowerCase() as
        | "queued"
        | "running"
        | "completed"
        | "failed"
        | "cancelled";
      acc.total += group._count._all;
      acc[status] += group._count._all;
      acc.leadsFound += group._sum.found ?? 0;
      return acc;
    },
    {...emptyStats},
  );

  const chunks = await db.searchJobChunk.findMany({
    where: {
      searchJobId: params.id,
      status: {in: ["RUNNING", "FAILED"]},
    },
    orderBy: {sequence: "asc"},
    select: {
      id: true,
      sequence: true,
      location: true,
      status: true,
      progress: true,
      found: true,
      error: true,
      attempts: true,
      startedAt: true,
      completedAt: true,
    },
  });

  return NextResponse.json(
    {stats, chunks},
    {headers: {"Cache-Control": "no-store"}},
  );
}
