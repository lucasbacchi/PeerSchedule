import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { useAuthUser } from "@/hooks/useAuthUser";
import { type CalendarRecord, type EventRecord, getEvents, watchCalendars } from "@/services/dataService";

export default function HomePage() {
  const { user, loading } = useAuthUser();
  const [calendars, setCalendars] = useState<CalendarRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!user) return;
    return watchCalendars(user.uid, (items) => {
      setCalendars(items);
      void Promise.all(items.map((calendar) => getEvents(calendar.id))).then((groups) => setEvents(groups.flat())).catch((reason: Error) => setError(reason.message));
    }, (reason) => setError(reason.message));
  }, [user]);
  if (loading) return <main className="p-10 text-center">Loading…</main>;
  if (!user) return <Navigate to="/" replace />;
  const upcoming = events.filter((event) => new Date(`${event.date}T${event.start}`) >= new Date()).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)).slice(0, 6);
  return <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
    <title>Home | PeerSchedule</title>
    <div className="flex justify-between items-end"><div><h1 className="text-3xl font-bold">Welcome, {user.displayName?.split(" ")[0] ?? "there"}</h1><p className="text-slate-600">Coordinate plans and find time together.</p></div><Link to="/calendars" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold">New calendar</Link></div>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <section><h2 className="text-xl font-bold mb-3">Your calendars</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{calendars.map((calendar) => <Link key={calendar.id} to={`/calendars/${calendar.id}`} className="bg-white border rounded-xl p-4 hover:border-blue-500"><strong>{calendar.name}</strong><p className="text-sm text-slate-500">{calendar.description || "Shared schedule"}</p></Link>)}{!calendars.length && <Link to="/calendars" className="bg-white border border-dashed rounded-xl p-4 text-blue-600">Create your first calendar →</Link>}</div></section>
    <section><h2 className="text-xl font-bold mb-3">Upcoming events</h2><div className="bg-white border rounded-xl divide-y">{upcoming.map((event) => <Link key={event.id} to={`/calendars/${event.calendarId}`} className="flex justify-between p-4 hover:bg-slate-50"><span>{event.title}</span><time className="text-slate-500">{event.date} · {event.start}</time></Link>)}{!upcoming.length && <p className="p-5 text-slate-500">Nothing scheduled yet.</p>}</div></section>
  </main>;
}
