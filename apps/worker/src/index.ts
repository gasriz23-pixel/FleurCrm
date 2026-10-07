import {Worker} from "bullmq";
import IORedis from "ioredis";
import {db} from "../../../lib/db";
import {providerRegistry} from "../../../lib/search/registry";
import {dedupeLeads} from "../../../lib/search/dedupe";
const connection=new IORedis(process.env.REDIS_URL??"redis://localhost:6379",{maxRetriesPerRequest:null});
new Worker("lead-search",async job=>{
 const s=await db.searchJob.findUnique({where:{id:job.data.searchJobId}});if(!s)return;
 try{
  await db.searchJob.update({where:{id:s.id},data:{status:"RUNNING",startedAt:new Date(),progress:10}});
  const candidates=await providerRegistry.searchAll({query:s.query,city:s.city??undefined,radiusKm:s.radiusKm??undefined});
  const leads=dedupeLeads(candidates);
  for(const l of leads){if(!l.name)continue;const existing=l.website?await db.company.findFirst({where:{website:l.website}}):null;if(!existing)await db.company.create({data:{name:l.name,category:l.category,address:l.address,city:l.city,website:l.website,phone:l.phone,sourceUrl:l.sourceUrl,lastVerifiedAt:new Date(),confidence:l.email&&l.phone?0.8:0.5}});}
  await db.searchJob.update({where:{id:s.id},data:{status:"COMPLETED",progress:100,totalFound:leads.length,completedAt:new Date()}});
 }catch(e){await db.searchJob.update({where:{id:s.id},data:{status:"FAILED",error:e instanceof Error?e.message:"Unknown error",completedAt:new Date()}});throw e;}
},{connection,concurrency:3});
console.log("FleurCrm worker online");
