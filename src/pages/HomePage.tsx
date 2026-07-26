import { Link } from "react-router";
import { scheduleStore } from "@/lib/localStore";

export default function MainPage() {
    const calendars = scheduleStore.calendars();
    const events = scheduleStore.events()
        .filter((event) => new Date(`${event.date}T${event.start}`) >= new Date())
        .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))
        .slice(0, 5);
    return (
        <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
            <title>Home | PeerSchedule</title>
            <div className="flex justify-between items-end">
                <div><h1 className="text-3xl font-bold">Welcome to PeerSchedule</h1><p className="text-slate-600 mt-1">Coordinate plans and find time together.</p></div>
                <Link to="/calendars" className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold">New calendar</Link>
            </div>
            <section><h2 className="text-xl font-bold mb-3">Your calendars</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {calendars.map((calendar) => <Link key={calendar.id} to={`/calendars/${calendar.id}`} className="bg-white border rounded-xl p-4 hover:border-blue-500"><strong>{calendar.name}</strong><p className="text-sm text-slate-500">{calendar.description || "Shared schedule"}</p></Link>)}
                    {!calendars.length && <Link to="/calendars" className="bg-white border border-dashed rounded-xl p-4 text-blue-600">Create your first calendar →</Link>}
                </div>
            </section>
            <section><h2 className="text-xl font-bold mb-3">Upcoming events</h2>
                <div className="bg-white border rounded-xl divide-y">
                    {events.map((event) => <Link key={event.id} to={`/calendars/${event.calendarId}`} className="flex justify-between p-4 hover:bg-slate-50"><span>{event.title}</span><time className="text-slate-500">{event.date} · {event.start}</time></Link>)}
                    {!events.length && <p className="p-5 text-slate-500">Nothing scheduled yet.</p>}
                </div>
            </section>
        </main>
    )
}
