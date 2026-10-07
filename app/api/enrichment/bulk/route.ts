import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";
import {enrichmentQueue} from "../../../../lib/queue";

export async function POST(req:Request){
  const body=await req.json().catch(()=>({}));
  const ids=Array.isArray(body.companyIds)?body.companyIds.filter((x:any)=>typeof x==="string"): [];
  if(!ids.length)return NextResponse.json({error:"Nessun lead selezionato"},{status:400});
  if(ids.length>200)return NextResponse.json({error:"Massimo 200 lead per operazione"},{status:400});
  const companies=await db.company.findMany({where:{id:{in:ids},deletedAt:null,website:{not:null}},select:{id:true}});
  let queued=0,skipped=0;
  for(const c of companies){
    const active=await db.enrichmentJob.findFirst({where:{companyId:c.id,status:{in:["QUEUED","RUNNING"]}},select:{id:true}});
    if(active){skipped++;continue}
    const job=await db.enrichmentJob.create({data:{companyId:c.id}});
    await enrichmentQueue.add("enrich",{enrichmentJobId:job.id},{priority:5});
    queued++;
  }
  skipped+=ids.length-companies.length;
  return NextResponse.json({queued,skipped,total:ids.length},{status:202});
}
