import type {LeadCandidate,LeadProvider} from "./providers";
export class OverpassProvider implements LeadProvider {
 name="osm-overpass";
 async search(input:{query:string;city?:string;radiusKm?:number}):Promise<LeadCandidate[]> {
  const area=(input.city||input.query).replace(/"/g,"");
  const q='[out:json][timeout:30];area["name"="'+area+'"]["boundary"="administrative"]->.a;(nwr["tourism"~"hotel|guest_house|motel"](area.a);nwr["amenity"~"restaurant|fast_food"](area.a););out center tags;';
  const res=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",body:q,headers:{"content-type":"text/plain"}});
  if(!res.ok)throw new Error("Overpass request failed");
  const data=await res.json();
  return (data.elements||[]).map((e:any)=>({name:e.tags?.name,category:e.tags?.tourism||e.tags?.amenity,address:[e.tags?.["addr:street"],e.tags?.["addr:housenumber"]].filter(Boolean).join(" "),city:e.tags?.["addr:city"],phone:e.tags?.phone,website:e.tags?.website,sourceUrl:"https://www.openstreetmap.org/"+e.type+"/"+e.id})).filter((x:LeadCandidate)=>Boolean(x.name));
 }
}
