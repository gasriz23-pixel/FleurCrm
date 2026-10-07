const stats=[["Lead totali","0"],["Ricerche attive","0"],["Attività aperte","0"],["Campagne","0"]];

export default function Dashboard(){
 return <main className="min-h-screen bg-slate-100 text-slate-900">
  <div className="border-b bg-white px-8 py-5"><div className="text-xl font-bold">FleurCrm</div></div>
  <div className="mx-auto max-w-7xl p-8">
   <h1 className="text-3xl font-bold">Dashboard</h1>
   <p className="mt-2 text-slate-500">Panoramica operativa del CRM lavanolo.</p>
   <div className="mt-8 grid gap-4 md:grid-cols-4">{stats.map(([a,b])=><div className="rounded-xl border bg-white p-5" key={a}><div className="text-sm text-slate-500">{a}</div><div className="mt-2 text-3xl font-bold">{b}</div></div>)}</div>
   <div className="mt-8 rounded-xl border bg-white p-6"><h2 className="font-semibold">Prossimi moduli</h2><ul className="mt-4 space-y-2 text-sm text-slate-600"><li>• Ricerca lead asincrona con job persistenti</li><li>• CRM aziende/contatti con deduplica</li><li>• Task e assegnazioni</li><li>• Enrichment multi-pagina</li><li>• Email marketing e compliance</li></ul></div>
  </div>
 </main>
}