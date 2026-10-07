import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { enrichmentQueue } from "../../../../../lib/queue";

export async function POST(_: Request,{params}:{params:{id:string}}){
  const company=await db.company.findFirst({where:{id:params.id,deletedAt:null}});
  if(!company?.website) return NextResponse.json({error:"Il lead non ha un sito web"},{status:400});
  const active=await db.enrichmentJob.findFirst({where:{companyId:company.id,status:{in:["QUEUED","RUNNING"]}},orderBy:{createdAt:"desc"}});
  if(active) return NextResponse.json(active,{status:202});
  const job=await db.enrichmentJob.create({data:{companyId:company.id}});
  await enrichmentQueue.add("enrich",{enrichmentJobId:job.id});
  return NextResponse.json(job,{status:202});
}
