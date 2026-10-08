import {NextResponse} from "next/server";
import {Prisma} from "@prisma/client";
import {db} from "../../../../lib/db";
import {requireArea} from "../../../../lib/permissions";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{await requireArea("CRM")}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"FORBIDDEN"},{status:403})}
  const {id}=await params;
  const company=await db.company.findFirst({where:{id,deletedAt:null},include:{contacts:true,sources:{orderBy:{createdAt:"desc"}},tasks:{orderBy:{updatedAt:"desc"},include:{assignee:true}}}});
  if(!company)return NextResponse.json({error:"Lead non trovato"},{status:404});
  return NextResponse.json(company);
}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  let user;try{user=await requireArea("CRM")}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"FORBIDDEN"},{status:403})}
  const {id}=await params;const body=await req.json();
  const allowed=["name","category","address","city","province","region","cap","website","phone","email","status","rating","reviewCount","roomsOrSeats","decisionMakerName","decisionMakerRole","linkedinUrl"];
  const data=Object.fromEntries(Object.entries(body).filter(([key])=>allowed.includes(key)));
  const existing=await db.company.findFirst({where:{id,deletedAt:null}});if(!existing)return NextResponse.json({error:"Lead non trovato"},{status:404});
  const updated=await db.$transaction(async tx=>{const result=await tx.company.update({where:{id},data});await tx.auditLog.create({data:{userId:user.id,entityType:"Company",entityId:id,action:"UPDATED",payload:data as Prisma.InputJsonValue}});return result});return NextResponse.json(updated);
}
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){
  let user;try{user=await requireArea("CRM")}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"FORBIDDEN"},{status:403})}
  const {id}=await params;const existing=await db.company.findFirst({where:{id,deletedAt:null}});if(!existing)return NextResponse.json({error:"Lead non trovato"},{status:404});
  await db.$transaction([db.company.update({where:{id},data:{deletedAt:new Date()}}),db.auditLog.create({data:{userId:user.id,entityType:"Company",entityId:id,action:"SOFT_DELETED"}})]);
  return NextResponse.json({ok:true});
}
