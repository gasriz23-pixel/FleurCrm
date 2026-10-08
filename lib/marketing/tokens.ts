import crypto from "node:crypto";

type TokenPayload={kind:"recipient"|"unsubscribe";value:string;exp:number};

function secret(){
  const value=process.env.MARKETING_TOKEN_SECRET||process.env.AUTH_SECRET;
  if(!value||value.length<32) throw new Error("MARKETING_TOKEN_SECRET_NOT_CONFIGURED");
  return value;
}

function encode(payload:TokenPayload){
  const body=Buffer.from(JSON.stringify(payload),"utf8").toString("base64url");
  const signature=crypto.createHmac("sha256",secret()).update(body).digest("base64url");
  return body+"."+signature;
}

function decode(token:string,kind:TokenPayload["kind"]){
  const [body,signature]=token.split(".");
  if(!body||!signature)return null;
  const expected=crypto.createHmac("sha256",secret()).update(body).digest("base64url");
  const a=Buffer.from(signature),b=Buffer.from(expected);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
  try{
    const payload=JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as TokenPayload;
    if(payload.kind!==kind||!payload.value||!Number.isFinite(payload.exp)||payload.exp<Date.now())return null;
    return payload;
  }catch{return null;}
}

export function createRecipientToken(id:string,ttlMs=1000*60*60*24*180){
  return encode({kind:"recipient",value:id,exp:Date.now()+ttlMs});
}
export function verifyRecipientToken(token:string){
  return decode(token,"recipient")?.value??null;
}
export function createUnsubscribeToken(email:string,ttlMs=1000*60*60*24*3650){
  return encode({kind:"unsubscribe",value:email.trim().toLowerCase(),exp:Date.now()+ttlMs});
}
export function verifyUnsubscribeToken(token:string){
  return decode(token,"unsubscribe")?.value??null;
}
