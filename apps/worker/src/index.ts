import {Worker} from "bullmq";
import IORedis from "ioredis";
import {db} from "../../../lib/db";
import {providerRegistry} from "../../../lib/search/registry";
import {dedupeLeads, normalizeWebsite} from "../../../lib/search/dedupe";
import {enrichWebsite} from "../../../lib/enrichment/site";
import {loadItalianMunicipalities} from "../../../lib/search/istat-municipalities";

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

async function persistSearchLeads(leads: Awaited<ReturnType<typeof providerRegistry.searchAll>>){
  const unique=dedupeLeads(leads);
  for(const lead of unique){
    if(!lead.name?.trim())continue;
    const key=identityKey(lead);
    const website=normalizeWebsite(lead.website);
    const existing=await db.company.findFirst({where:{OR:[{identityKey:key},...(website?[{normalizedWebsite:website}]:[])]}});
    const confidence=confidenceFor(lead);
    const sources=sourceEntries(lead);
    if(existing){
      await db.company.update({where:{id:existing.id},data:{
        website:existing.website??lead.website,normalizedWebsite:existing.normalizedWebsite??(website||null),
        phone:existing.phone??lead.phone,email:existing.email??lead.email,address:existing.address??lead.address,
        city:existing.city??lead.city,province:existing.province??lead.province,region:existing.region??lead.region,
        cap:existing.cap??lead.cap,category:existing.category??lead.category,rating:existing.rating??lead.rating,
        reviewCount:existing.reviewCount??lead.reviewCount,roomsOrSeats:existing.roomsOrSeats??lead.roomsOrSeats,
        decisionMakerName:existing.decisionMakerName??lead.decisionMakerName,
        decisionMakerRole:existing.decisionMakerRole??lead.decisionMakerRole,
        linkedinUrl:existing.linkedinUrl??lead.linkedinUrl,lastVerifiedAt:new Date(),
        confidence:Math.max(existing.confidence,confidence),deletedAt:null
      }});
      if(sources.length){
        await db.leadSource.createMany({
          data:sources.map(source=>({companyId:existing.id,provider:source.provider,url:source.url,verifiedAt:new Date(),rawConfidence:confidence})),
          skipDuplicates:true
        });
      }
      continue;
    }
    let created;
    try{
      created=await db.company.create({data:{
        name:lead.name.trim(),normalizedName:normalize(lead.name),identityKey:key,category:lead.category,
        address:lead.address,city:lead.city,province:lead.province,region:lead.region,cap:lead.cap,
        website:lead.website,normalizedWebsite:website||null,phone:lead.phone,email:lead.email,
        rating:lead.rating,reviewCount:lead.reviewCount,roomsOrSeats:lead.roomsOrSeats,
        decisionMakerName:lead.decisionMakerName,decisionMakerRole:lead.decisionMakerRole,
        linkedinUrl:lead.linkedinUrl,sourceUrl:lead.sourceUrl,lastVerifiedAt:new Date(),confidence
      }});
      if(sources.length){
        await db.leadSource.createMany({
          data:sources.map(source=>({companyId:created.id,provider:source.provider,url:source.url,verifiedAt:new Date(),rawConfidence:confidence})),
          skipDuplicates:true
        });
      }
    }catch(error){
      if((error as {code?:string})?.code!=="P2002")throw error;
      const raced=await db.company.findUnique({where:{identityKey:key}});
      if(!raced)throw error;
      created=await db.company.update({where:{id:raced.id},data:{
        website:raced.website??lead.website,normalizedWebsite:raced.normalizedWebsite??(website||null),
        phone:raced.phone??lead.phone,email:raced.email??lead.email,address:raced.address??lead.address,
        city:raced.city??lead.city,province:raced.province??lead.province,region:raced.region??lead.region,
        cap:raced.cap??lead.cap,category:raced.category??lead.category,rating:raced.rating??lead.rating,
        reviewCount:raced.reviewCount??lead.reviewCount,roomsOrSeats:raced.roomsOrSeats??lead.roomsOrSeats,
        decisionMakerName:raced.decisionMakerName??lead.decisionMakerName,
        decisionMakerRole:raced.decisionMakerRole??lead.decisionMakerRole,
        linkedinUrl:raced.linkedinUrl??lead.linkedinUrl,lastVerifiedAt:new Date(),
        confidence:Math.max(raced.confidence,confidence),deletedAt:null
      }});
      if(sources.length){
        await db.leadSource.createMany({
          data:sources.map(source=>({companyId:raced.id,provider:source.provider,url:source.url,verifiedAt:new Date(),rawConfidence:confidence})),
          skipDuplicates:true
        });
      }
    }
  }
  return unique.length;
}

