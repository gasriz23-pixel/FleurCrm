export type EmailMessage={to:string;subject:string;html:string;text?:string};

export async function sendEmail(message:EmailMessage){
  const key=process.env.RESEND_API_KEY||process.env.EMAIL_PROVIDER_API_KEY;
  const from=process.env.EMAIL_FROM;
  if(!key||!from) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+key},body:JSON.stringify({from,to:message.to,subject:message.subject,html:message.html,text:message.text})});
  if(!response.ok) throw new Error("EMAIL_PROVIDER_HTTP_"+response.status);
  return await response.json() as {id?:string};
}

export function renderTemplate(input:string,vars:Record<string,string|number|undefined>){
  return input.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g,(_,key:string)=>String(vars[key]??""));
}
