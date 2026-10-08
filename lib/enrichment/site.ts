import { chromium } from "playwright";
import * as cheerio from "cheerio";

export type EnrichedContact = {
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
};

export type EnrichmentResult = {
  email?: string;
  phone?: string;
  decisionMakerName?: string;
  decisionMakerRole?: string;
  linkedinUrl?: string;
  roomsOrSeats?: number;
  contacts: EnrichedContact[];
  sourceUrls: string[];
  confidence: number;
};

const EMAIL_RE=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig;
const PHONE_RE=/(?:\+39[\s.-]?)?(?:0\d{1,4}|3\d{2})[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;
const ROLE_RE=/(titolare|direttore(?:\s+generale)?|owner|manager|responsabile|amministratore(?:\s+delegato)?|general manager|hotel manager|direttore di struttura)/i;
const PERSON_RE=/\b([A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ'’-]{2,}\s+[A-ZÀ-ÖØ-Ý][a-zà-öøÿ'’-]{2,})\b/g;

function clean(value?:string){return value?.trim().replace(/\s+/g," ")||undefined}
function normalizeEmail(value:string){return value.trim().toLowerCase().replace(/[),.;:]+$/g,"")}
function normalizePhone(value:string){return value.replace(/[^+\d]/g,"").replace(/^0039/,"+39")}
function absolute(base:string, href:string){try{return new URL(href,base).toString()}catch{return undefined}}

function extractCapacity(text:string, $:cheerio.CheerioAPI){
  const candidates=[
    ...text.matchAll(/\b(\d{1,4})\s*(?:camere|stanze|rooms|posti\s+letto|pax|coperti|posti|tavoli|studenti|residenze)\b/gi)
  ].map(m=>Number(m[1])).filter(n=>n>0&&n<10000);
  const jsonLd=$('script[type="application/ld+json"]').toArray();
  for(const node of jsonLd){
    try{
      const raw=$(node).text();
      const data=JSON.parse(raw);
      const stack=Array.isArray(data)?data:[data];
      for(const item of stack){
        const n=Number(item?.numberOfRooms??item?.numberOfUnits??item?.maximumAttendeeCapacity);
        if(Number.isFinite(n)&&n>0&&n<10000)candidates.push(n);
      }
    }catch{}
  }
  return candidates.length?Math.max(...candidates):undefined;
}

