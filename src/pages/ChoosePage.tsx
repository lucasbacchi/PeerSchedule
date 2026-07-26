import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuthUser } from "@/hooks/useAuthUser";
import { type CalendarRecord, createCalendar, deleteCalendar, watchCalendars } from "@/services/dataService";

export default function ChoosePage() {
  const { user, loading: authLoading } = useAuthUser();
  const navigate = useNavigate();
  const [calendars, setCalendars] = useState<CalendarRecord[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    return watchCalendars(user.uid, setCalendars, (reason) => setError(reason.message));
  }, [user]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !name.trim()) return;
    try {
      setBusy(true); setError("");
      const result = await createCalendar(user.uid, name.trim(), description.trim());
      void navigate(`/calendars/${result.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create calendar."); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!confirm("Delete this calendar? Events must be deleted separately.")) return;
    try { await deleteCalendar(id); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete calendar."); }
  }

  if (authLoading) return <main className="p-10 text-center">Loading…</main>;
  if (!user) return <Navigate to="/" replace />;
  return <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">
    <title>Calendars | PeerSchedule</title>
    <div><h1 className="text-3xl font-bold">Your calendars</h1><p className="text-slate-600">Create a shared calendar or open an existing one.</p></div>
    <form onSubmit={(event) => void create(event)} className="bg-white border rounded-2xl p-5 grid md:grid-cols-[1fr_1.5fr_auto] gap-3">
      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Calendar name" className="border rounded-lg px-3 py-2" />
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is it for?" className="border rounded-lg px-3 py-2" />
      <button disabled={busy} className="bg-blue-600 text-white rounded-lg px-5 py-2 font-semibold disabled:opacity-50">{busy ? "Creating…" : "Create"}</button>
    </form>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {calendars.map((calendar) => <article key={calendar.id} className="bg-white border rounded-2xl p-5"><h2 className="font-bold text-lg">{calendar.name}</h2><p className="text-sm text-slate-600 min-h-10">{calendar.description || "Shared schedule"}</p><p className="text-xs text-slate-500">{calendar.memberIds.length} member{calendar.memberIds.length === 1 ? "" : "s"}</p><div className="flex gap-2 mt-4"><Link to={`/calendars/${calendar.id}`} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm">Open</Link>{calendar.ownerId === user.uid && <button onClick={() => void remove(calendar.id)} className="border text-red-600 rounded-lg px-4 py-2 text-sm">Delete</button>}</div></article>)}
    </div>
    {!calendars.length && <p className="text-center text-slate-500 py-10">No calendars yet.</p>}
  </main>;
}
