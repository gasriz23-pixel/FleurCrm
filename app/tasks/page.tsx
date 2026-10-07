"use client";

import { useEffect, useState } from "react";

type User = { id:string; name:string; role:string };
type Task = { id:string; title:string; status:string; priority:string; dueAt?:string|null; assignee?:User|null; company?:{id:string;name:string}|null };

export default function Tasks() {
  const [tasks,setTasks]=useState<Task[]>([]);
  const [users,setUsers]=useState<User[]>([]);
  const [title,setTitle]=useState("");
  const [assigneeId,setAssigneeId]=useState("");
  const [priority,setPriority]=useState("MEDIUM");
  const [dueAt,setDueAt]=useState("");

  async function load(){const [a,b]=await Promise.all([fetch("/api/tasks",{cache:"no-store"}),fetch("/api/users",{cache:"no-store"})]);if(a.ok)setTasks(await a.json());if(b.ok)setUsers(await b.json())}
  useEffect(()=>{load()},[]);

  async function createTask(){
    if(!title.trim()) return;
    const r=await fetch("/api/tasks",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title,assigneeId:assigneeId||null,priority,dueAt:dueAt||null})});
    if(r.ok){setTitle("");setAssigneeId("");setDueAt("");await load()}
  }
  async function update(id:string,data:Record<string,unknown>){const r=await fetch("/api/tasks/"+id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(data)});if(r.ok)await load()}

  return <main className="min-h-screen bg-slate-100 p-8 text-slate-900"><div className="mx-auto max-w-6xl">
    <h1 className="text-3xl font-bold">Attività</h1><p className="mt-2 text-slate-500">Attività condivise tra commerciale, back office e amministrazione.</p>
    <section className="mt-8 grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-5">
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nuova attività..." className="rounded-lg border p-2 md:col-span-2"/>
      <select value={assigneeId} onChange={e=>setAssigneeId(e.target.value)} className="rounded-lg border p-2"><option value="">Non assegnata</option>{users.map(u=><option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}</select>
      <select value={priority} onChange={e=>setPriority(e.target.value)} className="rounded-lg border p-2">{["LOW","MEDIUM","HIGH","URGENT"].map(x=><option key={x}>{x}</option>)}</select>
      <input type="datetime-local" value={dueAt} onChange={e=>setDueAt(e.target.value)} className="rounded-lg border p-2"/>
      <button onClick={createTask} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white md:col-span-5">Crea attività</button>
    </section>
    <section className="mt-6 overflow-hidden rounded-2xl border bg-white">
      {tasks.map(t=><div key={t.id} className="grid gap-3 border-b p-5 md:grid-cols-5 last:border-0">
        <div className="md:col-span-2"><div className="font-medium">{t.title}</div><div className="text-xs text-slate-500">{t.company?.name||"Nessun lead collegato"}{t.dueAt?" · Scadenza "+new Date(t.dueAt).toLocaleString("it-IT"):""}</div></div>
        <select value={t.assignee?.id||""} onChange={e=>update(t.id,{assigneeId:e.target.value||null})} className="rounded border p-2"><option value="">Non assegnata</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select>
        <select value={t.priority} onChange={e=>update(t.id,{priority:e.target.value})} className="rounded border p-2">{["LOW","MEDIUM","HIGH","URGENT"].map(x=><option key={x}>{x}</option>)}</select>
        <select value={t.status} onChange={e=>update(t.id,{status:e.target.value})} className="rounded border p-2">{["TODO","IN_PROGRESS","DONE","CANCELLED"].map(x=><option key={x}>{x}</option>)}</select>
      </div>)}
      {!tasks.length&&<div className="p-8 text-center text-slate-500">Nessuna attività.</div>}
    </section>
  </div></main>
}
