import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { enrichWebsite } from "../../../../../lib/enrichment/site";

export async function POST(_: Request, { params }: { params:{id:string} }) {
  const company=await db.company.findFirst({where:{id:params.id,deletedAt:null}});
  if(!company?.website) return NextResponse.json({error:"Il lead non ha un sito web"}, {status:400});
  try {
    const result=await enrichWebsite(company.website);
    const updated=await db.$transaction(async tx=>{
      const lead=await tx.company.update({where:{id:company.id},data:{
        email:company.email??result.email, phone:company.phone??result.phone,
        linkedinUrl:company.linkedinUrl??result.linkedinUrl,
        decisionMakerName:company.decisionMakerName??result.decisionMakerName,
        decisionMakerRole:company.decisionMakerRole??result.decisionMakerRole,
        confidence:Math.max(company.confidence,result.confidence),lastVerifiedAt:new Date()
      }});
      for(const url of result.sourceUrls) await tx.leadSource.create({data:{companyId:company.id,provider:"website-enrichment",url,verifiedAt:new Date(),rawConfidence:result.confidence}});
      await tx.auditLog.create({data:{entityType:"Company",entityId:company.id,action:"ENRICHED",payload:result}});
      return lead;
    });
    return NextResponse.json({company:updated,result});
  } catch(e) {
    return NextResponse.json({error:e instanceof Error?e.message:"Enrichment failed"},{status:500});
  }
}
