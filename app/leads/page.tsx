"use client";

import { useEffect, useState } from "react";

const categories = ["Hotel", "Ristorante", "Pizzeria", "B&B", "Affittacamere", "Studentato", "Motel"];
const italyRegions = ["Piemonte", "Valle d'Aosta", "Liguria", "Lombardia", "Trentino-Alto Adige", "Veneto", "Friuli-Venezia Giulia", "Emilia-Romagna", "Toscana", "Umbria", "Marche", "Lazio", "Abruzzo", "Molise", "Campania", "Puglia", "Basilicata", "Calabria", "Sicilia", "Sardegna"];

type Chunk = { id:string; sequence:number; location:string; status:string; progress:number; found:number; error?:string|null; attempts:number };
type Job = { id:string; status:string; progress:number; totalFound:number; error?:string|null; chunks?:Chunk[]; chunkStats?:Record<string,number> };

export default function LeadsPage() {
  const [city,setCity]=useState(""); const [cities,setCities]=useState(""); const [province,setProvince]=useState(""); const [region,setRegion]=useState(""); const [cap,setCap]=useState(""); const [radius,setRadius]=useState("25"); const [category,setCategory]=useState("Hotel"); const [job,setJob]=useState<Job|null>(null); const [loading,setLoading]=useState(false); const [italyWide,setItalyWide]=useState(false);
  const [locationSuggestions,setLocationSuggestions]=useState<Array<{label:string;city?:string;province?:string;region?:string;cap?:string}>>([]);
  const [chunkData,setChunkData]=useState<{stats:Record<string,number>;chunks:Chunk[]}|null>(null);

  useEffect(()=>{const value=city.trim();if(value.length<2){setLocationSuggestions([]);return;}const timer=window.setTimeout(async()=>{try{const r=await fetch("/api/search/locations?q="+encodeURIComponent(value),{cache:"no-store"});if(r.ok)setLocationSuggestions((await r.json()).results??[]);}catch{}} ,300);return()=>window.clearTimeout(timer)},[city]);

  useEffect(()=>{if(!job||!job.id)return;const poll=async()=>{try{const r=await fetch("/api/search/"+job.id,{cache:"no-store"});if(r.ok)setJob(await r.json());const c=await fetch("/api/search/"+job.id+"/chunks",{cache:"no-store"});if(c.ok)setChunkData(await c.json());}catch{}};poll();if(!["QUEUED","RUNNING"].includes(job.status))return;const timer=window.setInterval(poll,1500);return()=>window.clearInterval(timer)},[job?.id,job?.status]);

  async function startSearch(){setLoading(true);setJob(null);setChunkData(null);try{const response=await fetch("/api/search",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query:city||province||region||cap||category,city:city||undefined,filters:{cities:cities.split(",").map(x=>x.trim()).filter(Boolean),regions:italyWide?italyRegions:[],allItaly:italyWide},province:province||undefined,region:region||undefined,cap:cap||undefined,radiusKm:Number(radius)||25,categories:[category]})});const data=await response.json();if(!response.ok)throw new Error(data.error||"Errore avvio ricerca");const s=await fetch("/api/search/"+data.jobId,{cache:"no-store"});setJob(s.ok?await s.json():data);}catch(error){setJob({id:"",status:"FAILED",progress:0,totalFound:0,error:error instanceof Error?error.message:"Errore"});}finally{setLoading(false)}}

  const active=job&&["QUEUED","RUNNING"].includes(job.status); const stats=chunkData?.stats; const failed=chunkData?.chunks.filter(c=>c.status==="FAILED")??[];
  return <main className="min-h-screen bg-slate-100 text-slate-900"><header className="border-b bg-white px-8 py-5"><b>FleurCrm</b></header><div className="mx-auto max-w-7xl p-8">
    <h1 className="text-3xl font-bold">Ricerca lead</h1><p className="mt-2 text-slate-500">Le ricerche sono persistenti lato server e proseguono anche se cambi pagina.</p>
    <section className="mt-8 grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-3">
      <label className="relative text-sm">Città<input value={city} onChange={e=>setCity(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="es. Modena"/>{locationSuggestions.length>0&&<div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-white shadow">{locationSuggestions.map((item,i)=><button type="button" key={item.label+i} onClick={()=>{setCity(item.city??"");setProvince(item.province??"");setRegion(item.region??"");setCap(item.cap??"");setLocationSuggestions([])}} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100">{item.label}</button>)}</div>}</label>
      <label className="text-sm">Provincia<input value={province} onChange={e=>setProvince(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="es. MO"/></label><label className="text-sm">Regione<input value={region} onChange={e=>setRegion(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="es. Emilia-Romagna"/></label><label className="text-sm">CAP<input value={cap} onChange={e=>setCap(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="es. 41121"/></label>
      <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={italyWide} onChange={e=>setItalyWide(e.target.checked)}/><span>Ricerca massiva tutta Italia</span></label><label className="text-sm">Categoria<select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 w-full rounded-lg border p-2">{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="text-sm">Raggio km<input value={radius} onChange={e=>setRadius(e.target.value)} type="number" min="1" max="250" className="mt-1 w-full rounded-lg border p-2"/></label>
      <button disabled={loading||!!active} onClick={startSearch} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50 md:col-span-3">{loading?"Avvio...":active?"Ricerca in corso...":"Avvia ricerca"}</button>
    </section>
    <section className="mt-6 rounded-2xl border bg-white p-6"><h2 className="font-semibold">Stato ricerca</h2>{!job?<p className="mt-3 text-sm text-slate-500">Nessuna ricerca avviata.</p>:<div className="mt-4 space-y-4 text-sm">
      <div className="flex justify-between"><span>Stato</span><strong>{job.status}</strong></div><div className="h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-slate-900 transition-all" style={{width:job.progress+"%"}}/></div><div className="flex justify-between text-slate-500"><span>Progress: {job.progress}%</span><span>Lead trovati: {job.totalFound}</span></div>
      {stats&&<div className="grid grid-cols-2 gap-2 md:grid-cols-6">{[["Totale",stats.total],["Completati",stats.completed],["In corso",stats.running],["In coda",stats.queued],["Falliti",stats.failed],["Lead",stats.leadsFound]].map(([label,value])=><div key={label} className="rounded-lg bg-slate-50 p-3"><div className="text-xs text-slate-500">{label}</div><div className="text-xl font-bold">{value}</div></div>)}</div>}
      {failed.length>0&&<div className="rounded-lg border border-red-200 bg-red-50 p-4"><div className="font-semibold text-red-800">Comuni da verificare ({failed.length})</div><ul className="mt-2 max-h-48 space-y-1 overflow-auto text-sm text-red-700">{failed.map(c=><li key={c.id}><b>{c.location}</b>{c.error?": "+c.error:""}</li>)}</ul></div>}
      {job.error&&<p className="rounded bg-red-50 p-3 text-red-700">{job.error}</p>}
    </div>}</section>
  </div></main>;
}
