import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";
import {verifyUnsubscribeToken} from "../../../../lib/marketing/tokens";

export async function GET(req:Request){
  const token=new URL(req.url).searchParams.get("token")||"";
  const email=verifyUnsubscribeToken(token);
  if(!email||!email.includes("@"))return new NextResponse("Link di disiscrizione non valido o scaduto",{status:400});
  await db.emailUnsubscribe.upsert({where:{email},create:{email},update:{}});
  await db.campaignRecipient.updateMany({where:{email},data:{status:"UNSUBSCRIBED"}});
  return new NextResponse("<!doctype html><html><body><h1>Disiscrizione completata</h1><p>Non riceverai ulteriori comunicazioni.</p></body></html>",{headers:{"content-type":"text/html; charset=utf-8"}});
}
