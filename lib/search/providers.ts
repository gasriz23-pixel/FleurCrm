export type LeadCandidate = {
  name:string; category?:string; address?:string; city?:string; province?:string; region?:string; cap?:string;
  website?:string; phone?:string; email?:string; sourceUrl?:string; sourceUrls?:string[];
  provider?:string; providers?:string[]; decisionMakerName?:string; decisionMakerRole?:string;
  linkedinUrl?:string; roomsOrSeats?:number; rating?:number; reviewCount?:number;
};
export type LeadSearchInput={query:string;city?:string;province?:string;region?:string;cap?:string;radiusKm?:number;categories?:string[];filters?:Record<string,unknown>};
export interface LeadProvider{name:string;search(input:LeadSearchInput):Promise<LeadCandidate[]>}

export const CATEGORY_ALIASES:Record<string,string[]>={
  Hotel:["Hotel","Albergo","Hotel resort","Resort"],
  Ristorante:["Ristorante","Trattoria","Osteria","Ristorante hotel"],
  Pizzeria:["Pizzeria","Pizza restaurant","Pizzeria ristorante"],
  "B&B":["B&B","Bed and Breakfast","Bed & Breakfast"],
  Affittacamere:["Affittacamere","Guest house","Guesthouse","Casa affittacamere"],
  Studentato:["Studentato","Residenza universitaria","Student residence","Alloggio studenti"],
  Motel:["Motel"],
};

export function expandCategories(categories?:string[],query?:string){
  const base=categories?.length?categories:[query??""];
  return [...new Set(base.flatMap(c=>CATEGORY_ALIASES[c]??[c]).filter(Boolean))];
}

export class ProviderRegistry{
  constructor(private providers:LeadProvider[]){}
  async searchAll(input:LeadSearchInput){
    const expanded={...input,categories:expandCategories(input.categories,input.query)};
    const filters=expanded.filters??{};
    const cities=Array.isArray(filters.cities)?filters.cities.map(String).map(x=>x.trim()).filter(Boolean):[];
    const regions=Array.isArray(filters.regions)?filters.regions.map(String).map(x=>x.trim()).filter(Boolean):[];
    const cityInputs=cities.map(city=>({...expanded,city}));
    const regionInputs=regions.map(region=>({...expanded,region,city:undefined}));
    const inputs=[...cityInputs,...regionInputs];
    if(!inputs.length) inputs.push(expanded);
    const results=await Promise.allSettled(
      inputs.flatMap(location=>this.providers.map(async p=>
        (await p.search(location)).map(x=>({...x,provider:x.provider??p.name,providers:x.providers??[x.provider??p.name]}))
      ))
    );
    return results.flatMap(r=>r.status==="fulfilled"?r.value:[]);
  }
}