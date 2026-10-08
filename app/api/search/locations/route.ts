import { NextResponse } from "next/server";
import { requireArea } from "../../../../lib/permissions";
type NominatimItem={display_name?:string;lat?:string;lon?:string;type?:string;class?:string;address?:Record<string,string>};
export async function GET(req:Request){
  try{await requireArea("SEARCH");}catch(e){return NextResponse.json({error:e instanceof Error?e.message:"FORBIDDEN"},{status:403});}
  const q=new URL(req.url).searchParams.get("q")?.trim()??"";
  if(q.length<2)return NextResponse.json({results:[]});
  const url=new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format","jsonv2");url.searchParams.set("addressdetails","1");url.searchParams.set("limit","8");url.searchParams.set("countrycodes","it");url.searchParams.set("q",q);
  const res=await fetch(url,{headers:{"user-agent":"FleurCrm/1.0 lead-discovery"}});
  if(!res.ok)return NextResponse.json({results:[]});
  const items=await res.json() as NominatimItem[];
  const results=items.map(item=>({label:item.display_name??"",city:item.address?.city??item.address?.town??item.address?.village??item.address?.municipality,province:item.address?.["ISO3166-2-lvl6"]?.replace("IT-","")??item.address?.county,region:item.address?.state,cap:item.address?.postcode,lat:item.lat?Number(item.lat):undefined,lon:item.lon?Number(item.lon):undefined})).filter(x=>x.city);
  return NextResponse.json({results});
}
