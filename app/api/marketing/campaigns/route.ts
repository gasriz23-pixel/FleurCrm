import {NextResponse} from "next/server";
import {z} from "zod";
import {db} from "../../../../lib/db";
import {emailQueue} from "../../../../lib/queue";
import {requireArea} from "../../../../lib/permissions";

const schema=z.object({
  name:z.string().trim().min(1).max(200),
  subject:z.string().trim().min(1).max(300),
  htmlBody:z.string().min(1).max(500000),
  textBody:z.string().max(500000).optional(),
  companyIds:z.array(z.string().min(1)).max(10000).default([]),
  scheduledAt:z.string().datetime().optional(),
});

export async function GET(){
  try{await requireArea("MARKETING")}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"FORBIDDEN"},{status:403})}
  const campaigns=await db.campaign.findMany({
    orderBy:{createdAt:"desc"},
    take:100,
    include:{createdBy:{select:{id:true,name:true}},_count:{select:{recipients:true}}}
  });
  const stats=await db.campaignRecipient.groupBy({
    by:["campaignId","status"],
    where:{campaignId:{in:campaigns.map(campaign=>campaign.id)}},
    _count:{_all:true},
  });
  const withStats=campaigns.map(campaign=>{
    const rows=stats.filter(row=>row.campaignId===campaign.id);
    const counts=Object.fromEntries(rows.map(row=>[row.status,row._count._all]));
    return { ...campaign, stats:{
      queued:counts.QUEUED??0,sent:counts.SENT??0,opened:counts.OPENED??0,
      clicked:counts.CLICKED??0,bounced:counts.BOUNCED??0,failed:counts.FAILED??0,
      unsubscribed:counts.UNSUBSCRIBED??0,
    }};
  });
  return NextResponse.json(withStats);
}

export async function POST(req:Request){
  let user;
  try{user=await requireArea("MARKETING")}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"FORBIDDEN"},{status:403})}
  const parsed=schema.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"INVALID_CAMPAIGN",issues:parsed.error.issues},{status:400});
  const {name,subject,htmlBody,textBody,companyIds,scheduledAt}=parsed.data;
  const companies=await db.company.findMany({
    where:{id:{in:companyIds},deletedAt:null,email:{not:null}},
    select:{id:true,email:true}
  });
  const emails=companies.filter(x=>x.email).map(x=>x.email!.trim().toLowerCase());
  const blocked=new Set((await db.emailUnsubscribe.findMany({where:{email:{in:emails}},select:{email:true}})).map(x=>x.email));
  const eligible=companies.filter(x=>x.email&&!blocked.has(x.email.trim().toLowerCase()));
  if(!eligible.length)return NextResponse.json({error:"NO_ELIGIBLE_RECIPIENTS"},{status:400});
  const when=scheduledAt?new Date(scheduledAt):null;
  const campaign=await db.$transaction(async tx=>{
    const created=await tx.campaign.create({data:{name,subject,htmlBody,textBody:textBody||null,status:when&&when.getTime()>Date.now()?"SCHEDULED":"SENDING",scheduledAt:when,createdById:user.id}});
    if(eligible.length)await tx.campaignRecipient.createMany({data:eligible.map(c=>({campaignId:created.id,companyId:c.id,email:c.email!.trim().toLowerCase()}))});
    await tx.auditLog.create({data:{userId:user.id,entityType:"Campaign",entityId:created.id,action:"CREATED",payload:{recipientCount:eligible.length,blocked:companies.length-eligible.length}}});
    return created;
  });
  const recipients=await db.campaignRecipient.findMany({where:{campaignId:campaign.id},select:{id:true}});
  const delay=when?Math.max(0,when.getTime()-Date.now()):0;
  await Promise.all(recipients.map(r=>emailQueue.add("send",{recipientId:r.id},{delay})));
  return NextResponse.json({campaignId:campaign.id,queued:recipients.length,skipped:companies.length-eligible.length,status:campaign.status},{status:201});
}
