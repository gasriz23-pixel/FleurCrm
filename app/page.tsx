import Link from "next/link";

const cards = [
  ["Lead", "Gestisci aziende, contatti, fonti e qualità dei dati."],
  ["Ricerca", "Avvia ricerche asincrone per città, CAP, provincia e raggio."],
  ["Attività", "Assegna follow-up a commerciale, back office e admin."],
  ["Email marketing", "Prepara campagne, segmenti e sequenze con tracciamento."],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5 md:px-8">
        <div><div className="text-xl font-bold">FleurCRM</div><div className="text-xs text-slate-400">Lavanolo CRM</div></div>
        <div className="flex items-center gap-3">
          <Link className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10" href="/login">Accedi</Link>
          <Link className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300" href="/demo">Prova la demo</Link>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-8 md:py-20">
        <p className="text-sm font-semibold text-emerald-400">CRM INDUSTRIALE · LAVANOLO</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">Dal prospect alla trattativa, con ricerca lead persistente.</h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-300">Una base solida per acquisizione, enrichment, CRM, attività e marketing del servizio lavanolo.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-300" href="/demo">Esplora la demo senza login →</Link>
          <Link className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10" href="/login">Accesso area riservata</Link>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {cards.map(([title, text]) => <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm text-slate-400">{text}</p></div>)}
        </div>
        <p className="mt-8 text-xs text-slate-500">La demo usa esclusivamente dati fittizi e non modifica il database reale.</p>
      </section>
    </main>
  );
}
