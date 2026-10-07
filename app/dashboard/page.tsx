import { db } from "../../lib/db";

export default async function Dashboard() {
  const [leads, activeSearches, openTasks] = await Promise.all([
    db.company.count({ where: { deletedAt: null } }),
    db.searchJob.count({ where: { status: { in: ["QUEUED", "RUNNING"] } } }),
    db.task.count({ where: { status: { in: ["TODO", "IN_PROGRESS"] } } }),
  ]);
  const stats = [["Lead totali", leads], ["Ricerche attive", activeSearches], ["Attività aperte", openTasks], ["Campagne", 0]];

  return <main className="min-h-screen bg-slate-100 text-slate-900">
    <div className="border-b bg-white px-8 py-5"><div className="text-xl font-bold">FleurCrm</div></div>
    <div className="mx-auto max-w-7xl p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-slate-500">Panoramica operativa del CRM lavanolo.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-4">{stats.map(([a,b])=><div className="rounded-xl border bg-white p-5" key={a as string}><div className="text-sm text-slate-500">{a}</div><div className="mt-2 text-3xl font-bold">{b}</div></div>)}</div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <a href="/companies" className="rounded-xl border bg-white p-6 hover:border-slate-400"><h2 className="font-semibold">CRM Lead</h2><p className="mt-2 text-sm text-slate-500">Cerca, filtra e gestisci le aziende acquisite.</p></a>
        <a href="/leads" className="rounded-xl border bg-white p-6 hover:border-slate-400"><h2 className="font-semibold">Ricerca lead</h2><p className="mt-2 text-sm text-slate-500">Avvia ricerche persistenti lato server.</p></a>
        <a href="/tasks" className="rounded-xl border bg-white p-6 hover:border-slate-400"><h2 className="font-semibold">Attività</h2><p className="mt-2 text-sm text-slate-500">Gestisci attività condivise e assegnazioni.</p></a>
      </div>
    </div>
  </main>;
}
