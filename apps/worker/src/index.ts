import { Worker } from "bullmq";
import IORedis from "ioredis";
import { db } from "../../../lib/db";
import { providerRegistry } from "../../../lib/search/registry";
import { dedupeLeads } from "../../../lib/search/dedupe";
import { enrichWebsite } from "../../../lib/enrichment/site";

const connection=new IORedis(process.env.REDIS_URL??"redis://localhost:6379",{maxRetriesPerRequest:null});

function normalize(value?:string|null){return (value??"").trim().toLowerCase().replace(/\s+/g," ");}
function normalizeWebsite(value?:string|null){if(!value)return "";try{const u=new URL(value.startsWith("http")?value:"https://"+value);return u.hostname.replace(/^www\./,"").toLowerCase()+u.pathname.replace(/\/$/,"").toLowerCase();}catch{return normalize(value).replace(/^https?:\/\//,"").replace(/^www\./,"").replace(/\/$/,"");}}
function identityKey(lead:{name:string;address?:string;city?:string;website?:string}){const website=normalizeWebsite(lead.website);return website?"web:"+website:"name:"+normalize(lead.name)+"|address:"+normalize(lead.address)+"|city:"+normalize(lead.city);}

new Worker("lead-search",async(job)=>{
  const s=await db.searchJob.findUnique({where:{id:job.data.searchJobId}}); if(!s)return;
  try{
    await db.searchJob.update({where:{id:s.id},data:{status:"RUNNING",startedAt:new Date(),progress:10,error:null}});
    const candidates=await providerRegistry.searchAll({query:s.query,city:s.city??undefined,province:s.province??undefined,region:s.region??undefined,cap:s.cap??undefined,radiusKm:s.radiusKm??undefined,categories:Array.isArray(s.categories)?s.categories.map(String):[],filters:s.filters??{}});
    const leads=dedupeLeads(candidates); let inserted=0;
    for(const lead of leads){if(!lead.name)continue;const key=identityKey(lead),website=normalizeWebsite(lead.website),existing=await db.company.findUnique({where:{identityKey:key}});
      if(existing){await db.company.update({where:{id:existing.id},data:{website:existing.website??lead.website,normalizedWebsite:existing.normalizedWebsite??(website||null),phone:existing.phone??lead.phone,email:existing.email??lead.email,address:existing.address??lead.address,city:existing.city??lead.city,province:existing.province??lead.province,region:existing.region??lead.region,cap:existing.cap??lead.cap,sourceUrl:existing.sourceUrl??lead.sourceUrl,lastVerifiedAt:new Date(),confidence:Math.max(existing.confidence,lead.email&&lead.phone?0.8:0.5),deletedAt:null}});continue;}
      await db.company.create({data:{name:lead.name,normalizedName:normalize(lead.name),identityKey:key,category:lead.category,address:lead.address,city:lead.city,province:lead.province,region:lead.region,cap:lead.cap,website:lead.website,normalizedWebsite:website||null,phone:lead.phone,email:lead.email,sourceUrl:lead.sourceUrl,lastVerifiedAt:new Date(),confidence:lead.email&&lead.phone?0.8:0.5}}); inserted++;
    }
    await db.searchJob.update({where:{id:s.id},data:{status:"COMPLETED",progress:100,totalFound:inserted,completedAt:new Date()}});
  }catch(e){await db.searchJob.update({where:{id:s.id},data:{status:"FAILED",error:e instanceof Error?e.message:"Unknown error",completedAt:new Date()}});throw e;}
},{connection,concurrency:3});

new Worker("lead-enrichment",async(job)=>{
  const j=await db.enrichmentJob.findUnique({where:{id:job.data.enrichmentJobId},include:{company:true}}); if(!j)return;
  try{
    if(!j.company.website) throw new Error("Lead senza sito web");
    await db.enrichmentJob.update({where:{id:j.id},data:{status:"RUNNING",startedAt:new Date(),progress:5,error:null}});
    const result=await enrichWebsite(j.company.website);
    await db.$transaction(async tx=>{
      await tx.company.update({where:{id:j.companyId},data:{
        email:j.company.email??result.email,phone:j.company.phone??result.phone,
        linkedinUrl:j.company.linkedinUrl??result.linkedinUrl,
        decisionMakerName:j.company.decisionMakerName??result.decisionMakerName,
        decisionMakerRole:j.company.decisionMakerRole??result.decisionMakerRole,
        confidence:Math.max(j.company.confidence,result.confidence),lastVerifiedAt:new Date()
      }});
      for(const url of result.sourceUrls) await tx.leadSource.create({data:{companyId:j.companyId,provider:"website-enrichment",url,verifiedAt:new Date(),rawConfidence:result.confidence}});
      await tx.auditLog.create({data:{entityType:"Company",entityId:j.companyId,action:"ENRICHED",payload:result}});
    });
    await db.enrichmentJob.update({where:{id:j.id},data:{status:"COMPLETED",progress:100,pagesVisited:result.sourceUrls.length,fieldsFound:[result.email,result.phone,result.linkedinUrl,result.decisionMakerName].filter(Boolean).length,completedAt:new Date()}});
  }catch(e){await db.enrichmentJob.update({where:{id:j.id},data:{status:"FAILED",error:e instanceof Error?e.message:"Unknown error",completedAt:new Date()}});throw e;}
},{connection,concurrency:2,limiter:{max:2,duration:1000}});

console.log("FleurCrm worker online");
