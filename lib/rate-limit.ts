import IORedis from "ioredis";

const redis = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export async function consumeRateLimit(key: string, limit: number, windowSeconds: number) {
  const bucket = `rate-limit:${key}`;
  const count = await redis.incr(bucket);
  if (count === 1) await redis.expire(bucket, windowSeconds);
  return {allowed: count <= limit, count};
}
