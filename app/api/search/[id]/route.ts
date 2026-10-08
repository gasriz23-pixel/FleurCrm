import {NextResponse} from "next/server";
import {requireArea} from "../../../../lib/permissions";
import {db} from "../../../../lib/db";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{await requireArea("SEARCH")}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"FORBIDDEN"},{status:403})}
  const {id}=await params;const job=await db.searchJob.findUnique({where:{id}});
  if(!job)return NextResponse.json({error:"not found"},{status:404});
  return NextResponse.json(job);
}