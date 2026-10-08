import * as XLSX from "xlsx";

export type MunicipalityScope={name:string;province?:string;region?:string;cap?:string};

let cache: MunicipalityScope[]|null=null;

export async function loadItalianMunicipalities():Promise<MunicipalityScope[]>{
  if(cache)return cache;
  const source=process.env.ISTAT_MUNICIPALITIES_URL;
  if(!source)throw new Error("ISTAT_MUNICIPALITIES_URL is not configured");
  const response=await fetch(source,{headers:{"user-agent":"FleurCrm/1.0"}});
  if(!response.ok)throw new Error("ISTAT municipality download failed");
  const workbook=XLSX.read(Buffer.from(await response.arrayBuffer()),{type:"buffer"});
  const rows=XLSX.utils.sheet_to_json<Record<string,unknown>>(workbook.Sheets[workbook.SheetNames[0]],{defval:""});
  const find=(row:Record<string,unknown>,terms:string[])=>{
    const key=Object.keys(row).find(k=>terms.some(t=>k.toLowerCase().includes(t)));
    return key?String(row[key]??"").trim():"";
  };
  const result=rows.map(row=>({
    name:find(row,["denominazione in italiano","denominazione comune","denominazione"]),
    province:find(row,["denominazione provincia","provincia"]),
    region:find(row,["denominazione regione","regione"]),
    cap:find(row,["cap"])
  })).filter(x=>x.name);
  if(result.length<7000)throw new Error("ISTAT municipality dataset unexpectedly small");
  cache=result;
  return result;
}
