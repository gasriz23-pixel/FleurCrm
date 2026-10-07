import {Worker} from "bullmq";
import IORedis from "ioredis";
import {db} from "../../../lib/db";
import {providerRegistry} from "../../../lib/search/registry";
import {dedupeLeads, normalizeWebsite} from "../../../lib/search/dedupe";
import {enrichWebsite} from "../../../lib/enrichment/site";

const connection=new IORedis(process.env.REDIS_URL??"redis://localhost:6379",{maxRetriesPerRequest:null});

function normalize(value?:string|null){
  return(value??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/\s+/g," ");
}
function identityKey(lead:{name:string;address?:string;city?:string;website?:string}){
  const website=normalizeWebsite(lead.website);
  return website
    ?"web:"+website
    :"name:"+normalize(lead.name)+"|address:"+normalize(lead.address)+"|city:"+normalize(lead.city);
}
function confidenceFor(lead:{email?:string;phone?:string;website?:string}){
  let score=0.4;
  if(lead.website)score+=0.15;
  if(lead.phone)score+=0.2;
  if(lead.email)score+=0.25;
  return Math.min(1,score);
}
function sourceEntries(lead:{sourceUrls?:string[];sourceUrl?:string;providers?:string[];provider?:string}){
  const urls=[...(lead.sourceUrls??[]),...(lead.sourceUrl?[lead.sourceUrl]:[])].filter(Boolean);
  const providers=[...(lead.providers??[]),...(lead.provider?[lead.provider]:[])].filter(Boolean);
  return [...new Set(urls)].map((url,index)=>({
    url,
    provider:providers[index]??providers[0]??"unknown"
  }));
}

new Worker("lead-search",async(job)=>{
  const s=await db.searchJob.findUnique({where:{id:job.data.searchJobId}});
  if(!s)return;
  try{
    await db.searchJob.update({where:{id:s.id},data:{status:"RUNNING",startedAt:new Date(),progress:5,error:null}});
    const candidates=await providerRegistry.searchAll({
      query:s.query,city:s.city??undefined,province:s.province??undefined,region:s.region??undefined,
      cap:s.cap??undefined,radiusKm:s.radiusKm??undefined,
      categories:Array.isArray(s.categories)?s.categories.map(String):[],filters:s.filters??{}
    });
    await db.searchJob.update({where:{id:s.id},data:{progress:55,totalFound:candidates.length}});
    const minRating=Number((s.filters as any)?.minRating ?? 0);
    const minCapacity=Number((s.filters as any)?.minCapacity ?? 0);
    const filteredCandidates=candidates.filter(lead =>
      (!minRating || (lead.rating != null && lead.rating >= minRating)) &&
      (!minCapacity || lead.roomsOrSeats == null || lead.roomsOrSeats >= minCapacity)
    );
    const leads=dedupeLeads(filteredCandidates);
    await db.searchJob.update({where:{id:s.id},data:{progress:70,totalFound:leads.length}});
    let inserted=0;
    for(const lead of leads){
      if(!lead.name?.trim())continue;
      const key=identityKey(lead);
      const website=normalizeWebsite(lead.website);
      const existing=await db.company.findFirst({
        where:{
          OR:[
            {identityKey:key},
            ...(website?[{normalizedWebsite:website}]:[])
          ]
        }
      });
      const confidence=confidenceFor(lead);
      const sources=sourceEntries(lead);

      if(existing){
        await db.$transaction(async tx=>{
          const nextIdentityKey=existing.identityKey;
          await tx.company.update({where:{id:existing.id},data:{
            identityKey:nextIdentityKey,
            website:existing.website??lead.website,
            normalizedWebsite:existing.normalizedWebsite??(website||null),
            phone:existing.phone??lead.phone,
            email:existing.email??lead.email,
            address:existing.address??lead.address,
            city:existing.city??lead.city,
            province:existing.province??lead.province,
            region:existing.region??lead.region,
            cap:existing.cap??lead.cap,
            category:existing.category??lead.category,
            rating:existing.rating??lead.rating,
            reviewCount:existing.reviewCount??lead.reviewCount,
            roomsOrSeats:existing.roomsOrSeats??lead.roomsOrSeats,
            decisionMakerName:existing.decisionMakerName??lead.decisionMakerName,
            decisionMakerRole:existing.decisionMakerRole??lead.decisionMakerRole,
            linkedinUrl:existing.linkedinUrl??lead.linkedinUrl,
            lastVerifiedAt:new Date(),
            confidence:Math.max(existing.confidence,confidence),
            deletedAt:null
          }});
          for(const source of sources){
            await tx.leadSource.create({data:{
              companyId:existing.id,provider:source.provider,url:source.url,
              verifiedAt:new Date(),rawConfidence:confidence
            }});
          }
        });
        continue;
      }

      const created=await db.company.create({data:{
        name:lead.name.trim(),normalizedName:normalize(lead.name),identityKey:key,
        category:lead.category,address:lead.address,city:lead.city,province:lead.province,
        region:lead.region,cap:lead.cap,website:lead.website,
        normalizedWebsite:website||null,phone:lead.phone,email:lead.email,
        rating:lead.rating,reviewCount:lead.reviewCount,roomsOrSeats:lead.roomsOrSeats,
        decisionMakerName:lead.decisionMakerName,decisionMakerRole:lead.decisionMakerRole,
        linkedinUrl:lead.linkedinUrl,sourceUrl:lead.sourceUrl,
        lastVerifiedAt:new Date(),confidence
      }});
      for(const source of sources){
        await db.leadSource.create({data:{
          companyId:created.id,provider:source.provider,url:source.url,
          verifiedAt:new Date(),rawConfidence:confidence
        }});
      }
      inserted++;
    }
    await db.searchJob.update({where:{id:s.id},data:{status:"COMPLETED",progress:100,totalFound:leads.length,completedAt:new Date()}});
  }catch(e){
    await db.searchJob.update({where:{id:s.id},data:{status:"FAILED",error:e instanceof Error?e.message:"Unknown error",completedAt:new Date()}});
    throw e;
  }
},{connection,concurrency:3,limiter:{max:3,duration:1000}});

