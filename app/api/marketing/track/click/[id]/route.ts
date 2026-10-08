import {NextResponse} from "next/server";
import {db} from "../../../../../../../lib/db";

export async function GET(req:Request,{params}:{params:{id:string}}){
  const url=new URL(req.url).searchParams.get("url");
  if(!url||!/^https?:\/\//i.test(url))return NextResponse.json({error:"INVALID_URL"},{status:400});
  await db.campaignRecipient.update({where:{id:params.id},data:{status:"CLICKED",clickedAt:new Date()}});
  return NextResponse.redirect(url);
}
