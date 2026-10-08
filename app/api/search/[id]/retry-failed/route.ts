import {NextResponse} from "next/server";
import {requireArea} from "../../../../../lib/permissions";
import {db} from "../../../../../lib/db";
import {leadSearchQueue} from "../../../../../lib/queue";

export async function POST(_: Request, {params}: {params: Promise<{id: string}>}) {
  try { await requireArea("SEARCH"); } catch (e) {
    return NextResponse.json({error: e instanceof Error ? e.message : "FORBIDDEN"},{status:403});
  }
  const {id}=await params;
  const job=await db.searchJob.findUnique({where:{id}});
  if(!job)return NextResponse.json({error:"not found"},{status:404});
  if(job.status==="RUNNING")return NextResponse.json({error:"La ricerca è ancora in esecuzione"},{status:409});
  const failed=await db.searchJobChunk.findMany({where:{searchJobId:id,status:"FAILED"},select:{id:true}});
  if(!failed.length)return NextResponse.json({error:"Nessun chunk fallito da riprovare"},{status:400});
  await db.searchJobChunk.updateMany({where:{searchJobId:id,status:"FAILED"},data:{status:"QUEUED",progress:0,error:null,startedAt:null,completedAt:null}});
  await db.searchJob.update({where:{id},data:{status:"QUEUED",error:null,completedAt:null}});
  await leadSearchQueue.add("retry-failed-search",{searchJobId:id},{deduplication:{id:`search-${id}`}});
  return NextResponse.json({jobId:id,retried:failed.length});
}
