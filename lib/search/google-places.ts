import {ProviderRateLimitError} from "./providers";
import type {LeadCandidate,LeadProvider,LeadSearchInput} from "./providers";

const typeMap:Record<string,string|undefined>={
  Hotel:"hotel", Ristorante:"restaurant", Pizzeria:"restaurant",
  "B&B":"bed_and_breakfast", Affittacamere:"guest_house",
  Studentato:"student_dormitory", Motel:"motel",
};
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
function locations(input:LeadSearchInput){
  const values=[input.city,input.cap,input.province,input.region].filter(Boolean) as string[];
  const unique=[...new Set(values)];
  return unique.length?unique:[input.query];
}

export class GooglePlacesProvider implements LeadProvider {
  name="google-places";
  async search(input:LeadSearchInput):Promise<LeadCandidate[]> {
    const key=process.env.GOOGLE_MAPS_API_KEY; if(!key)return [];
    const categories=input.categories?.length?input.categories:Object.keys(typeMap);
    const out:LeadCandidate[]=[]; const seen=new Set<string>();
    for(const category of categories) for(const location of locations(input)){
      let pageToken:string|undefined;
      for(let page=0;page<3;page++){
        const body:any={textQuery:[category,location].filter(Boolean).join(" "),languageCode:"it",regionCode:"IT",pageSize:20};
        const includedType=typeMap[category]; if(includedType)body.includedType=includedType;
        if(pageToken)body.pageToken=pageToken;
        if(input.filters?.minRating) body.minRating=Math.max(0,Math.min(5,Number(input.filters.minRating)));
        const res=await fetch("https://places.googleapis.com/v1/places:searchText",{
          method:"POST", headers:{"content-type":"application/json","X-Goog-Api-Key":key,
            "X-Goog-FieldMask":"places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.googleMapsUri,places.id,nextPageToken"},
          body:JSON.stringify(body)
        });
        if(res.status===429){ const retry=Number(res.headers.get("retry-after")??"5"); throw new ProviderRateLimitError(Math.max(1000,Math.min(30000,retry*1000))); }
        if(!res.ok)break;
        const data=await res.json();
        for(const p of data.places??[]){
          const name=p.displayName?.text; if(!name)continue;
          const identity=String(p.id??(name+"|"+(p.formattedAddress??""))).toLowerCase();
          if(seen.has(identity))continue; seen.add(identity);
          out.push({name,category,address:p.formattedAddress,website:p.websiteUri,phone:p.nationalPhoneNumber,sourceUrl:p.googleMapsUri,rating:p.rating,reviewCount:p.userRatingCount});
        }
        pageToken=data.nextPageToken; if(!pageToken)break; await sleep(1500);
      }
    }
    return out;
  }
}