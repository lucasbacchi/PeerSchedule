import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { type StoredCalendar, scheduleStore } from "@/lib/localStore";

export default function MainPage() {
    const navigate = useNavigate();
    const [calendars, setCalendars] = useState<StoredCalendar[]>(scheduleStore.calendars);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    function createCalendar(event: React.FormEvent) {
        event.preventDefault();
        if (!name.trim()) return;
        const calendar = { id: scheduleStore.id(), name: name.trim(), description: description.trim() };
        const next = [...calendars, calendar];
        scheduleStore.saveCalendars(next);
        setCalendars(next);
        void navigate(`/calendars/${calendar.id}`);
    }

    function removeCalendar(id: string) {
        if (!confirm("Delete this calendar and its events?")) return;
        const next = calendars.filter((calendar) => calendar.id !== id);
        scheduleStore.saveCalendars(next);
        scheduleStore.saveEvents(scheduleStore.events().filter((item) => item.calendarId !== id));
        setCalendars(next);
    }

    return (
        <main className="max-w-5xl mx-auto px-6 py-10">
            <div className="space-y-6">
                <title>Choose | PeerSchedule</title>
                <div>
                    <h1 className="text-3xl font-bold">Your calendars</h1>
                    <p className="text-slate-600 mt-1">Create a shared calendar or open one you already use.</p>
                </div>
                <form onSubmit={createCalendar} className="bg-white border rounded-2xl p-5 grid md:grid-cols-[1fr_1.5fr_auto] gap-3">
                    <input aria-label="Calendar name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Calendar name" className="border rounded-lg px-3 py-2" />
                    <input aria-label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this calendar for?" className="border rounded-lg px-3 py-2" />
                    <button className="bg-blue-600 text-white rounded-lg px-5 py-2 font-semibold">Create</button>
                </form>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {calendars.map((calendar) => (
                        <article key={calendar.id} className="bg-white border rounded-2xl p-5">
                            <h2 className="font-bold text-lg">{calendar.name}</h2>
                            <p className="text-sm text-slate-600 min-h-10 mt-1">{calendar.description || "Shared schedule"}</p>
                            <div className="flex gap-2 mt-4">
                                <Link to={`/calendars/${calendar.id}`} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm">Open</Link>
                                <button onClick={() => removeCalendar(calendar.id)} className="border text-red-600 rounded-lg px-4 py-2 text-sm">Delete</button>
                            </div>
                        </article>
                    ))}
                </div>
                {!calendars.length && <p className="text-center text-slate-500 py-10">No calendars yet. Create your first one above.</p>}
            </div>
        </main>
    )
}