new Worker("lead-enrichment",async(job)=>{
  const j=await db.enrichmentJob.findUnique({where:{id:job.data.enrichmentJobId},include:{company:true}});
  if(!j)return;
  try{
    if(!j.company.website)throw new Error("Lead senza sito web");
    await db.enrichmentJob.update({where:{id:j.id},data:{status:"RUNNING",startedAt:new Date(),progress:5,error:null}});
    const result=await enrichWebsite(j.company.website);
    await db.$transaction(async tx=>{
      await tx.company.update({where:{id:j.companyId},data:{
        email:j.company.email??result.email,phone:j.company.phone??result.phone,
        linkedinUrl:j.company.linkedinUrl??result.linkedinUrl,
        decisionMakerName:j.company.decisionMakerName??result.decisionMakerName,
        decisionMakerRole:j.company.decisionMakerRole??result.decisionMakerRole,
        roomsOrSeats:j.company.roomsOrSeats??result.roomsOrSeats,confidence:Math.max(j.company.confidence,result.confidence),lastVerifiedAt:new Date()
      }});
      for(const contact of result.contacts){\n        if(!contact.name&&!contact.email&&!contact.phone)continue;\n        const existingContact=await tx.contact.findFirst({where:{companyId:j.companyId,OR:[...(contact.email?[{email:contact.email}]:[]),...(contact.name?[{name:contact.name}]:[])]}});\n        if(existingContact){\n          await tx.contact.update({where:{id:existingContact.id},data:{name:existingContact.name??contact.name,role:existingContact.role??contact.role,email:existingContact.email??contact.email,phone:existingContact.phone??contact.phone,linkedinUrl:existingContact.linkedinUrl??contact.linkedinUrl}});\n        }else{\n          await tx.contact.create({data:{companyId:j.companyId,name:contact.name,role:contact.role,email:contact.email,phone:contact.phone,linkedinUrl:contact.linkedinUrl}});\n        }\n      }\n      for(const url of result.sourceUrls)await tx.leadSource.create({data:{
        companyId:j.companyId,provider:"website-enrichment",url,verifiedAt:new Date(),rawConfidence:result.confidence
      }});
      await tx.auditLog.create({data:{entityType:"Company",entityId:j.companyId,action:"ENRICHED",payload:result}});
    });
    await db.enrichmentJob.update({where:{id:j.id},data:{
      status:"COMPLETED",progress:100,pagesVisited:result.sourceUrls.length,
      fieldsFound:[result.email,result.phone,result.linkedinUrl,result.decisionMakerName,result.roomsOrSeats,result.contacts.length>0].filter(Boolean).length,completedAt:new Date()
    }});
  }catch(e){
    await db.enrichmentJob.update({where:{id:j.id},data:{status:"FAILED",error:e instanceof Error?e.message:"Unknown error",completedAt:new Date()}});
    throw e;
  }
},{connection,concurrency:2,limiter:{max:2,duration:1000}});

console.log("FleurCrm worker online");
