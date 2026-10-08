import {NextResponse} from "next/server";
import IORedis from "ioredis";
import {db} from "../../../lib/db";

export const dynamic="force-dynamic";

export async function GET(){
  const started=Date.now();
  let database="ok";
  let redis="ok";
  try{await db.$queryRaw`SELECT 1`;}catch{database="error";}
  const connection=new IORedis(process.env.REDIS_URL??"redis://localhost:6379",{maxRetriesPerRequest:1,connectTimeout:1500});
  try{await connection.ping();}catch{redis="error";}finally{await connection.quit().catch(()=>connection.disconnect());}
  const healthy=database==="ok"&&redis==="ok";
  return NextResponse.json({status:healthy?"ok":"degraded",database,redis,latencyMs:Date.now()-started,timestamp:new Date().toISOString()},{status:healthy?200:503,headers:{"Cache-Control":"no-store"}});
}
