"use client";

import { useEffect, useMemo, useState } from "react";

type User = { id: string; name: string; role: string };
type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueAt?: string | null;
  assignee?: User | null;
  company?: { id: string; name: string } | null;
};

const statuses = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"];
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueAt, setDueAt] = useState("");
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [tasksResponse, usersResponse] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/users", { cache: "no-store" }),
      ]);
      if (!tasksResponse.ok) throw new Error("Impossibile caricare le attività");
      setTasks(await tasksResponse.json());
      if (usersResponse.ok) setUsers(await usersResponse.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore di caricamento");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createTask() {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          assigneeId: assigneeId || null,
          priority,
          dueAt: dueAt || null,
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Impossibile creare l'attività");
      }
      setTitle("");
      setDescription("");
      setAssigneeId("");
      setPriority("MEDIUM");
      setDueAt("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore di salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function update(id: string, data: Record<string, unknown>) {
    setError("");
    const response = await fetch("/api/tasks/" + id, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Impossibile aggiornare l'attività");
      return;
    }
    await load();
  }

  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (statusFilter === "OPEN") return task.status === "TODO" || task.status === "IN_PROGRESS";
        if (statusFilter === "ALL") return true;
        return task.status === statusFilter;
      }),
    [tasks, statusFilter],
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <a href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900">← Dashboard</a>
            <h1 className="mt-2 text-3xl font-bold">Attività</h1>
            <p className="mt-2 text-slate-500">Attività condivise tra amministrazione, commerciale e back office.</p>
          </div>
          <button
            onClick={() => void load()}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Aggiorna
          </button>
        </div>

        <section className="mt-8 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold">Nuova attività</h2>
            <p className="mt-1 text-sm text-slate-500">Assegna una scadenza e una priorità per rendere il lavoro operativo tracciabile.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-6">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void createTask(); }}
              placeholder="Titolo attività"
              className="rounded-lg border p-2 md:col-span-2"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nota / descrizione"
              className="rounded-lg border p-2 md:col-span-2"
            />
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="rounded-lg border p-2">
              <option value="">Non assegnata</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-lg border p-2">
              {priorities.map((value) => <option key={value}>{value}</option>)}
            </select>
            <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="rounded-lg border p-2 md:col-span-2" />
            <button
              onClick={() => void createTask()}
              disabled={!title.trim() || saving}
              className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 md:col-span-4"
            >
              {saving ? "Salvataggio…" : "Crea attività"}
            </button>
          </div>
          {error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </section>

        <section className="mt-6 rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Elenco attività</h2>
              <p className="text-sm text-slate-500">{visibleTasks.length} attività visualizzate</p>
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border p-2 text-sm">
              <option value="OPEN">Aperte</option>
              <option value="ALL">Tutte</option>
              <option value="TODO">Da fare</option>
              <option value="IN_PROGRESS">In corso</option>
              <option value="DONE">Completate</option>
              <option value="CANCELLED">Annullate</option>
            </select>
          </div>

          {loading && <div className="p-8 text-center text-slate-500">Caricamento…</div>}
          {!loading && visibleTasks.map((task) => (
            <div key={task.id} className="grid gap-3 border-b p-5 last:border-0 md:grid-cols-6">
              <div className="md:col-span-2">
                <div className="font-medium">{task.title}</div>
                {task.description && <div className="mt-1 text-sm text-slate-600">{task.description}</div>}
                <div className="mt-2 text-xs text-slate-500">
                  {task.company?.name || "Nessun lead collegato"}
                  {task.dueAt ? " · Scadenza " + new Date(task.dueAt).toLocaleString("it-IT") : ""}
                </div>
              </div>
              <select
                value={task.assignee?.id || ""}
                onChange={(e) => void update(task.id, { assigneeId: e.target.value || null })}
                className="rounded border p-2"
                aria-label={"Assegnatario di " + task.title}
              >
                <option value="">Non assegnata</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
              <select
                value={task.priority}
                onChange={(e) => void update(task.id, { priority: e.target.value })}
                className="rounded border p-2"
                aria-label={"Priorità di " + task.title}
              >
                {priorities.map((value) => <option key={value}>{value}</option>)}
              </select>
              <select
                value={task.status}
                onChange={(e) => void update(task.id, { status: e.target.value })}
                className="rounded border p-2"
                aria-label={"Stato di " + task.title}
              >
                {statuses.map((value) => <option key={value}>{value}</option>)}
              </select>
              <div className="flex items-center justify-end">
                {task.priority === "URGENT" && <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">URGENTE</span>}
              </div>
            </div>
          ))}
          {!loading && !visibleTasks.length && <div className="p-8 text-center text-slate-500">Nessuna attività in questa vista.</div>}
        </section>
      </div>
    </main>
  );
}
