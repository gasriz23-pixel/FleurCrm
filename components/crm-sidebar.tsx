"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/companies", label: "Aziende", icon: "building" },
  { href: "/leads", label: "Ricerca lead", icon: "search" },
  { href: "/tasks", label: "Attività", icon: "check" },
  { href: "/marketing", label: "Marketing", icon: "mail" },
];

function Icon({name}:{name:string}) {
  const common={fill:"none",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round" as const,strokeLinejoin:"round" as const};
  if(name==="building") return <svg viewBox="0 0 24 24" className="h-5 w-5" {...common}><path d="M4 21V5l8-2 8 2v16"/><path d="M9 21v-4h6v4M8 8h1m6 0h1m-7 4h1m6 0h1"/></svg>;
  if(name==="search") return <svg viewBox="0 0 24 24" className="h-5 w-5" {...common}><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>;
  if(name==="check") return <svg viewBox="0 0 24 24" className="h-5 w-5" {...common}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16 9"/></svg>;
  if(name==="mail") return <svg viewBox="0 0 24 24" className="h-5 w-5" {...common}><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>;
  return <svg viewBox="0 0 24 24" className="h-5 w-5" {...common}><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>;
}

export default function CrmSidebar(){
 const pathname=usePathname();
 return <>
  <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-800 bg-slate-950 text-white md:flex md:flex-col">
   <div className="border-b border-white/10 px-6 py-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 font-black text-slate-950">F</div><div><div className="font-bold tracking-tight">FleurCRM</div><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-slate-500">Lavanolo</div></div></div></div>
   <div className="px-5 pt-7 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Workspace</div>
   <nav className="mt-3 flex-1 space-y-1 px-3">{items.map(item=>{const active=pathname===item.href;return <Link key={item.href} href={item.href} className={"group flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition "+(active?"bg-emerald-400 font-bold text-slate-950 shadow-lg shadow-emerald-950/30":"font-medium text-slate-400 hover:bg-white/5 hover:text-white")}><span className={"grid h-9 w-9 place-items-center rounded-lg "+(active?"bg-slate-950/10":"bg-white/5")}><Icon name={item.icon}/></span>{item.label}</Link>})}</nav>
   <div className="border-t border-white/10 p-5"><div className="rounded-xl bg-white/5 p-3"><div className="text-xs font-semibold text-white">Workspace operativo</div><div className="mt-1 text-[11px] text-slate-500">CRM · Lavanolo</div></div></div>
  </aside>
  <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden"><div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 font-black text-white">F</div><div className="min-w-0 flex-1"><div className="font-bold">FleurCRM</div><div className="text-[10px] uppercase tracking-widest text-slate-400">Lavanolo</div></div><Link href="/dashboard" className="text-xs font-semibold text-slate-500">Home</Link></div>
 </>;
}
