"use client";

import { useEffect, useState } from "react";

type User = { id: string; name: string; email: string; role: string };
const roles = ["ADMIN", "COMMERCIAL", "BACKOFFICE"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "COMMERCIAL" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    if (response.ok) setUsers(await response.json());
    else setError("Accesso riservato agli amministratori");
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function createUser() {
    setError("");
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.error || "Impossibile creare l'utente");
    setForm({ name: "", email: "", password: "", role: "COMMERCIAL" });
    await load();
  }

  async function updateUser(id: string, data: Record<string, unknown>) {
    setError("");
    const response = await fetch("/api/admin/users/" + id, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return setError(body.error || "Impossibile aggiornare l'utente");
    await load();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-5 text-slate-900 md:p-8">
      <div className="mx-auto max-w-5xl">
        <a href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900">← Dashboard</a>
        <h1 className="mt-2 text-3xl font-bold">Utenti e ruoli</h1>
        <p className="mt-2 text-slate-500">Solo gli ADMIN possono creare utenti, cambiare ruoli e reimpostare password.</p>

        <section className="mt-8 rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Nuovo utente</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input className="rounded-lg border p-2" placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="rounded-lg border p-2" placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input className="rounded-lg border p-2" placeholder="Password (min. 8)" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <select className="rounded-lg border p-2" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {roles.map(role => <option key={role}>{role}</option>)}
            </select>
          </div>
          <button onClick={() => void createUser()} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">Crea utente</button>
          {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border bg-white shadow-sm">
          {loading && <div className="p-8 text-center text-slate-500">Caricamento…</div>}
          {!loading && users.map(user => (
            <div key={user.id} className="grid gap-3 border-b p-5 last:border-0 md:grid-cols-4 md:items-center">
              <div>
                <div className="font-semibold">{user.name}</div>
                <div className="text-sm text-slate-500">{user.email}</div>
              </div>
              <select className="rounded-lg border p-2" value={user.role} onChange={e => void updateUser(user.id, { role: e.target.value })}>
                {roles.map(role => <option key={role}>{role}</option>)}
              </select>
              <input
                className="rounded-lg border p-2"
                type="password"
                placeholder="Nuova password"
                minLength={8}
                onKeyDown={e => {
                  if (e.key !== "Enter") return;
                  const value = e.currentTarget.value;
                  if (value.length >= 8) {
                    e.currentTarget.value = "";
                    void updateUser(user.id, { password: value });
                  }
                }}
              />
              <span className="text-xs text-slate-500">Invio nel campo password = reimposta</span>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
