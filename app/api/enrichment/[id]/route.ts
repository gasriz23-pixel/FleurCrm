import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export async function GET(_:Request,{params}:{params:{id:string}}){
  const job=await db.enrichmentJob.findUnique({where:{id:params.id},include:{company:{select:{id:true,name:true}}}});
  if(!job) return NextResponse.json({error:"Job non trovato"},{status:404});
  return NextResponse.json(job);
}
