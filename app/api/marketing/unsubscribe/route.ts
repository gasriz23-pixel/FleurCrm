import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";

export async function GET(req:Request){
  const email=new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
  if(!email||!email.includes("@"))return new NextResponse("Email non valido",{status:400});
  await db.emailUnsubscribe.upsert({where:{email},create:{email},update:{}});
  await db.campaignRecipient.updateMany({where:{email},data:{status:"UNSUBSCRIBED"}});
  return new NextResponse("<!doctype html><html><body><h1>Disiscrizione completata</h1><p>Non riceverai ulteriori comunicazioni.</p></body></html>",{headers:{"content-type":"text/html; charset=utf-8"}});
}
