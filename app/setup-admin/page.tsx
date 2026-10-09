"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function SetupAdminPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("key") ?? "");
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!token) { setError("Il link di configurazione non contiene la chiave."); return; }
    if (password.length < 12) { setError("Scegli una password di almeno 12 caratteri."); return; }
    if (password !== confirm) { setError("Le password non coincidono."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/bootstrap-admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Impossibile configurare l'account."); setBusy(false); return; }
      router.push("/login?setup=success");
    } catch {
      setError("Impossibile raggiungere il servizio. Riprova.");
      setBusy(false);
    }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-900">
    <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 font-black text-white">F</div>
        <div><h1 className="font-bold">FleurCRM</h1><p className="text-xs text-slate-500">Configurazione account amministratore</p></div>
      </div>
      <h2 className="text-2xl font-bold">Crea la tua password</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">L'account amministratore sarà associato a gasriz23@gmail.com. Usa una password unica di almeno 12 caratteri.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">Nuova password
          <input type="password" autoComplete="new-password" required minLength={12} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500" />
        </label>
        <label className="block text-sm font-medium">Conferma password
          <input type="password" autoComplete="new-password" required minLength={12} value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500" />
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={busy || !token} className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Configurazione in corso…" : "Crea account amministratore"}</button>
      </form>
    </section>
  </main>;
}
