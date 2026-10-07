"use client";

import { useEffect, useState } from "react";

type Company = {
  id: string; name: string; category?: string|null; address?: string|null; city?: string|null; province?: string|null; region?: string|null; cap?: string|null;
  website?: string|null; phone?: string|null; email?: string|null; status: string; rating?: number|null; reviewCount?: number|null;
  roomsOrSeats?: number|null; decisionMakerName?: string|null; decisionMakerRole?: string|null; linkedinUrl?: string|null;
  confidence: number; lastVerifiedAt?: string|null; contacts: {id:string;name?:string|null;role?:string|null;email?:string|null;phone?:string|null}[];
  sources: {id:string;provider:string;url?:string|null;verifiedAt?:string|null}[];
  tasks: {id:string;title:string;status:string;priority:string;assignee?:{name:string}|null}[];
};

const fields = ["name","category","address","city","province","region","cap","website","phone","email","status","decisionMakerName","decisionMakerRole","linkedinUrl"] as const;

export default function CompanyDetail({ params }: { params: { id: string } }) {
  const [company,setCompany]=useState<Company|null>(null);
  const [form,setForm]=useState<Record<string,string>>({});
  const [message,setMessage]=useState("");

  async function load(){
    const r=await fetch("/api/companies/"+params.id,{cache:"no-store"});
    if(r.ok){const data=await r.json();setCompany(data);setForm(Object.fromEntries(fields.map(k=>[k,String(data[k]??"")])));}
  }
  useEffect(()=>{load()},[params.id]);

  async function save(){
    const r=await fetch("/api/companies/"+params.id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(form)});
    setMessage(r.ok?"Salvato":"Errore nel salvataggio"); if(r.ok) await load();
  }

  if(!company) return <main className="min-h-screen bg-slate-100 p-8">Caricamento...</main>;

  return <main className="min-h-screen bg-slate-100 text-slate-900"><div className="border-b bg-white px-8 py-5"><b>FleurCrm</b></div><div className="mx-auto max-w-6xl p-8">
    <div className="flex items-start justify-between"><div><a href="/companies" className="text-sm text-slate-500">← CRM Lead</a><h1 className="mt-2 text-3xl font-bold">{company.name}</h1><p className="mt-1 text-slate-500">{company.city||"Località non disponibile"} · Completezza {Math.round(company.confidence*100)}%</p></div><button onClick={save} className="rounded-lg bg-slate-900 px-5 py-2 font-semibold text-white">Salva</button></div>
    {message&&<p className="mt-3 text-sm text-slate-600">{message}</p>}
    <section className="mt-6 grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">{fields.map(key=><label key={key} className="text-sm font-medium">{key}<input value={form[key]??""} onChange={e=>setForm({...form,[key]:e.target.value})} className="mt-1 w-full rounded-lg border p-2"/></label>)}</section>
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <section className="rounded-2xl border bg-white p-6"><h2 className="font-semibold">Contatti</h2>{company.contacts.length?company.contacts.map(c=><div key={c.id} className="mt-4 border-b pb-3 text-sm last:border-0"><b>{c.name||"Contatto"}</b><div>{c.role||"—"} · {c.email||"—"} · {c.phone||"—"}</div></div>):<p className="mt-3 text-sm text-slate-500">Nessun contatto.</p>}</section>
      <section className="rounded-2xl border bg-white p-6"><h2 className="font-semibold">Attività</h2>{company.tasks.length?company.tasks.map(t=><div key={t.id} className="mt-4 border-b pb-3 text-sm last:border-0"><b>{t.title}</b><div>{t.status} · {t.priority} · {t.assignee?.name||"Non assegnata"}</div></div>):<p className="mt-3 text-sm text-slate-500">Nessuna attività.</p>}</section>
    </div>
    <section className="mt-6 rounded-2xl border bg-white p-6"><h2 className="font-semibold">Fonti</h2>{company.sources.map(s=><div key={s.id} className="mt-3 text-sm">{s.provider} · {s.url||"URL non disponibile"}</div>)}{!company.sources.length&&<p className="mt-3 text-sm text-slate-500">Nessuna fonte registrata.</p>}</section>
  </div></main>;
}