export async function enrichWebsite(website:string):Promise<EnrichmentResult>{
  const browser=await chromium.launch({headless:true});
  const visited=new Set<string>();
  const queue=[website];
  const emails=new Set<string>(), phones=new Set<string>();
  const contacts=new Map<string,EnrichedContact>();
  let linkedinUrl:string|undefined, decisionMakerName:string|undefined, decisionMakerRole:string|undefined;
  let roomsOrSeats:number|undefined;

  try{
    const base=new URL(website);
    const enqueue=(url:string)=>{
      try{
        const u=new URL(url);
        if(u.hostname!==base.hostname||visited.has(u.href)||queue.includes(u.href))return;
        queue.push(u.href);
      }catch{}
    };

    while(queue.length&&visited.size<12){
      const raw=queue.shift()!;
      let current:URL;
      try{current=new URL(raw)}catch{continue}
      if(current.hostname!==base.hostname||visited.has(current.href))continue;
      visited.add(current.href);

      const page=await browser.newPage();
      try{
        await page.goto(current.href,{waitUntil:"domcontentloaded",timeout:15000});
        const html=await page.content();
        const $=cheerio.load(html);
        if(/sitemap(?:\.xml)?$/i.test(current.pathname)){
          $("loc").each((_,el)=>{
            const target=absolute(current.href,$(el).text().trim());
            if(target)enqueue(target);
          });
        }
        const text=$("body").text().replace(/\s+/g," ");
        for(const e of text.match(EMAIL_RE)||[])emails.add(normalizeEmail(e));
        for(const p of text.match(PHONE_RE)||[])phones.add(normalizePhone(p));
        roomsOrSeats=roomsOrSeats??extractCapacity(text,$);

        $("a[href]").each((_,el)=>{
          const href=$(el).attr("href")||"";
          const target=absolute(current.href,href);
          if(!target)return;
          const lower=target.toLowerCase();
          if(lower.includes("linkedin.com/in/")&&!linkedinUrl)linkedinUrl=target;
          const path=new URL(target).pathname.toLowerCase();
          if(/contact|contatti|chi[-_ ]?siamo|team|staff|azienda|management|privacy|note-legali|legal/.test(path))enqueue(target);
        });

        const pageContacts=$(".team-member,.staff-member,.member,.team-item,.staff-item,article").toArray();
        for(const el of pageContacts){
          const block=$(el).text().replace(/\s+/g," ").trim();
          if(!ROLE_RE.test(block))continue;
          const name=block.match(PERSON_RE)?.[1];
          const role=block.match(ROLE_RE)?.[1];
          const email=block.match(EMAIL_RE)?.[0];
          const phone=block.match(PHONE_RE)?.[0];
          const link=$(el).find('a[href*="linkedin.com/in/"]').attr("href");
          const linkedin=link?absolute(current.href,link):undefined;
          if(name){
            const key=name.toLowerCase();
            contacts.set(key,{name,role,email:email?normalizeEmail(email):undefined,phone:phone?normalizePhone(phone):undefined,linkedinUrl:linkedin});
          }
        }

        if(!decisionMakerName){
          const match=text.match(/([A-ZÀ-ÖØ-Ý][a-zà-öøÿ'’-]{2,}\s+[A-ZÀ-ÖØ-Ý][a-zà-öøÿ'’-]{2,})\s*(?:-|–|,|:)\s*(titolare|direttore(?:\s+generale)?|owner|manager|responsabile|amministratore(?:\s+delegato)?|general manager|hotel manager|direttore di struttura)/i);
          if(match){decisionMakerName=match[1];decisionMakerRole=match[2];}
        }

        const title=clean($("title").text());
        void title;
      }catch{}finally{await page.close()}
    }

    // Sitemap and common legal/contact pages are high-value sources for public business data.
    for(const path of ["/sitemap.xml","/privacy","/privacy-policy","/note-legali","/contatti","/contact-us"]){
      const target=new URL(path,base).toString();
      if(!visited.has(target)&&!queue.includes(target))queue.push(target);
    }
    while(queue.length&&visited.size<16){
      const raw=queue.shift()!;
      let current:URL; try{current=new URL(raw)}catch{continue}
      if(current.hostname!==base.hostname||visited.has(current.href))continue;
      visited.add(current.href);
      const page=await browser.newPage();
      try{
        await page.goto(current.href,{waitUntil:"domcontentloaded",timeout:10000});
        const html=await page.content();
        const $=cheerio.load(html);
        if(/sitemap(?:\.xml)?$/i.test(current.pathname)){
          $("loc").each((_,el)=>{
            const target=absolute(current.href,$(el).text().trim());
            if(target)enqueue(target);
          });
        }
        const text=$("body").text().replace(/\s+/g," ");
        for(const e of text.match(EMAIL_RE)||[])emails.add(normalizeEmail(e));
        for(const p of text.match(PHONE_RE)||[])phones.add(normalizePhone(p));
      }catch{}finally{await page.close()}
    }
  }finally{await browser.close()}

  const contactList=[...contacts.values()];
  const primary=contactList[0];
  const finalEmail=[...emails][0]??primary?.email;
  const finalPhone=[...phones][0]??primary?.phone;
  const completeness=[finalEmail,finalPhone,linkedinUrl,decisionMakerName,roomsOrSeats,contactList.length>0].filter(Boolean).length;
  return{
    email:finalEmail,phone:finalPhone,linkedinUrl,decisionMakerName:decisionMakerName??primary?.name,
    decisionMakerRole:decisionMakerRole??primary?.role,roomsOrSeats,contacts:contactList,
    sourceUrls:[...visited],confidence:Math.min(0.98,0.35+completeness*0.1)
  };
}