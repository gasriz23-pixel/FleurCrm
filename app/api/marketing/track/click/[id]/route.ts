import {NextResponse} from "next/server";
import {db} from "../../../../../../lib/db";
import {verifyRecipientToken} from "../../../../../../lib/marketing/tokens";

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  const id=verifyRecipientToken((await params).id);
  const url=new URL(req.url).searchParams.get("url");
  if(!id||!url||!/^https?:\/\//i.test(url))return NextResponse.json({error:"INVALID_TRACKING_LINK"},{status:400});
  await db.campaignRecipient.update({where:{id},data:{status:"CLICKED",clickedAt:new Date()}});
  return NextResponse.redirect(url);
}
