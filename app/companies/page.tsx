"use client";

import { useEffect, useState } from "react";

type Company = {
  id: string; name: string; category?: string | null; city?: string | null; province?: string | null;
  website?: string | null; email?: string | null; phone?: string | null; status: string;
  decisionMakerName?: string | null; confidence: number; lastVerifiedAt?: string | null;
};

const categories = ["", "Hotel", "Ristorante", "Pizzeria", "B&B", "Affittacamere", "Studentato", "Motel"];
const statuses = ["", "NEW", "CONTACTED", "QUALIFIED", "OPPORTUNITY", "WON", "LOST"];

export default function CompaniesPage() {
  const [items, setItems] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [missing, setMissing] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (q) params.set("q", q);
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (missing) params.set("missing", missing);
    const res = await fetch("/api/companies?" + params.toString(), { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [page, category, status, missing]);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white px-8 py-5"><b>FleurCrm</b></header>
      <div className="mx-auto max-w-7xl p-8">
        <div className="flex items-end justify-between gap-4">
          <div><h1 className="text-3xl font-bold">CRM Lead</h1><p className="mt-2 text-slate-500">{total} aziende nel database.</p></div>
          <a href="/leads" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Nuova ricerca</a>
        </div>

        <section className="mt-6 grid gap-3 rounded-2xl border bg-white p-5 md:grid-cols-5">
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter" && (setPage(1), load())} placeholder="Cerca azienda, email, telefono..." className="rounded-lg border p-2 md:col-span-2"/>
          <input value={city} onChange={e=>setCity(e.target.value)} onKeyDown={e=>e.key==="Enter" && (setPage(1), load())} placeholder="Città" className="rounded-lg border p-2"/>
          <select value={category} onChange={e=>{setCategory(e.target.value);setPage(1)}} className="rounded-lg border p-2">{categories.map(x=><option key={x} value={x}>{x || "Tutte le categorie"}</option>)}</select>
          <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}} className="rounded-lg border p-2">{statuses.map(x=><option key={x} value={x}>{x || "Tutti gli stati"}</option>)}</select>
          <select value={missing} onChange={e=>{setMissing(e.target.value);setPage(1)}} className="rounded-lg border p-2 md:col-span-2">
            <option value="">Qualsiasi completezza</option><option value="email">Senza email</option><option value="phone">Senza telefono</option><option value="website">Senza sito</option><option value="decisionMaker">Senza referente</option>
          </select>
          <button onClick={()=>{setPage(1);load()}} className="rounded-lg border px-4 py-2 font-semibold">Aggiorna</button>
        </section>

        <section className="mt-6 overflow-x-auto rounded-2xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-slate-50 text-left"><tr><th className="p-4">Azienda</th><th className="p-4">Categoria</th><th className="p-4">Località</th><th className="p-4">Contatti</th><th className="p-4">Referente</th><th className="p-4">Stato</th></tr></thead>
            <tbody>
              {loading ? <tr><td className="p-6" colSpan={6}>Caricamento...</td></tr> : items.map(c=>(
                <tr key={c.id} className="border-b last:border-0">
                  <td className="p-4"><a href={"/companies/" + c.id} className="font-semibold hover:underline">{c.name}</a><div className="text-xs text-slate-500">{c.website || "Sito mancante"}</div></td>
                  <td className="p-4">{c.category || "—"}</td>
                  <td className="p-4">{[c.city,c.province].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="p-4"><div>{c.phone || "Telefono —"}</div><div>{c.email || "Email —"}</div></td>
                  <td className="p-4">{c.decisionMakerName || "Da arricchire"}</td>
                  <td className="p-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{c.status}</span></td>
                </tr>
              ))}
              {!loading && items.length === 0 && <tr><td className="p-8 text-center text-slate-500" colSpan={6}>Nessun lead trovato.</td></tr>}
            </tbody>
          </table>
        </section>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span>Pagina {page} · {total} risultati</span>
          <div className="flex gap-2"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="rounded border bg-white px-3 py-2 disabled:opacity-40">Precedente</button><button disabled={page*25>=total} onClick={()=>setPage(p=>p+1)} className="rounded border bg-white px-3 py-2 disabled:opacity-40">Successiva</button></div>
        </div>
      </div>
    </main>
  );
}
