import type {LeadCandidate,LeadProvider,LeadSearchInput} from "./providers";

const endpoints=[
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const NORTH_IT_BBOX={south:43.5,west:6.4,north:47.2,east:14.0};

const categoryTags:Record<string,string[]>={
  Hotel:['["tourism"="hotel"]'],
  Ristorante:['["amenity"="restaurant"]'],
  Pizzeria:['["amenity"="restaurant"]["cuisine"~"pizza|italian"]','["amenity"="fast_food"]["cuisine"~"pizza"]'],
  "B&B":['["tourism"="bed_and_breakfast"]','["tourism"="guest_house"]'],
  Affittacamere:['["tourism"="guest_house"]'],
  Motel:['["tourism"="motel"]'],
  Studentato:['["amenity"="student_accommodation"]','["building"="residential"]["residential"="student_accommodation"]'],
};

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

async function geocode(query:string){
  const url="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=it&q="+encodeURIComponent(query);
  const res=await fetch(url,{headers:{"user-agent":"FleurCrm/1.0 lead-discovery"}});
  if(!res.ok)return null;
  const data=await res.json();
  const item=data?.[0];
  if(!item)return null;
  return {lat:Number(item.lat),lon:Number(item.lon),bbox:(item.boundingbox??[]).map(Number)};
}

function tiles(south:number,west:number,north:number,east:number,size=1){
  const out:{south:number;west:number;north:number;east:number}[]=[];
  for(let lat=south;lat<north;lat+=size)for(let lon=west;lon<east;lon+=size){
    out.push({south:lat,west:lon,north:Math.min(north,lat+size),east:Math.min(east,lon+size)});
  }
  return out;
}

function tagsFor(input:LeadSearchInput){
  const cats=input.categories?.length?input.categories:Object.keys(categoryTags);
  return [...new Set(cats.flatMap(c=>categoryTags[c]??[]))];
}

function buildQuery(input:LeadSearchInput,bbox?:{south:number;west:number;north:number;east:number},around?:{lat:number;lon:number;radius:number}){
  const tags=tagsFor(input);
  if(!tags.length)return null;
  const clauses=tags.map(tag=>`nwr${tag}(AREA);`).join("");
  const aroundClauses=tags.map(tag=>`nwr${tag}(around:${around!.radius},${around!.lat},${around!.lon});`).join("");
  if(around)return `[out:json][timeout:45];(${aroundClauses});out center tags;`;
  const bb=`${bbox!.south},${bbox!.west},${bbox!.north},${bbox!.east}`;
  const bboxClauses=tags.map(tag=>`nwr${tag}(${bb});`).join("");
  return `[out:json][timeout:45];(${bboxClauses});out center tags;`;
}

async function request(query:string){
  let lastError:Error|undefined;
  for(const endpoint of endpoints){
    try{
      const res=await fetch(endpoint,{method:"POST",body:query,headers:{"content-type":"text/plain","user-agent":"FleurCrm/1.0 lead-discovery"}});
      if(!res.ok){lastError=new Error("Overpass HTTP "+res.status);continue;}
      return await res.json();
    }catch(e){lastError=e instanceof Error?e:new Error("Overpass request failed");}
    await sleep(300);
  }
  throw lastError??new Error("Overpass request failed");
}

function mapElement(e:any):LeadCandidate|null{
  const t=e.tags??{},name=t.name;
  if(!name)return null;
  const category=t.tourism==="hotel"?"Hotel":t.tourism==="motel"?"Motel":t.tourism==="guest_house"?"Affittacamere":t.tourism==="bed_and_breakfast"?"B&B":t.amenity==="student_accommodation"?"Studentato":t.amenity==="restaurant"?"Ristorante":t.amenity==="fast_food"?"Pizzeria":undefined;
  return {
    name,category,
    address:[t["addr:street"],t["addr:housenumber"]].filter(Boolean).join(" ")||undefined,
    city:t["addr:city"],province:t["addr:province"],cap:t["addr:postcode"],region:t["addr:region"],
    website:t.website??t["contact:website"],phone:t.phone??t["contact:phone"],email:t.email??t["contact:email"],
    sourceUrl:"https://www.openstreetmap.org/"+e.type+"/"+e.id
  };
}

export class OverpassProvider implements LeadProvider{
  name="osm-overpass";

  async search(input:LeadSearchInput):Promise<LeadCandidate[]>{
    let boxes:{south:number;west:number;north:number;east:number}[]=[];
    let around:{lat:number;lon:number;radius:number}|undefined;

    const location=[input.city,input.cap,input.province,input.region].filter(Boolean).join(", ");
    if(location){
      const geo=await geocode(location);
      if(geo){
        if(input.radiusKm) around={lat:geo.lat,lon:geo.lon,radius:Math.min(50000,Math.max(500,input.radiusKm*1000))};
        else if(geo.bbox.length===4) boxes=[{south:geo.bbox[0],north:geo.bbox[1],west:geo.bbox[2],east:geo.bbox[3]}];
        else boxes=tiles(geo.lat-0.15,geo.lon-0.2,geo.lat+0.15,geo.lon+0.2,0.25);
      }
    }else{
      boxes=tiles(NORTH_IT_BBOX.south,NORTH_IT_BBOX.west,NORTH_IT_BBOX.north,NORTH_IT_BBOX.east,1);
    }

    const queries=around?[buildQuery(input,undefined,around)!]:boxes.map(b=>buildQuery(input,b)).filter(Boolean) as string[];
    const results:LeadCandidate[]=[];
    for(let i=0;i<queries.length;i+=4){
      const batch=await Promise.allSettled(queries.slice(i,i+4).map(request));
      for(const r of batch)if(r.status==="fulfilled"){
        for(const e of r.value.elements??[]){const lead=mapElement(e);if(lead)results.push(lead);}
      }
    }

    const seen=new Set<string>();
    return results.filter(x=>{
      const key=(x.name+"|"+(x.address??"")+"|"+(x.city??"")).toLowerCase();
      if(seen.has(key))return false; seen.add(key); return true;
    });
  }
}
