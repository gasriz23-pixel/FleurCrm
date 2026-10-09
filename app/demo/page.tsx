"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Lead = { id: number; company: string; city: string; sector: string; status: "Nuovo" | "Contattato" | "Qualificato"; score: number };

const initialLeads: Lead[] = [
  { id: 1, company: "Tessilhotel Parma", city: "Parma", sector: "Hotel", status: "Qualificato", score: 92 },
  { id: 2, company: "Lavanderia Aurora", city: "Reggio Emilia", sector: "Lavanderia industriale", status: "Contattato", score: 84 },
  { id: 3, company: "Hotel Giardino", city: "Modena", sector: "Hotel", status: "Nuovo", score: 78 },
  { id: 4, company: "Residenza del Parco", city: "Bologna", sector: "Casa di cura", status: "Nuovo", score: 73 },
  { id: 5, company: "Ristorante La Corte", city: "Parma", sector: "Ristorazione", status: "Qualificato", score: 88 },
];

const tasks = [
  { title: "Richiamare Tessilhotel Parma", owner: "Marco Bianchi", due: "Oggi", done: false },
  { title: "Inviare presentazione servizi", owner: "Giulia Verdi", due: "Domani", done: false },
  { title: "Verificare volumi lavanderia", owner: "Marco Bianchi", due: "Venerdì", done: true },
];

