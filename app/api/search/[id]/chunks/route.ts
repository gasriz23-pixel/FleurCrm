import {NextResponse} from "next/server";
import {requireArea} from "../../../../../lib/permissions";
import {db} from "../../../../../lib/db";

export async function GET(_: Request, {params}: {params: {id: string}}) {
  try {
    await requireArea("SEARCH");
  } catch (e) {
    return NextResponse.json(
      {error: e instanceof Error ? e.message : "FORBIDDEN"},
      {status: 403},
    );
  }

  const chunks = await db.searchJobChunk.findMany({
    where: {searchJobId: params.id},
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

  const stats = chunks.reduce(
    (acc, chunk) => {
      acc.total += 1;
      acc[chunk.status.toLowerCase() as "queued" | "running" | "completed" | "failed" | "cancelled"] += 1;
      acc.leadsFound += chunk.found;
      return acc;
    },
    {total: 0, queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0, leadsFound: 0},
  );

  return NextResponse.json({stats, chunks});
}
