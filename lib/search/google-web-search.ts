import {ProviderRateLimitError} from "./providers";
import type {LeadCandidate,LeadProvider,LeadSearchInput} from "./providers";
type SearchItem={title?:string;link?:string;snippet?:string};
function cleanTitle(value:string){return value.replace(/\s*[|–-]\s*(Google|Tripadvisor|PagineGialle|Booking).*$/i,"").trim();}
function hostName(value:string){try{return new URL(value).hostname.replace(/^www\./i,"")}catch{return "";}}
export class GoogleWebSearchProvider implements LeadProvider{
  name="google-web-search";
  async search(input:LeadSearchInput):Promise<LeadCandidate[]>{
    const key=process.env.GOOGLE_SEARCH_API_KEY,cx=process.env.GOOGLE_SEARCH_ENGINE_ID;if(!key||!cx)return [];
    const searchTerm=String(input.filters?.searchTerm??"").trim();
    const categories=input.categories?.length?input.categories:[input.query],location=[input.city,input.province,input.region,input.cap].filter(Boolean).join(" "),out:LeadCandidate[]=[],seen=new Set<string>();
    for(const category of categories)for(let start=1;start<=91;start+=10){
      const url=new URL("https://www.googleapis.com/customsearch/v1");url.searchParams.set("key",key);url.searchParams.set("cx",cx);url.searchParams.set("q",[searchTerm||category,location].filter(Boolean).join(" "));url.searchParams.set("num","10");url.searchParams.set("start",String(start));url.searchParams.set("gl","it");url.searchParams.set("hl","it");
      const res=await fetch(url);if(res.status===429){const retry=Number(res.headers.get("retry-after")??"5");throw new ProviderRateLimitError(Math.max(1000,Math.min(30000,retry*1000)));}if(!res.ok)break;
      const data=await res.json() as {items?:SearchItem[]};const items=data.items??[];if(!items.length)break;
      for(const item of items){if(!item.link)continue;const host=hostName(item.link);if(!host||seen.has(item.link))continue;seen.add(item.link);out.push({name:cleanTitle(item.title??host),category:searchTerm||category,city:input.city,province:input.province,region:input.region,cap:input.cap,website:item.link,sourceUrl:item.link,provider:this.name});}
      if(items.length<10)break;
    }
    return out;
  }
}
