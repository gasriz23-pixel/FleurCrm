import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";
import {createSession} from "../../../../lib/auth";
import crypto from "node:crypto";

function hash(password:string){return crypto.scryptSync(password,process.env.AUTH_SECRET??"change-me",64).toString("hex")}

export async function POST(req:Request){
 const body=await req.json().catch(()=>({})); const email=String(body.email??"").trim().toLowerCase(); const password=String(body.password??"");
 if(!email||password.length<8)return NextResponse.json({error:"Email e password non valide"},{status:400});
 const user=await db.user.findUnique({where:{email}});
 if(!user?.passwordHash||user.passwordHash!==hash(password))return NextResponse.json({error:"Credenziali non valide"},{status:401});
 await createSession(user.id); return NextResponse.json({ok:true});
}
