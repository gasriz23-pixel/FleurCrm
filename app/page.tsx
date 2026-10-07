import Link from "next/link";

const cards=[
  ["Lead","Gestisci aziende, contatti, fonti e qualità dei dati."],
  ["Ricerca","Avvia ricerche asincrone per città, CAP, provincia e raggio."],
  ["Attività","Assegna follow-up a commerciale, back office e admin."],
  ["Email marketing","Prepara campagne, segmenti e sequenze con tracciamento."]
];

export default function Home(){
  return <main className="min-h-screen bg-slate-950 text-white">
    <header className="border-b border-white/10 px-8 py-5 flex items-center justify-between">
      <div><div className="text-xl font-bold">FleurCrm</div><div className="text-xs text-slate-400">Lavanolo CRM</div></div>
      <Link className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950" href="/dashboard">Apri dashboard</Link>
    </header>
    <section className="mx-auto max-w-6xl px-8 py-20">
      <p className="text-emerald-400 text-sm font-semibold">CRM INDUSTRIALE</p>
      <h1 className="mt-3 max-w-3xl text-5xl font-bold tracking-tight">Dal prospect alla trattativa, con ricerca lead persistente.</h1>
      <p className="mt-6 max-w-2xl text-lg text-slate-300">Una base solida per acquisizione, enrichment, CRM, attività e marketing del servizio lavanolo.</p>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {cards.map(([title,text])=><div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm text-slate-400">{text}</p></div>)}
      </div>
    </section>
  </main>;
}