new Worker("lead-search",async(job)=>{
  const s=await db.searchJob.findUnique({where:{id:job.data.searchJobId}});
  if(!s)return;
  try{
    const f=(s.filters&&typeof s.filters==="object"?s.filters:{}) as Record<string,unknown>;
    const cities=Array.isArray(f.cities)?f.cities.map(String).map(x=>x.trim()).filter(Boolean):[];
    const regions=Array.isArray(f.regions)?f.regions.map(String).map(x=>x.trim()).filter(Boolean):[];
    const allItaly=Boolean(f.allItaly)||regions.length>=20;
    const municipalityScopes=allItaly?await loadItalianMunicipalities():[];
    const locationScopes=allItaly
      ? municipalityScopes.map(scope=>({name:scope.name,kind:"city" as const,province:scope.province,region:scope.region,cap:scope.cap}))
      : cities.map(name=>({name,kind:"city" as const})).concat(regions.map(name=>({name,kind:"region" as const})));
    const scopes=locationScopes.length
      ? locationScopes
      : [{name:s.city??s.province??s.region??s.cap??"default",kind:"fallback" as const,province:s.province??undefined,region:s.region??undefined,cap:s.cap??undefined}];
    const existing=await db.searchJobChunk.findMany({where:{searchJobId:s.id},orderBy:{sequence:"asc"}});
    if(!existing.length && scopes.length){
      await db.searchJobChunk.createMany({
        data:scopes.map((scope,sequence)=>({searchJobId:s.id,sequence,location:scope.name})),
        skipDuplicates:true
      });
    }
    await db.searchJob.update({where:{id:s.id},data:{status:"RUNNING",startedAt:s.startedAt??new Date(),progress:1,error:null}});
    const chunks=await db.searchJobChunk.findMany({where:{searchJobId:s.id},orderBy:{sequence:"asc"}});
    const concurrency=Math.max(1,Math.min(8,Number(f.searchConcurrency??4)));
    let cursor=0;
    const processChunk=async()=>{ while(cursor<chunks.length){ const index=cursor++; const chunk=chunks[index];
      if(chunk.status==="COMPLETED")continue;
      const scope=scopes[chunk.sequence];
      if(!scope)continue;
      const location=scope.name;
      const isCityScope=scope.kind==="city"||(scope.kind==="fallback"&&Boolean(s.city));
      const isRegionScope=scope.kind==="region"||(scope.kind==="fallback"&&!s.city&&Boolean(s.region));
      await db.searchJobChunk.update({where:{id:chunk.id},data:{status:"RUNNING",progress:5,attempts:{increment:1},startedAt:new Date(),error:null,completedAt:null}});
      try{
        const candidates=await providerRegistry.searchAll({
          query:s.query,
          city:isCityScope?location:undefined,
          province:isCityScope?(scope.province??s.province??undefined):s.province??undefined,
          region:isRegionScope?location:(isCityScope?(scope.region??s.region??undefined):s.region??undefined),
          cap:isCityScope?(scope.cap??s.cap??undefined):s.cap??undefined,
          radiusKm:s.radiusKm??undefined,
          categories:Array.isArray(s.categories)?s.categories.map(String):[],
          filters:{...f,cities:[],regions:[],providerConcurrency:f.providerConcurrency??3}
        });
        const minRating=Number(f.minRating??0), minCapacity=Number(f.minCapacity??0);
        const filtered=candidates.filter(x=>(!minRating||(x.rating!=null&&x.rating>=minRating))&&(!minCapacity||x.roomsOrSeats==null||x.roomsOrSeats>=minCapacity));
        const found=await persistSearchLeads(filtered);
        await db.searchJobChunk.update({where:{id:chunk.id},data:{status:"COMPLETED",progress:100,found,completedAt:new Date(),error:null}});
        const stats=await db.searchJobChunk.groupBy({
          by:["status"],
          where:{searchJobId:s.id},
          _count:{_all:true},
          _sum:{found:true},
        });
        const completed=stats.find(x=>x.status==="COMPLETED");
        const done=completed?._count._all??0;
        const totalFound=stats.reduce((sum,row)=>sum+(row._sum.found??0),0);
        await db.searchJob.update({where:{id:s.id},data:{progress:Math.min(99,Math.round(done/scopes.length*100)),totalFound}});
      }catch(error){
        await db.searchJobChunk.update({where:{id:chunk.id},data:{status:"FAILED",error:error instanceof Error?error.message:"Unknown error",completedAt:new Date()}});
        throw error;
      }
    }};
    const results=await Promise.allSettled(
      Array.from({length:Math.min(concurrency,chunks.length)},()=>processChunk())
    );
    const failures=results
      .filter((result):result is PromiseRejectedResult=>result.status==="rejected")
      .map(result=>result.reason);
    const failedChunks=await db.searchJobChunk.count({where:{searchJobId:s.id,status:"FAILED"}});
    if(failedChunks>0||failures.length>0){
      const message=failures[0] instanceof Error
        ? failures[0].message
        : `${failedChunks} chunk di ricerca non completati`;
      await db.searchJob.update({
        where:{id:s.id},
        data:{status:"FAILED",error:message,completedAt:new Date()},
      });
      throw failures[0] instanceof Error?failures[0]:new Error(message);
    }
    const sum=await db.searchJobChunk.aggregate({where:{searchJobId:s.id,status:"COMPLETED"},_sum:{found:true}});
    await db.searchJob.update({
      where:{id:s.id},
      data:{status:"COMPLETED",progress:100,totalFound:sum._sum.found??0,completedAt:new Date(),error:null},
    });
  }catch(e){
    const current=await db.searchJob.findUnique({where:{id:s.id},select:{status:true}});
    if(current?.status!=="FAILED"){
      await db.searchJob.update({where:{id:s.id},data:{status:"FAILED",error:e instanceof Error?e.message:"Unknown error",completedAt:new Date()}});
    }
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
      for(const contact of result.contacts){
        if(!contact.name&&!contact.email&&!contact.phone)continue;
        const existingContact=await tx.contact.findFirst({where:{companyId:j.companyId,OR:[...(contact.email?[{email:contact.email}]:[]),...(contact.name?[{name:contact.name}]:[])]}});
        if(existingContact){
          await tx.contact.update({where:{id:existingContact.id},data:{name:existingContact.name??contact.name,role:existingContact.role??contact.role,email:existingContact.email??contact.email,phone:existingContact.phone??contact.phone,linkedinUrl:existingContact.linkedinUrl??contact.linkedinUrl}});
        }else{
          await tx.contact.create({data:{companyId:j.companyId,name:contact.name,role:contact.role,email:contact.email,phone:contact.phone,linkedinUrl:contact.linkedinUrl}});
        }
      }
      if(result.sourceUrls.length){
        await tx.leadSource.createMany({
          data:result.sourceUrls.map(url=>({
            companyId:j.companyId,provider:"website-enrichment",url,verifiedAt:new Date(),rawConfidence:result.confidence
          })),
          skipDuplicates:true
        });
      }
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
