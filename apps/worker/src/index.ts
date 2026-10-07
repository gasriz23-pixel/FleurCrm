import { Worker } from "bullmq";
import IORedis from "ioredis";
import { db } from "../../../lib/db";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });

new Worker("lead-search", async job => {
  const search = await db.searchJob.findUnique({ where:{id:job.data.searchJobId} });
  if (!search) return;
  await db.searchJob.update({where:{id:search.id},data:{status:"RUNNING",startedAt:new Date(),progress:5}});
  // Provider adapters will be added in the next implementation step.
  await db.searchJob.update({where:{id:search.id},data:{status:"COMPLETED",progress:100,completedAt:new Date()}});
}, {connection, concurrency:3});

console.log("FleurCrm worker online");
