"use client";

import { useEffect, useState } from "react";

const categories = ["Hotel", "Ristorante", "Pizzeria", "B&B", "Affittacamere", "Studentato", "Motel"];
const northRegions = ["Piemonte", "Valle d'Aosta", "Liguria", "Lombardia", "Trentino-Alto Adige", "Veneto", "Friuli-Venezia Giulia", "Emilia-Romagna", "Toscana"];

type Job = {
  id: string;
  status: string;
  progress: number;
  totalFound: number;
  error?: string | null;
};

export default function LeadsPage() {
  const [city, setCity] = useState("");
  const [cities, setCities] = useState("");
  const [province, setProvince] = useState("");
  const [region, setRegion] = useState("");
  const [cap, setCap] = useState("");
  const [radius, setRadius] = useState("25");
  const [category, setCategory] = useState("Hotel");
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [northItaly, setNorthItaly] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{label:string;city?:string;province?:string;region?:string;cap?:string}>>([]);

  useEffect(() => {
    const value = city.trim();
    if (value.length < 2) { setLocationSuggestions([]); return; }
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/search/locations?q=" + encodeURIComponent(value), { cache: "no-store" });
        if (response.ok) setLocationSuggestions((await response.json()).results ?? []);
      } catch {}
    }, 300);
    return () => window.clearTimeout(timer);
  }, [city]);

  useEffect(() => {
    if (!job || !["QUEUED", "RUNNING"].includes(job.status)) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/search/" + job.id, { cache: "no-store" });
        if (!response.ok) return;
        setJob(await response.json());
      } catch {}
    }, 1500);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status]);

  async function startSearch() {
    setLoading(true);
    setJob(null);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query: city || province || region || cap || category,
          city: city || undefined,
          filters: { cities: cities.split(",").map(x => x.trim()).filter(Boolean), regions: northItaly ? northRegions : [] },
          province: province || undefined,
          region: region || undefined,
          cap: cap || undefined,
          radiusKm: Number(radius) || 25,
          categories: [category],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore avvio ricerca");
      const statusResponse = await fetch("/api/search/" + data.jobId, { cache: "no-store" });
      setJob(statusResponse.ok ? await statusResponse.json() : data);
    } catch (error) {
      setJob({ id: "", status: "FAILED", progress: 0, totalFound: 0, error: error instanceof Error ? error.message : "Errore" });
    } finally {
      setLoading(false);
    }
  }

  const active = job && ["QUEUED", "RUNNING"].includes(job.status);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white px-8 py-5"><b>FleurCrm</b></header>
      <div className="mx-auto max-w-7xl p-8">
        <h1 className="text-3xl font-bold">Ricerca lead</h1>
        <p className="mt-2 text-slate-500">Le ricerche sono persistenti lato server e proseguono anche se cambi pagina.</p>

        <section className="mt-8 grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-3">
          <label className="relative text-sm">Città<input value={city} onChange={e=>setCity(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="es. Modena"/>{locationSuggestions.length>0 && <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-white shadow">{locationSuggestions.map((item,i)=><button type="button" key={item.label+i} onClick={()=>{setCity(item.city??"");setProvince(item.province??"");setRegion(item.region??"");setCap(item.cap??"");setLocationSuggestions([])}} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100">{item.label}</button>)}</div>}</label>
          <label className="text-sm">Provincia<input value={province} onChange={e=>setProvince(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="es. MO"/></label>
          <label className="text-sm">Regione<input value={region} onChange={e=>setRegion(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="es. Emilia-Romagna"/></label>
          <label className="text-sm">CAP<input value={cap} onChange={e=>setCap(e.target.value)} className="mt-1 w-full rounded-lg border p-2" placeholder="es. 41121"/></label>
          <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={northItaly} onChange={e=>setNorthItaly(e.target.checked)}/><span>Ricerca massiva Nord Italia</span></label>
          <label className="text-sm">Categoria<select value={category} onChange={e=>setCategory(e.target.value)} className="mt-1 w-full rounded-lg border p-2">{categories.map(c=><option key={c}>{c}</option>)}</select></label>
          <label className="text-sm">Raggio km<input value={radius} onChange={e=>setRadius(e.target.value)} type="number" min="1" max="250" className="mt-1 w-full rounded-lg border p-2"/></label>
          <button disabled={loading || !!active} onClick={startSearch} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50 md:col-span-3">
            {loading ? "Avvio..." : active ? "Ricerca in corso..." : "Avvia ricerca"}
          </button>
        </section>

        <section className="mt-6 rounded-2xl border bg-white p-6">
          <h2 className="font-semibold">Stato ricerca</h2>
          {!job ? <p className="mt-3 text-sm text-slate-500">Nessuna ricerca avviata.</p> : (
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><span>Stato</span><strong>{job.status}</strong></div>
              <div className="h-2 overflow-hidden rounded bg-slate-200"><div className="h-full bg-slate-900 transition-all" style={{width: job.progress + "%"}} /></div>
              <div className="flex justify-between text-slate-500"><span>Progress: {job.progress}%</span><span>Lead trovati: {job.totalFound}</span></div>
              {job.error && <p className="rounded bg-red-50 p-3 text-red-700">{job.error}</p>}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
