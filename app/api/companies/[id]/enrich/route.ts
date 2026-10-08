import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { enrichmentQueue } from "../../../../../lib/queue";
import { requireArea } from "../../../../../lib/permissions";

export async function POST(_: Request,{params}:{params:Promise<{id:string}>}){
  await requireArea("CRM");
  const {id}=await params;
  const job=await db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"fleurcrm:enrich:"+id}))`;
    const company=await tx.company.findFirst({where:{id,deletedAt:null}});
    if(!company?.website) return null;
    const active=await tx.enrichmentJob.findFirst({
      where:{companyId:company.id,status:{in:["QUEUED","RUNNING"]}},
      orderBy:{createdAt:"desc"}
    });
    if(active) return active;
    return tx.enrichmentJob.create({data:{companyId:company.id}});
  });
  if(!job) return NextResponse.json({error:"Il lead non ha un sito web"},{status:400});
  if(job.status==="QUEUED"){
    await enrichmentQueue.add("enrich",{enrichmentJobId:job.id},{jobId:job.id,removeOnComplete:100,removeOnFail:100});
  }
  return NextResponse.json(job,{status:202});
}
