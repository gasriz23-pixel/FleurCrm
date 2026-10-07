import type {LeadCandidate,LeadProvider,LeadSearchInput} from "./providers";

const typeMap:Record<string,string[]>={Hotel:["hotel"],Ristorante:["restaurant"],Pizzeria:["restaurant"],"B&B":["bed_and_breakfast"],Affittacamere:["lodging"],Studentato:["lodging"],Motel:["motel"]};

export class GooglePlacesProvider implements LeadProvider {
 name="google-places";
 async search(input:LeadSearchInput):Promise<LeadCandidate[]>{
  const key=process.env.GOOGLE_MAPS_API_KEY;if(!key)return [];
  const categories=input.categories?.length?input.categories:Object.keys(typeMap),out:LeadCandidate[]=[];
  for(const category of categories){
   const location=[input.city,input.province,input.region,input.cap].filter(Boolean).join(", ")||input.query;
   const body:any={textQuery:[category,location].filter(Boolean).join(" "),languageCode:"it",regionCode:"IT",maxResultCount:20};
   if(typeMap[category]?.[0])body.includedType=typeMap[category][0];
   const res=await fetch("https://places.googleapis.com/v1/places:searchText",{method:"POST",headers:{"content-type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":"places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.googleMapsUri"},body:JSON.stringify(body)});
   if(!res.ok)continue;const data=await res.json();
   for(const p of data.places??[]){const name=p.displayName?.text;if(name)out.push({name,category,address:p.formattedAddress,website:p.websiteUri,phone:p.nationalPhoneNumber,sourceUrl:p.googleMapsUri,rating:p.rating,reviewCount:p.userRatingCount});}
  }
  return out;
 }
}
