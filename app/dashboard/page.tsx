import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";

export default async function Dashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const isBackofficeOnly = user.role === "BACKOFFICE";
  const [leads, activeSearches, openTasks] = await Promise.all([
    isBackofficeOnly ? Promise.resolve(0) : db.company.count({ where: { deletedAt: null } }),
    isBackofficeOnly ? Promise.resolve(0) : db.searchJob.count({ where: { status: { in: ["QUEUED", "RUNNING"] } } }),
    db.task.count({ where: { status: { in: ["TODO", "IN_PROGRESS"] } } }),
  ]);

  const stats = isBackofficeOnly
    ? [["Attività aperte", openTasks]]
    : [["Lead totali", leads], ["Ricerche attive", activeSearches], ["Attività aperte", openTasks], ["Campagne", 0]];

  return <main className="min-h-screen bg-slate-100 text-slate-900">
    <header className="flex items-center justify-between border-b bg-white px-5 py-4 md:px-8">
      <div>
        <div className="text-xl font-bold">FleurCrm</div>
        <div className="text-xs text-slate-500">{user.name} · {user.role}</div>
      </div>
      <form action="/api/auth/logout" method="post">
        <button className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-slate-50">Esci</button>
      </form>
    </header>

    <div className="mx-auto max-w-7xl p-5 md:p-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-slate-500">
        {isBackofficeOnly ? "Area operativa back office." : "Panoramica commerciale e operativa."}
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {stats.map(([label, value]) => (
          <div className="rounded-xl border bg-white p-5 shadow-sm" key={label as string}>
            <div className="text-sm text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {!isBackofficeOnly && <>
          {user.role === "ADMIN" && <Link href="/admin/users" className="rounded-xl border bg-white p-6 shadow-sm hover:border-slate-400">
            <h2 className="font-semibold">Utenti e ruoli</h2>
            <p className="mt-2 text-sm text-slate-500">Gestisci utenti, ruoli e reset password.</p>
          </Link>}
          <Link href="/companies" className="rounded-xl border bg-white p-6 shadow-sm hover:border-slate-400">
            <h2 className="font-semibold">CRM Lead</h2>
            <p className="mt-2 text-sm text-slate-500">Cerca, filtra e gestisci le aziende acquisite.</p>
          </Link>
          <Link href="/leads" className="rounded-xl border bg-white p-6 shadow-sm hover:border-slate-400">
            <h2 className="font-semibold">Ricerca lead</h2>
            <p className="mt-2 text-sm text-slate-500">Avvia ricerche persistenti lato server.</p>
          </Link>
        </>}
        <Link href="/tasks" className="rounded-xl border bg-white p-6 shadow-sm hover:border-slate-400">
          <h2 className="font-semibold">Back office / Attività</h2>
          <p className="mt-2 text-sm text-slate-500">Gestisci attività, scadenze e assegnazioni condivise.</p>
        </Link>
      </div>
    </div>
  </main>;
}
