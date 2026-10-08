import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";
import {requireArea} from "../../../../lib/permissions";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  await requireArea("CRM");
  const {id}=await params;
  const job=await db.enrichmentJob.findUnique({where:{id},include:{company:{select:{id:true,name:true}}}});
  if(!job)return NextResponse.json({error:"Job non trovato"},{status:404});
  return NextResponse.json(job,{headers:{"Cache-Control":"no-store"}});
}
