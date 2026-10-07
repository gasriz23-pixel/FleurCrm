import { cookies } from "next/headers";
import crypto from "node:crypto";
import { db } from "./db";

const COOKIE = "fleur_session";
const TTL_SECONDS = 60 * 60 * 24 * 7;

function sign(value:string){
  const secret=process.env.AUTH_SECRET;
  if(!secret) throw new Error("AUTH_SECRET non configurato");
  return crypto.createHmac("sha256",secret).update(value).digest("hex");
}

export async function createSession(userId:string){
  const value=`${userId}.${Date.now()+TTL_SECONDS*1000}`;
  const token=`${value}.${sign(value)}`;
  (await cookies()).set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:TTL_SECONDS});
}

export async function getSessionUser(){
  const token=(await cookies()).get(COOKIE)?.value;
  if(!token) return null;
  const [userId,expires,signature]=token.split(".");
  if(!userId||!expires||!signature||Number(expires)<Date.now()||signature!==sign(`${userId}.${expires}`)) return null;
  return db.user.findUnique({where:{id:userId},select:{id:true,name:true,email:true,role:true}});
}

export async function clearSession(){ (await cookies()).delete(COOKIE); }
