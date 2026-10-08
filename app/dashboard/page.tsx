import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "../../lib/db";
import { getSessionUser } from "../../lib/auth";

const nav = [
  {href:"/dashboard", label:"Dashboard", icon:"⌂"},
  {href:"/companies", label:"Aziende", icon:"▦"},
  {href:"/leads", label:"Ricerca lead", icon:"⌕"},
  {href:"/tasks", label:"Attività", icon:"✓"},
  {href:"/marketing", label:"Marketing", icon:"✉"},
];

export default async function Dashboard() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const isBackofficeOnly = user.role === "BACKOFFICE";

  const [leads, activeSearches, openTasks, campaigns] = await Promise.all([
    isBackofficeOnly ? Promise.resolve(0) : db.company.count({where:{deletedAt:null}}),
    isBackofficeOnly ? Promise.resolve(0) : db.searchJob.count({where:{status:{in:["QUEUED","RUNNING"]}}}),
    db.task.count({where:{status:{in:["TODO","IN_PROGRESS"]}}}),
    isBackofficeOnly ? Promise.resolve(0) : db.campaign.count(),
  ]);

  const stats = isBackofficeOnly
    ? [{label:"Attività aperte",value:openTasks,detail:"Da completare"}]
    : [
      {label:"Lead totali",value:leads,detail:"Aziende nel CRM"},
      {label:"Ricerche attive",value:activeSearches,detail:"In esecuzione"},
      {label:"Attività aperte",value:openTasks,detail:"Da completare"},
      {label:"Campagne",value:campaigns,detail:"Email marketing"},
    ];

  return (
    <main className="min-h-screen bg-[#f6f7f9]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b px-6">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-600 text-lg font-black text-white">F</div>
          <div><div className="font-bold tracking-tight text-slate-900">FleurCRM</div><div className="text-[11px] font-medium uppercase tracking-widest text-slate-400">Lavanolo</div></div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Workspace</div>
          {nav.filter(item=>!isBackofficeOnly || ["/dashboard","/tasks"].includes(item.href)).map(item=>(
            <Link key={item.href} href={item.href} className={item.href==="/dashboard" ? "flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-700" : "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"}>
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-base">{item.icon}</span>{item.label}
            </Link>
          ))}
          {!isBackofficeOnly && user.role==="ADMIN" && <Link href="/admin/users" className="mt-6 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100">⚙</span>Amministrazione</Link>}
        </nav>
        <div className="border-t p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{user.name.slice(0,2).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{user.name}</div><div className="text-xs text-slate-500">{user.role}</div></div>
            <form action="/api/auth/logout" method="post"><button aria-label="Esci" className="text-slate-400 hover:text-slate-900">↪</button></form>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-sm font-black text-white">F</div>
          <span className="font-bold tracking-tight">FleurCRM</span>
          <span className="ml-auto text-xs font-medium text-slate-400">{user.role}</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden">
          {nav.filter(item=>!isBackofficeOnly || ["/dashboard","/tasks"].includes(item.href)).map(item=><Link key={item.href} href={item.href} className={item.href==="/dashboard" ? "shrink-0 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700" : "shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"}>{item.icon} <span className="ml-1">{item.label}</span></Link>)}
        </nav>
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-8">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Workspace</p><h1 className="text-xl font-bold tracking-tight text-slate-900">Dashboard</h1></div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 md:block">⌕ &nbsp; Cerca nel CRM</div>
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500">♧</div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-5 md:p-8">
          <section className="mb-8 rounded-3xl bg-slate-950 p-7 text-white shadow-xl shadow-slate-200 md:p-9">
            <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
              <div><span className="inline-flex rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">Operativo</span><h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Buongiorno, {user.name.split(" ")[0]}.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">{isBackofficeOnly ? "Tieni sotto controllo le attività del back office." : "Tutto ciò che serve per acquisire, gestire e convertire i tuoi lead."}</p></div>
              {!isBackofficeOnly && <Link href="/companies" className="inline-flex w-fit items-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 transition hover:bg-emerald-50">Apri CRM <span className="ml-2">→</span></Link>}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(s=><div key={s.label} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between"><span className="text-sm font-medium text-slate-500">{s.label}</span><span className="h-2.5 w-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-50"/></div>
              <div className="mt-5 text-3xl font-bold tracking-tight text-slate-900">{s.value}</div><div className="mt-1 text-xs text-slate-400">{s.detail}</div>
            </div>)}
          </section>

          <section className="mt-8 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Azioni rapide</h3><p className="mt-1 text-sm text-slate-500">Vai direttamente alle operazioni più usate.</p></div><span className="text-xl">↗</span></div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {!isBackofficeOnly && <Link href="/companies" className="rounded-xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/40"><div className="text-lg">▦</div><div className="mt-3 font-semibold">Gestisci aziende</div><div className="mt-1 text-xs text-slate-500">Visualizza e filtra il database</div></Link>}
                {!isBackofficeOnly && <Link href="/leads" className="rounded-xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/40"><div className="text-lg">⌕</div><div className="mt-3 font-semibold">Nuova ricerca lead</div><div className="mt-1 text-xs text-slate-500">Avvia una ricerca persistente</div></Link>}
                <Link href="/tasks" className="rounded-xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/40"><div className="text-lg">✓</div><div className="mt-3 font-semibold">Gestisci attività</div><div className="mt-1 text-xs text-slate-500">Scadenze, priorità e assegnazioni</div></Link>
                {!isBackofficeOnly && <Link href="/marketing" className="rounded-xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/40"><div className="text-lg">✉</div><div className="mt-3 font-semibold">Email marketing</div><div className="mt-1 text-xs text-slate-500">Campagne e segmenti</div></Link>}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold">Stato operativo</h3><p className="mt-1 text-sm text-slate-500">Una sintesi del lavoro corrente.</p>
              <div className="mt-6 space-y-5">
                <div><div className="mb-2 flex justify-between text-xs"><span className="font-medium">Attività aperte</span><span className="text-slate-400">{openTasks}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 w-2/3 rounded-full bg-emerald-500"/></div></div>
                {!isBackofficeOnly && <div><div className="mb-2 flex justify-between text-xs"><span className="font-medium">Ricerche</span><span className="text-slate-400">{activeSearches} attive</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 w-1/2 rounded-full bg-violet-500"/></div></div>}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
