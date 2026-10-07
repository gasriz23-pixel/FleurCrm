"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";

export default function LoginPage(){
 const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const router=useRouter();
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");const r=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password})});if(r.ok){router.push("/dashboard");router.refresh()}else{setError((await r.json().catch(()=>({}))).error??"Credenziali non valide");setBusy(false)}}
 return <main className="min-h-screen bg-slate-950 text-white grid place-items-center p-6"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8"><h1 className="text-2xl font-bold">FleurCrm</h1><p className="mt-2 text-sm text-slate-400">Accesso operatori</p><input className="mt-8 w-full rounded-lg bg-slate-900 p-3" type="email" required placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input className="mt-3 w-full rounded-lg bg-slate-900 p-3" type="password" required minLength={8} placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/>{error&&<p className="mt-3 text-sm text-red-400">{error}</p>}<button disabled={busy} className="mt-6 w-full rounded-lg bg-emerald-400 p-3 font-semibold text-slate-950 disabled:opacity-50">{busy?"Accesso...":"Accedi"}</button></form></main>;
}
