"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";

type Company={id:string;name:string;category?:string|null;address?:string|null;city?:string|null;province?:string|null;region?:string|null;cap?:string|null;website?:string|null;phone?:string|null;email?:string|null;status:string;rating?:number|null;reviewCount?:number|null;roomsOrSeats?:number|null;decisionMakerName?:string|null;decisionMakerRole?:string|null;linkedinUrl?:string|null;confidence:number;lastVerifiedAt?:string|null;contacts:{id:string;name?:string|null;role?:string|null;email?:string|null;phone?:string|null}[];sources:{id:string;provider:string;url?:string|null;verifiedAt?:string|null}[];tasks:{id:string;title:string;status:string;priority:string;assignee?:{name:string}|null}[]};
const fields=["name","category","address","city","province","region","cap","website","phone","email","status","decisionMakerName","decisionMakerRole","linkedinUrl"] as const;

export default function CompanyPage({params}:{params:Promise<{id:string}>}){
 const [id,setId]=useState("");
 const [company,setCompany]=useState<Company|null>(null);
 const [form,setForm]=useState<Record<string,string>>({});
 const [message,setMessage]=useState("");
 const [enriching,setEnriching]=useState(false);
 const [enrichJob,setEnrichJob]=useState<any>(null);

 useEffect(()=>{params.then(p=>setId(p.id))},[params]);
 const load=useCallback(async ()=>{
   if(!id)return;
   const r=await fetch("/api/companies/"+id,{cache:"no-store"});
   if(r.ok){const d=await r.json();setCompany(d);setForm(Object.fromEntries(fields.map(k=>[k,String(d[k]??"")])));}
 },[id]);
 useEffect(()=>{void load()},[load]);

 async function save(){const r=await fetch("/api/companies/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(form)});setMessage(r.ok?"Salvato":"Errore nel salvataggio");if(r.ok)await load()}
 async function enrich(){setMessage("");setEnriching(true);const r=await fetch("/api/companies/"+id+"/enrich",{method:"POST"});if(!r.ok){setMessage((await r.json()).error||"Errore enrichment");setEnriching(false);return}const j=await r.json();setEnrichJob(j);poll(j.id)}
 async function poll(jobId:string){const r=await fetch("/api/enrichment/"+jobId,{cache:"no-store"});if(!r.ok){setEnriching(false);return}const j=await r.json();setEnrichJob(j);if(j.status==="QUEUED"||j.status==="RUNNING"){setTimeout(()=>poll(jobId),1500)}else{setEnriching(false);await load();setMessage(j.status==="COMPLETED"?"Enrichment completato":"Enrichment terminato con errore")}}
 if(!company)return <main className="min-h-screen bg-slate-100 p-8">Caricamento...</main>;
 return <main className="min-h-screen bg-slate-100 text-slate-900"><div className="border-b bg-white px-8 py-5"><b>FleurCrm</b></div><div className="mx-auto max-w-6xl p-8">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><Link href="/companies" className="text-sm text-slate-500">← CRM Lead</Link><h1 className="mt-2 text-3xl font-bold">{company.name}</h1><p className="mt-1 text-slate-500">{company.city||"Località non disponibile"} · Completezza {Math.round(company.confidence*100)}%</p></div><div className="flex gap-2"><button onClick={enrich} disabled={enriching||!company.website} className="rounded-lg bg-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{enriching?"Arricchimento…":"Arricchisci lead"}</button><button onClick={save} className="rounded-lg bg-slate-900 px-5 py-2 font-semibold text-white">Salva</button></div></div>
  {enrichJob&&<div className="mt-4 rounded-xl border bg-white p-4 text-sm"><b>Enrichment:</b> {enrichJob.status} · {enrichJob.progress}% · {enrichJob.pagesVisited||0} pagine · {enrichJob.fieldsFound||0} campi trovati{enrichJob.error&&<span className="text-red-600"> · {enrichJob.error}</span>}</div>}
  {message&&<p className="mt-3 text-sm text-slate-600">{message}</p>}
  <section className="mt-6 grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">{fields.map(key=><label key={key} className="text-sm font-medium">{key}<input value={form[key]??""} onChange={e=>setForm({...form,[key]:e.target.value})} className="mt-1 w-full rounded-lg border p-2"/></label>)}</section>
  <div className="mt-6 grid gap-6 md:grid-cols-2"><section className="rounded-2xl border bg-white p-6"><h2 className="font-semibold">Contatti</h2>{company.contacts.length?company.contacts.map(c=><div key={c.id} className="mt-4 border-b pb-3 text-sm last:border-0"><b>{c.name||"Contatto"}</b><div>{c.role||"—"} · {c.email||"—"} · {c.phone||"—"}</div></div>):<p className="mt-3 text-sm text-slate-500">Nessun contatto.</p>}</section><section className="rounded-2xl border bg-white p-6"><h2 className="font-semibold">Attività</h2>{company.tasks.length?company.tasks.map(t=><div key={t.id} className="mt-4 border-b pb-3 text-sm last:border-0"><b>{t.title}</b><div>{t.status} · {t.priority} · {t.assignee?.name||"Non assegnata"}</div></div>):<p className="mt-3 text-sm text-slate-500">Nessuna attività.</p>}</section></div>
  <section className="mt-6 rounded-2xl border bg-white p-6"><h2 className="font-semibold">Fonti</h2>{company.sources.map(s=><div key={s.id} className="mt-3 text-sm">{s.provider} · {s.url||"URL non disponibile"}</div>)}{!company.sources.length&&<p className="mt-3 text-sm text-slate-500">Nessuna fonte registrata.</p>}</section>
 </div></main>
}