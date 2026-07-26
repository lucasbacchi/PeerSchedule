import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { useAuthUser } from "@/hooks/useAuthUser";
import { type CalendarRecord, type EventRecord, type UserRecord, addCalendarMember, deleteEvent, getCalendar, getFriends, saveEvent, watchEvents } from "@/services/dataService";

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function key(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const { calendarId = "" } = useParams();
  const { user, loading: authLoading } = useAuthUser();
  const [calendar, setCalendar] = useState<CalendarRecord | null>();
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState(key(new Date()));
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [editing, setEditing] = useState<EventRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [error, setError] = useState("");
  const [friends, setFriends] = useState<UserRecord[]>([]);
  const days = useMemo(() => monthDays(month), [month]);

  useEffect(() => {
    if (!user || !calendarId) return;
    void getCalendar(calendarId).then(setCalendar).catch((reason: Error) => setError(reason.message));
    void getFriends(user.uid).then(setFriends).catch((reason: Error) => setError(reason.message));
    return watchEvents(calendarId, setEvents, (reason) => setError(reason.message));
  }, [calendarId, user]);

  function openForm(event?: EventRecord) {
    setEditing(event ?? null);
    setTitle(event?.title ?? "");
    setStart(event?.start ?? "09:00");
    setEnd(event?.end ?? "10:00");
    if (event) setSelected(event.date);
    setShowForm(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !title.trim()) return;
    try {
      setError("");
      await saveEvent(user.uid, { id: editing?.id, calendarId, title: title.trim(), date: selected, start, end });
      setShowForm(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save event."); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this event?")) return;
    try { await deleteEvent(id); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete event."); }
  }
  async function addMember(uid: string) {
    if (!calendar) return;
    try {
      await addCalendarMember(calendar.id, uid);
      setCalendar({ ...calendar, memberIds: [...calendar.memberIds, uid] });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add member."); }
  }

  if (authLoading) return <main className="p-10 text-center">Loading…</main>;
  if (!user) return <Navigate to="/" replace />;
  if (calendar === undefined) return <main className="p-10 text-center">Loading calendar…</main>;
  if (!calendar) return <main className="max-w-xl mx-auto py-20 text-center"><h1 className="text-2xl font-bold">Calendar not found</h1><Link to="/calendars" className="text-blue-600">Return to calendars</Link></main>;

  const selectedEvents = events.filter((event) => event.date === selected).sort((a, b) => a.start.localeCompare(b.start));
  return (
    <main className="max-w-7xl mx-auto p-6">
      <title>{calendar.name} | PeerSchedule</title>
      {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div><h1 className="text-2xl font-bold">{calendar.name}</h1><p className="text-slate-500">{calendar.description}</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))} className="border rounded-lg px-3 py-2" aria-label="Previous month">‹</button>
          <strong className="w-40 text-center">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))} className="border rounded-lg px-3 py-2" aria-label="Next month">›</button>
          <button onClick={() => openForm()} className="bg-blue-600 text-white rounded-lg px-4 py-2">Add event</button>
        </div>
      </div>
      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        <section className="bg-white border rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-100">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day) => <div key={day} className="text-center text-xs font-semibold p-2">{day}</div>)}</div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const date = key(day); const count = events.filter((event) => event.date === date).length;
              return <button key={date} onClick={() => setSelected(date)} className={`min-h-24 border-t border-r p-2 text-left align-top ${selected === date ? "bg-blue-50 ring-2 ring-inset ring-blue-500" : ""} ${day.getMonth() !== month.getMonth() ? "text-slate-400 bg-slate-50" : ""}`}><span className="text-sm">{day.getDate()}</span>{count > 0 && <span className="block mt-2 text-xs bg-blue-600 text-white rounded px-2 py-1">{count} event{count === 1 ? "" : "s"}</span>}</button>;
            })}
          </div>
        </section>
        <aside className="bg-white border rounded-xl p-4">
          <h2 className="font-bold">{new Date(`${selected}T12:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h2>
          <div className="divide-y mt-3">
            {selectedEvents.map((event) => <div key={event.id} className="py-3"><button onClick={() => openForm(event)} className="font-semibold text-left hover:text-blue-600">{event.title}</button><p className="text-sm text-slate-500">{event.start}–{event.end}</p><button onClick={() => void remove(event.id)} className="text-xs text-red-600 mt-1">Delete</button></div>)}
            {!selectedEvents.length && <p className="text-slate-500 py-5">No events this day.</p>}
          </div>
          <div className="border-t mt-4 pt-4">
            <h3 className="font-bold text-sm">Add friends</h3>
            <p className="text-xs text-slate-500 mb-2">{calendar.memberIds.length} calendar members</p>
            {friends.filter((friend) => !calendar.memberIds.includes(friend.id)).map((friend) => <div key={friend.id} className="flex items-center justify-between gap-2 py-2"><span className="text-sm truncate">{friend.displayName}</span><button onClick={() => void addMember(friend.id)} className="text-xs bg-blue-600 text-white rounded px-2 py-1">Add</button></div>)}
            {!friends.length && <Link to="/friends" className="text-xs text-blue-600">Add friends to PeerSchedule first</Link>}
          </div>
        </aside>
      </div>
      {showForm && <div className="fixed inset-0 bg-black/40 grid place-items-center z-50"><form onSubmit={(event) => void save(event)} className="bg-white rounded-2xl p-6 w-[min(420px,calc(100%-2rem))] space-y-4"><h2 className="text-xl font-bold">{editing ? "Edit event" : "Add event"}</h2><label className="block text-sm font-semibold">Title<input required value={title} onChange={(e) => setTitle(e.target.value)} className="block w-full border rounded-lg px-3 py-2 mt-1" /></label><label className="block text-sm font-semibold">Date<input type="date" required value={selected} onChange={(e) => setSelected(e.target.value)} className="block w-full border rounded-lg px-3 py-2 mt-1" /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Start<input type="time" required value={start} onChange={(e) => setStart(e.target.value)} className="block w-full border rounded-lg px-3 py-2 mt-1" /></label><label className="text-sm font-semibold">End<input type="time" required min={start} value={end} onChange={(e) => setEnd(e.target.value)} className="block w-full border rounded-lg px-3 py-2 mt-1" /></label></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="border rounded-lg px-4 py-2">Cancel</button><button className="bg-blue-600 text-white rounded-lg px-4 py-2">Save</button></div></form></div>}
    </main>
  );
}
