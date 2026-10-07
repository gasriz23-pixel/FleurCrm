import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: null });
const defaults={removeOnComplete:100,removeOnFail:100,attempts:3,backoff:{type:"exponential",delay:3000}};

export const leadSearchQueue = new Queue("lead-search", { connection, defaultJobOptions: defaults });
export const enrichmentQueue = new Queue("lead-enrichment", { connection, defaultJobOptions: defaults });
