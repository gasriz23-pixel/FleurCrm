import { chromium } from "playwright";
import * as cheerio from "cheerio";

export type EnrichmentResult = {
  email?: string; phone?: string; decisionMakerName?: string; decisionMakerRole?: string;
  linkedinUrl?: string; sourceUrls: string[]; confidence: number;
};

const EMAIL_RE=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig;
const PHONE_RE=/(?:\+39[\s.-]?)?(?:0\d{1,4}|3\d{2})[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;

function clean(value?:string){return value?.trim().replace(/\s+/g," ")||undefined}

export async function enrichWebsite(website:string):Promise<EnrichmentResult>{
  const browser=await chromium.launch({headless:true});
  const visited=new Set<string>();
  const queue=[website];
  const emails=new Set<string>(), phones=new Set<string>();
  let linkedinUrl:string|undefined, decisionMakerName:string|undefined, decisionMakerRole:string|undefined;

  try {
    while(queue.length && visited.size<8){
      const raw=queue.shift()!;
      let url:string;
      try { url=new URL(raw).toString(); } catch { continue; }
      const base=new URL(website);
      const current=new URL(url);
      if(current.hostname!==base.hostname) continue;
      if(visited.has(current.href)) continue;
      visited.add(current.href);

      const page=await browser.newPage();
      try{
        await page.goto(current.href,{waitUntil:"domcontentloaded",timeout:15000});
        const html=await page.content();
        const $=cheerio.load(html);
        const text=$("body").text().replace(/\s+/g," ");
        for(const e of text.match(EMAIL_RE)||[]) emails.add(e.toLowerCase());
        for(const p of text.match(PHONE_RE)||[]) phones.add(p.trim());
        $("a[href]").each((_,el)=>{
          const href=$(el).attr("href")||"";
          const absolute=new URL(href,current.href).toString();
          const lower=absolute.toLowerCase();
          if(lower.includes("linkedin.com/in/") && !linkedinUrl) linkedinUrl=absolute;
          if(["/contact","/contatti","/chi-siamo","/chi_siamo","/team","/staff","/azienda"].some(x=>new URL(absolute).pathname.toLowerCase().includes(x)) && !visited.has(absolute)) queue.push(absolute);
        });
        const title=clean($("title").text());
        const headings=clean($("h1,h2,h3").first().text());
        if(!decisionMakerName && headings && /(titolare|direttore|owner|manager|responsabile|amministratore)/i.test(text)){
          const match=text.match(/([A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+)\s+(?:-|–|,)\s*(titolare|direttore|owner|manager|responsabile|amministratore)/i);
          if(match){decisionMakerName=match[1];decisionMakerRole=match[2];}
        }
        void title;
      }catch{} finally { await page.close(); }
    }
  } finally { await browser.close(); }

  const completeness=[emails.size>0,phones.size>0,linkedinUrl,decisionMakerName].filter(Boolean).length;
  return {
    email:[...emails][0], phone:[...phones][0], linkedinUrl,
    decisionMakerName, decisionMakerRole, sourceUrls:[...visited],
    confidence:Math.min(0.95,0.35+completeness*0.15)
  };
}
