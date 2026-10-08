"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function LoginPage(){
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const router=useRouter();
 async function submit(e:React.FormEvent){
   e.preventDefault(); setBusy(true); setError("");
   try{
     const r=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password})});
     if(r.ok){router.push("/dashboard");router.refresh()}
     else{setError((await r.json().catch(()=>({}))).error??"Credenziali non valide");setBusy(false)}
   }catch{setError("Impossibile raggiungere il servizio. Riprova.");setBusy(false)}
 }
 return <main className="min-h-screen bg-slate-950 text-white">
   <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-2">
     <section className="hidden flex-col justify-between p-10 lg:flex">
       <div className="flex items-center gap-3">
         <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500 text-lg font-black text-slate-950">F</div>
         <div><div className="font-bold tracking-tight">FleurCRM</div><div className="text-[10px] font-semibold uppercase tracking-[.22em] text-slate-500">Lavanolo</div></div>
       </div>
       <div className="max-w-lg pb-10">
         <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">Workspace operativo</span>
         <h1 className="mt-5 text-5xl font-bold leading-tight tracking-[-.04em]">Tutto il CRM.<br/><span className="text-emerald-400">In un unico posto.</span></h1>
         <p className="mt-5 max-w-md text-sm leading-6 text-slate-400">Gestisci aziende, lead, attività e campagne marketing con un flusso di lavoro semplice e ordinato.</p>
       </div>
       <p className="text-xs text-slate-600">FleurCRM · Accesso riservato agli operatori</p>
     </section>
     <section className="flex items-center justify-center bg-white px-6 py-10 text-slate-900 lg:rounded-l-[2.5rem] lg:px-12">
       <div className="w-full max-w-sm">
         <div className="mb-8 lg:hidden"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 font-black text-white">F</div><span className="font-bold">FleurCRM</span></div></div>
         <div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-600">Benvenuto</p><h2 className="mt-2 text-3xl font-bold tracking-tight">Accedi al CRM</h2><p className="mt-2 text-sm text-slate-500">Inserisci le tue credenziali per continuare.</p></div>
         <form onSubmit={submit} className="mt-8 space-y-4">
           <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">Email</span><input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" type="email" required autoComplete="email" placeholder="nome@azienda.it" value={email} onChange={e=>setEmail(e.target.value)}/></label>
           <label className="block"><span className="mb-2 block text-xs font-semibold text-slate-600">Password</span><input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" type="password" required minLength={8} autoComplete="current-password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)}/></label>
           {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
           <button disabled={busy} className="w-full rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{busy?"Accesso in corso…":"Accedi al workspace"}<span className="ml-2">→</span></button>
         </form>
       </div>
     </section>
   </div>
 </main>;
}
