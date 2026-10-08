import {ProviderRateLimitError} from "./providers";
import type {LeadCandidate,LeadProvider,LeadSearchInput} from "./providers";

type SearchItem={title?:string;link?:string;snippet?:string};

function cleanTitle(value:string){
  return value.replace(/\s*[|–-]\s*(Google|Tripadvisor|PagineGialle|Booking).*$/i,"").trim();
}

function hostName(value:string){
  try{return new URL(value).hostname.replace(/^www\./i,"")}
  catch{return ""}
}

export class GoogleWebSearchProvider implements LeadProvider{
  name="google-web-search";
  async search(input:LeadSearchInput):Promise<LeadCandidate[]>{
    const key=process.env.GOOGLE_SEARCH_API_KEY;
    const cx=process.env.GOOGLE_SEARCH_ENGINE_ID;
    if(!key||!cx)return [];

    const categories=input.categories?.length?input.categories:[input.query];
    const locations=[input.city,input.province,input.region,input.cap].filter(Boolean) as string[];
    const location=locations.join(" ");
    const out:LeadCandidate[]=[];
    const seen=new Set<string>();

    for(const category of categories){
      const q=[category,location].filter(Boolean).join(" ");
      const url=new URL("https://www.googleapis.com/customsearch/v1");
      url.searchParams.set("key",key);
      url.searchParams.set("cx",cx);
      url.searchParams.set("q",q);
      url.searchParams.set("num","10");
      url.searchParams.set("gl","it");
      url.searchParams.set("hl","it");

      const res=await fetch(url);
      if(res.status===429){ const retry=Number(res.headers.get("retry-after")??"5"); throw new ProviderRateLimitError(Math.max(1000,Math.min(30000,retry*1000))); }
      if(!res.ok)continue;
      const data=await res.json() as {items?:SearchItem[]};
      for(const item of data.items??[]){
        if(!item.link)continue;
        const host=hostName(item.link);
        if(!host||seen.has(item.link))continue;
        seen.add(item.link);
        out.push({
          name:cleanTitle(item.title??host),
          category,
          website:item.link,
          sourceUrl:item.link,
          provider:this.name
        });
      }
    }
    return out;
  }
}
