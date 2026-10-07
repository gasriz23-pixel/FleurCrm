export type LeadCandidate = {
  name:string;
  category?:string;
  address?:string;
  city?:string;
  province?:string;
  region?:string;
  cap?:string;
  website?:string;
  phone?:string;
  email?:string;
  sourceUrl?:string;
  sourceUrls?:string[];
  provider?:string;
  providers?:string[];
  decisionMakerName?:string;
  decisionMakerRole?:string;
  linkedinUrl?:string;
  roomsOrSeats?:number;
  rating?:number;
  reviewCount?:number;
};
export type LeadSearchInput={query:string;city?:string;province?:string;region?:string;cap?:string;radiusKm?:number;categories?:string[];filters?:Record<string,unknown>};
export interface LeadProvider{name:string;search(input:LeadSearchInput):Promise<LeadCandidate[]>}
export class ProviderRegistry{
  constructor(private providers:LeadProvider[]){}
  async searchAll(input:LeadSearchInput){
    const results=await Promise.allSettled(this.providers.map(async p=>(await p.search(input)).map(x=>({...x,provider:x.provider??p.name,providers:x.providers??[x.provider??p.name]}))));
    return results.flatMap(r=>r.status==="fulfilled"?r.value:[]);
  }
}