export default function DemoPage() {
  const [tab, setTab] = useState<"overview" | "leads" | "tasks">("overview");
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState(initialLeads);
  const [showNotice, setShowNotice] = useState(false);
  const filtered = useMemo(() => leads.filter((lead) => [lead.company, lead.city, lead.sector, lead.status].join(" ").toLowerCase().includes(query.toLowerCase())), [leads, query]);

  function addLead() {
    const id = Math.max(0, ...leads.map((lead) => lead.id)) + 1;
    setLeads((current) => [{ id, company: "Nuovo lead demo", city: "Parma", sector: "Hotel", status: "Nuovo", score: 70 }, ...current]);
    setTab("leads");
    setShowNotice(true);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col bg-slate-950 px-5 py-6 text-white md:flex">
          <Link href="/" className="mb-10 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 text-lg font-black text-slate-950">F</span>
            <span><span className="block font-bold tracking-tight">FleurCRM</span><span className="text-[10px] uppercase tracking-[.22em] text-slate-400">Demo lavanolo</span></span>
          </Link>
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Workspace demo</p>
          <nav className="space-y-1">
            {([{ id: "overview", label: "Panoramica", icon: "▦" }, { id: "leads", label: "Lead e aziende", icon: "⌕" }, { id: "tasks", label: "Attività", icon: "✓" }] as const).map((item) => (
              <button key={item.id} onClick={() => setTab(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${tab === item.id ? "bg-emerald-400 text-slate-950" : "text-slate-300 hover:bg-white/10"}`}>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-black/10 text-lg">{item.icon}</span>{item.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-sm font-semibold">Ambiente dimostrativo</p><p className="mt-1 text-xs leading-5 text-slate-400">Dati inventati. Le modifiche restano solo in questa sessione.</p></div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 md:px-8">
            <div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">FleurCRM / Demo</p><h1 className="mt-1 text-xl font-bold">{tab === "overview" ? "Panoramica" : tab === "leads" ? "Lead e aziende" : "Attività"}</h1></div>
            <div className="flex items-center gap-3"><span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">● Solo dati demo</span><Link href="/" className="text-sm font-semibold text-slate-600 hover:text-slate-950">Esci dalla demo</Link></div>
          </header>

          <div className="mx-auto max-w-7xl space-y-6 p-5 md:p-8">
            <div className="flex flex-col justify-between gap-4 rounded-2xl bg-slate-950 p-6 text-white md:flex-row md:items-center md:p-8">
              <div><p className="text-sm font-semibold text-emerald-300">BENVENUTO NELLA DEMO INTERATTIVA</p><h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Dal primo contatto alla trattativa.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Esplora una simulazione del CRM per il settore lavanolo. Tutte le aziende e le attività mostrate sono fittizie.</p></div>
              <button onClick={addLead} className="shrink-0 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300">＋ Crea lead demo</button>
            </div>

            {showNotice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Lead dimostrativo aggiunto. Nessun dato è stato inviato o salvato sul server.</div>}

            {tab === "overview" && <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[["Lead totali", String(leads.length), "+2 questa settimana", "◉"], ["Da contattare", String(leads.filter((l) => l.status === "Nuovo").length), "Priorità commerciale", "↗"], ["Qualificati", String(leads.filter((l) => l.status === "Qualificato").length), "Pronti per il follow-up", "✓"], ["Attività aperte", "2", "Prossima: oggi", "◷"]].map(([label, value, caption, icon]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center justify-between text-sm text-slate-500"><span>{label}</span><span className="text-xl text-emerald-700">{icon}</span></div><p className="mt-4 text-3xl font-bold tracking-tight">{value}</p><p className="mt-2 text-xs text-slate-500">{caption}</p></div>)}
              </div>
              <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-bold">Lead recenti</h3><p className="mt-1 text-sm text-slate-500">Esempi di prospect nel tuo mercato</p></div><button onClick={() => setTab("leads")} className="text-sm font-semibold text-emerald-800">Vedi tutti →</button></div><LeadTable leads={leads.slice(0, 4)} /></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6"><h3 className="font-bold">Prossime attività</h3><p className="mt-1 text-sm text-slate-500">Una vista rapida dei follow-up</p><div className="mt-5 space-y-4">{tasks.filter((task) => !task.done).map((task) => <div key={task.title} className="flex gap-3"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" /><div className="min-w-0"><p className="text-sm font-semibold">{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.owner} · {task.due}</p></div></div>)}</div><button onClick={() => setTab("tasks")} className="mt-6 text-sm font-semibold text-emerald-800">Apri attività →</button></div>
              </div>
            </>}

            {tab === "leads" && <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6"><div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h3 className="font-bold">Archivio lead demo</h3><p className="mt-1 text-sm text-slate-500">Cerca per azienda, città, settore o stato.</p></div><label className="block w-full md:max-w-sm"><span className="sr-only">Cerca lead</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cerca un lead..." className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100" /></label></div><LeadTable leads={filtered} /></div>}

            {tab === "tasks" && <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6"><h3 className="font-bold">Attività commerciali demo</h3><p className="mt-1 text-sm text-slate-500">Esempi di follow-up assegnati al team.</p><div className="mt-5 divide-y divide-slate-100">{tasks.map((task) => <div key={task.title} className="flex items-center gap-4 py-4"><span className={`grid h-9 w-9 place-items-center rounded-xl ${task.done ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{task.done ? "✓" : "◷"}</span><div className="min-w-0 flex-1"><p className={`text-sm font-semibold ${task.done ? "text-slate-400 line-through" : "text-slate-800"}`}>{task.title}</p><p className="mt-1 text-xs text-slate-500">{task.owner} · Scadenza: {task.due}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${task.done ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{task.done ? "Completata" : "Aperta"}</span></div>)}</div></div>}

            <p className="pb-4 text-center text-xs text-slate-400">FleurCRM Demo · Dati di fantasia · Nessuna connessione al database reale</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function LeadTable({ leads }: { leads: Lead[] }) {
  if (!leads.length) return <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Nessun lead corrisponde alla ricerca.</p>;
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400"><th className="pb-3 pr-4 font-semibold">Azienda</th><th className="hidden pb-3 pr-4 font-semibold sm:table-cell">Città</th><th className="pb-3 pr-4 font-semibold">Stato</th><th className="pb-3 text-right font-semibold">Score</th></tr></thead><tbody className="divide-y divide-slate-100">{leads.map((lead) => <tr key={lead.id}><td className="py-4 pr-4"><p className="font-semibold text-slate-800">{lead.company}</p><p className="mt-1 text-xs text-slate-500">{lead.sector}</p></td><td className="hidden py-4 pr-4 text-slate-600 sm:table-cell">{lead.city}</td><td className="py-4 pr-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${lead.status === "Qualificato" ? "bg-emerald-50 text-emerald-700" : lead.status === "Contattato" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-800"}`}>{lead.status}</span></td><td className="py-4 text-right font-semibold tabular-nums">{lead.score}</td></tr>)}</tbody></table></div>;
}
