import {NextResponse} from "next/server";
import {db} from "../../../../../../lib/db";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const r=await db.campaignRecipient.findUnique({where:{id:(await params).id},select:{id:true,status:true}});
  if(r)await db.campaignRecipient.update({where:{id:r.id},data:{status:r.status==="CLICKED"?"CLICKED":"OPENED",openedAt:new Date()}});
  const pixel=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/0mVj5QAAAABJRU5ErkJggg==","base64");
  return new NextResponse(pixel,{headers:{"content-type":"image/png","cache-control":"no-store, no-cache, must-revalidate"}});
}
