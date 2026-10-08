import {NextResponse} from "next/server";
import {db} from "../../../../../lib/db";
import {emailQueue} from "../../../../../lib/queue";
import {requireArea} from "../../../../../lib/permissions";

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
  let user;
  try{user=await requireArea("MARKETING")}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"FORBIDDEN"},{status:403})}
  const {id}=await params;
  const body=await req.json().catch(()=>null);
  const action=body?.action;
  if(action!=="pause"&&action!=="resume")return NextResponse.json({error:"INVALID_ACTION"},{status:400});
  const campaign=await db.campaign.findUnique({where:{id}});
  if(!campaign)return NextResponse.json({error:"CAMPAIGN_NOT_FOUND"},{status:404});
  if(action==="pause"){
    if(campaign.status==="SENT")return NextResponse.json({error:"CAMPAIGN_ALREADY_SENT"},{status:409});
    const updated=await db.campaign.update({where:{id},data:{status:"PAUSED"}});
    await db.auditLog.create({data:{userId:user.id,entityType:"Campaign",entityId:id,action:"PAUSED"}});
    return NextResponse.json(updated);
  }
  if(campaign.status!=="PAUSED")return NextResponse.json({error:"CAMPAIGN_NOT_PAUSED"},{status:409});
  const updated=await db.campaign.update({where:{id},data:{status:"SENDING"}});
  const recipients=await db.campaignRecipient.findMany({where:{campaignId:id,status:"QUEUED"},select:{id:true}});
  await Promise.all(recipients.map(r=>emailQueue.add("send",{recipientId:r.id},{jobId:r.id,removeOnComplete:100,removeOnFail:100})));
  await db.auditLog.create({data:{userId:user.id,entityType:"Campaign",entityId:id,action:"RESUMED",payload:{queued:recipients.length}}});
  return NextResponse.json({...updated,queued:recipients.length});
}
