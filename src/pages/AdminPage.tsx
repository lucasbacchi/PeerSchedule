import { useCallback, useEffect, useState } from "react";

import Modal from "@/components/common/Modal";
import PageState from "@/components/common/PageState";
import { useRequireAuth } from "@/hooks/useAuth";
import { deleteCalendar, getAllCalendars } from "@/services/calendarService";
import { deleteEvent, getAllEvents } from "@/services/calendarEventService";
import { getAllUsers, getUserById } from "@/services/userService";
import type { CalendarEvent, Group, User } from "@/types/database";

interface DeleteTarget {
    type: "calendar" | "event";
    id: string;
    name: string;
}

export default function AdminPage() {
    const { user, isLoading: isAuthLoading } = useRequireAuth();
    const [profile, setProfile] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [calendars, setCalendars] = useState<Group[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isWorking, setIsWorking] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

    const loadAdminData = useCallback(async (): Promise<void> => {
        if (!user) return;
        try {
            setIsLoading(true);
            setErrorMessage(null);
            const currentProfile = await getUserById(user.uid);
            setProfile(currentProfile);

            if (currentProfile?.role !== "admin") {
                return;
            }

            const [nextUsers, nextCalendars, nextEvents] = await Promise.all([
                getAllUsers(),
                getAllCalendars(),
                getAllEvents(),
            ]);
            setUsers(nextUsers);
            setCalendars(nextCalendars);
            setEvents(nextEvents);
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : "Unable to load the admin dashboard.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadAdminData();
    }, [loadAdminData]);

    const confirmDelete = (): void => {
        if (!deleteTarget) return;
        void (async () => {
            try {
                setIsWorking(true);
                setErrorMessage(null);
                if (deleteTarget.type === "calendar") {
                    await deleteCalendar(deleteTarget.id);
                } else {
                    await deleteEvent(deleteTarget.id);
                }
                setMessage(`${deleteTarget.type === "calendar" ? "Calendar" : "Event"} deleted.`);
                setDeleteTarget(null);
                await loadAdminData();
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to delete the selected item.");
            } finally {
                setIsWorking(false);
            }
        })();
    };

    if (isAuthLoading || (user && isLoading)) {
        return <PageState title="Loading admin dashboard" />;
    }
    if (!user) return null;
    if (profile?.role !== "admin") {
        return (
            <PageState
                title="Administrator access required"
                message="Your account does not have permission to view this page."
                tone="error"
            />
        );
    }

    return (
        <main className="min-h-[calc(100dvh-4rem)] bg-slate-50">
            <title>Admin | PeerSchedule</title>
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Protected administration</p>
                <h1 className="mt-1 text-3xl font-black text-slate-950">Admin dashboard</h1>
                <p className="mt-2 text-slate-600">
                    Review application records and remove invalid calendars or events.
                </p>

                {message ? (
                    <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
                        {message}
                    </div>
                ) : null}
                {errorMessage ? (
                    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                        {errorMessage}
                    </div>
                ) : null}

                <section className="mt-8 grid gap-4 sm:grid-cols-3">
                    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="font-bold text-slate-500">Users</p>
                        <p className="mt-2 text-4xl font-black text-slate-950">{users.length}</p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="font-bold text-slate-500">Calendars</p>
                        <p className="mt-2 text-4xl font-black text-slate-950">{calendars.length}</p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <p className="font-bold text-slate-500">Events</p>
                        <p className="mt-2 text-4xl font-black text-slate-950">{events.length}</p>
                    </article>
                </section>

                <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 p-5">
                        <h2 className="text-xl font-black text-slate-950">Users</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-5 py-3">Name</th>
                                    <th className="px-5 py-3">Email</th>
                                    <th className="px-5 py-3">Role</th>
                                    <th className="px-5 py-3">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((listedUser) => (
                                    <tr key={listedUser.uid}>
                                        <td className="px-5 py-3 font-bold text-slate-900">{listedUser.displayName}</td>
                                        <td className="px-5 py-3 text-slate-600">{listedUser.email}</td>
                                        <td className="px-5 py-3 capitalize text-slate-600">{listedUser.role}</td>
                                        <td className="px-5 py-3 text-slate-600">
                                            {listedUser.createdAt.toDate().toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-xl font-black text-slate-950">Calendars</h2>
                        <div className="mt-4 space-y-3">
                            {calendars.map((calendar) => (
                                <article
                                    key={calendar.id}
                                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                                >
                                    <div className="min-w-0">
                                        <h3 className="truncate font-bold text-slate-900">{calendar.name}</h3>
                                        <p className="text-sm text-slate-500">
                                            {calendar.memberIds.length} members · Owner {calendar.ownerId}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDeleteTarget({ type: "calendar", id: calendar.id, name: calendar.name })
                                        }
                                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                                    >
                                        Delete
                                    </button>
                                </article>
                            ))}
                        </div>
                    </section>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-xl font-black text-slate-950">Recent events</h2>
                        <div className="mt-4 space-y-3">
                            {events
                                .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
                                .slice(0, 25)
                                .map((event) => (
                                    <article
                                        key={event.id}
                                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                                    >
                                        <div className="min-w-0">
                                            <h3 className="truncate font-bold text-slate-900">{event.title}</h3>
                                            <p className="text-sm text-slate-500">
                                                {event.startTime.toDate().toLocaleString()} · {event.type}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setDeleteTarget({ type: "event", id: event.id, name: event.title })
                                            }
                                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                                        >
                                            Delete
                                        </button>
                                    </article>
                                ))}
                        </div>
                    </section>
                </div>
            </div>

            <Modal
                title="Confirm deletion"
                isOpen={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                size="sm"
                closeDisabled={isWorking}
            >
                <p className="text-slate-600">
                    Permanently delete <strong>{deleteTarget?.name}</strong>?
                </p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => setDeleteTarget(null)}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={confirmDelete}
                        disabled={isWorking}
                        className="rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        {isWorking ? "Deleting..." : "Delete"}
                    </button>
                </div>
            </Modal>
        </main>
    );
}
