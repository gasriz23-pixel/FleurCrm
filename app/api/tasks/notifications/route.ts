import {NextResponse} from "next/server";
import {db} from "../../../../lib/db";
import {requireArea} from "../../../../lib/permissions";

export async function GET(){
  let user;
  try{user=await requireArea("TASKS")}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"FORBIDDEN"},{status:403})}
  const now=new Date();
  const [overdue,dueSoon]=await Promise.all([
    db.task.count({where:{status:{in:["TODO","IN_PROGRESS"]},dueAt:{lt:now},...(user.role==="BACKOFFICE"?{assigneeId:user.id}:{})}}),
    db.task.count({where:{status:{in:["TODO","IN_PROGRESS"]},dueAt:{gte:now,lte:new Date(now.getTime()+48*60*60*1000)},...(user.role==="BACKOFFICE"?{assigneeId:user.id}:{})}}),
  ]);
  return NextResponse.json({overdue,dueSoon,generatedAt:now.toISOString()},{headers:{"Cache-Control":"no-store"}});
}
