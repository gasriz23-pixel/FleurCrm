export type LeadCandidate = {
  name:string; category?:string; address?:string; city?:string; province?:string; region?:string; cap?:string;
  website?:string; phone?:string; email?:string; sourceUrl?:string; sourceUrls?:string[];
  provider?:string; providers?:string[]; decisionMakerName?:string; decisionMakerRole?:string;
  linkedinUrl?:string; roomsOrSeats?:number; rating?:number; reviewCount?:number;
};
export type LeadSearchInput={query:string;city?:string;province?:string;region?:string;cap?:string;radiusKm?:number;categories?:string[];filters?:Record<string,unknown>};
export class ProviderRateLimitError extends Error { constructor(public readonly retryAfterMs:number){super("Provider rate limited");this.name="ProviderRateLimitError";} }
export interface LeadProvider{name:string;search(input:LeadSearchInput):Promise<LeadCandidate[]>}
export const CATEGORY_ALIASES:Record<string,string[]>={Hotel:["Hotel","Albergo","Hotel resort","Resort"],Ristorante:["Ristorante","Trattoria","Osteria","Ristorante hotel"],Pizzeria:["Pizzeria","Pizza restaurant","Pizzeria ristorante"],"B&B":["B&B","Bed and Breakfast","Bed & Breakfast"],Affittacamere:["Affittacamere","Guest house","Guesthouse","Casa affittacamere"],Studentato:["Studentato","Residenza universitaria","Student residence","Alloggio studenti"],Motel:["Motel"]};
export function expandCategories(categories?:string[],query?:string){const base=categories?.length?categories:[query??""];return [...new Set(base.flatMap(c=>CATEGORY_ALIASES[c]??[c]).filter(Boolean))];}
export class ProviderRegistry{
  constructor(private providers:LeadProvider[]){}
  async searchAll(input:LeadSearchInput){
    const expanded={...input,categories:expandCategories(input.categories,input.query)};
    const filters=expanded.filters??{};
    const cities=Array.isArray(filters.cities)?filters.cities.map(String).map(x=>x.trim()).filter(Boolean):[];
    const regions=Array.isArray(filters.regions)?filters.regions.map(String).map(x=>x.trim()).filter(Boolean):[];
    const cityInputs=cities.map(city=>({...expanded,city}));
    const regionInputs=regions.map(region=>({...expanded,region,city:undefined}));
    const inputs:LeadSearchInput[]=[...cityInputs,...regionInputs];
    if(!inputs.length)inputs.push(expanded);
    const searchTerm=String(filters.searchTerm??"").trim();
    const activeProviders=searchTerm?this.providers.filter(p=>p.name==="google-places"||p.name==="google-web-search"):this.providers;
    const tasks=inputs.flatMap(location=>activeProviders.map(p=>({location,p})));
    const results:LeadCandidate[][]=[];
    const concurrency=Math.max(1,Math.min(3,Number(filters.providerConcurrency??3)));
    let cursor=0;
    const run=async()=>{while(cursor<tasks.length){const i=cursor++;const {location,p}=tasks[i];
      try{const leads=await p.search(location);results[i]=leads.map(x=>({...x,provider:x.provider??p.name,providers:x.providers??[x.provider??p.name]}));}
      catch(error){if(error instanceof ProviderRateLimitError){await new Promise(resolve=>setTimeout(resolve,Math.min(error.retryAfterMs,30000)));try{const leads=await p.search(location);results[i]=leads.map(x=>({...x,provider:x.provider??p.name,providers:x.providers??[x.provider??p.name]}));}catch(error){if(error instanceof ProviderRateLimitError)throw error;results[i]=[];}}else results[i]=[];}
    }};
    await Promise.all(Array.from({length:Math.min(concurrency,tasks.length)},()=>run()));
    return results.flat();
  }
}
