import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import PageState from "@/components/common/PageState";
import { useRequireAuth } from "@/hooks/useAuth";
import { getUserCalendars } from "@/services/calendarService";
import { getUserEvents } from "@/services/calendarEventService";
import type { CalendarEvent, Group } from "@/types/database";

export default function PlansPage() {
    const { user, isLoading: isAuthLoading } = useRequireAuth();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentTime] = useState(() => Date.now());
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadDashboard = useCallback(async (): Promise<void> => {
        if (!user) return;
        try {
            setIsLoading(true);
            setErrorMessage(null);
            const [nextEvents, nextGroups] = await Promise.all([getUserEvents(user.uid), getUserCalendars(user.uid)]);
            setEvents(nextEvents);
            setGroups(nextGroups);
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : "Unable to load your plans.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    const upcomingEvents = useMemo(
        () => events.filter((event) => event.endTime.toMillis() >= currentTime).slice(0, 8),
        [currentTime, events]
    );
    const invitations = useMemo(
        () =>
            user
                ? upcomingEvents.filter(
                      (event) => event.creatorId !== user.uid && event.participants[user.uid] === "pending"
                  )
                : [],
        [upcomingEvents, user]
    );
    const groupMap = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);

    if (isAuthLoading || (user && isLoading)) {
        return <PageState title="Loading plans" message="Finding your upcoming plans and invitations..." />;
    }
    if (!user) return null;

    return (
        <main className="min-h-[calc(100dvh-4rem)] bg-slate-50">
            <title>Plans | PeerSchedule</title>
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <section className="rounded-3xl bg-gradient-to-br from-blue-700 to-blue-500 p-7 text-white shadow-lg sm:p-10">
                    <p className="text-sm font-bold uppercase tracking-wide text-blue-100">Plan together</p>
                    <h1 className="mt-2 text-3xl font-black sm:text-5xl">Turn shared free time into a plan.</h1>
                    <p className="mt-4 max-w-2xl text-blue-50">
                        Choose a group, compare availability, and send a time that works without exposing private event
                        details.
                    </p>
                    <div className="mt-7 flex flex-wrap gap-3">
                        <Link
                            to="/groups"
                            className="rounded-xl bg-white px-5 py-3 font-black text-blue-700 hover:bg-blue-50"
                        >
                            Find a time
                        </Link>
                        <Link
                            to="/groups"
                            className="rounded-xl border border-blue-200 px-5 py-3 font-bold text-white hover:bg-blue-600"
                        >
                            View groups
                        </Link>
                    </div>
                </section>

                {errorMessage ? (
                    <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                        {errorMessage}
                    </p>
                ) : null}

                <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-xl font-black text-slate-950">Coming up</h2>
                        {upcomingEvents.length === 0 ? (
                            <div className="py-12 text-center">
                                <p className="font-bold text-slate-700">Nothing planned yet.</p>
                                <p className="mt-1 text-sm text-slate-500">Open a group to find a time together.</p>
                            </div>
                        ) : (
                            <div className="mt-4 divide-y divide-slate-100">
                                {upcomingEvents.map((event) => (
                                    <Link
                                        key={event.id}
                                        to={event.calendarId ? `/groups/${event.calendarId}` : "/groups"}
                                        className="flex items-center justify-between gap-4 py-4 hover:text-blue-700"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-bold">{event.title}</p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                {event.calendarId
                                                    ? (groupMap.get(event.calendarId)?.name ?? "Shared group")
                                                    : "Personal"}
                                            </p>
                                        </div>
                                        <time className="shrink-0 text-right text-sm font-semibold text-slate-600">
                                            {event.startTime
                                                .toDate()
                                                .toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                                        </time>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    <aside className="space-y-6">
                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-lg font-black text-slate-950">Needs your response</h2>
                            {invitations.length === 0 ? (
                                <p className="mt-3 text-sm text-slate-500">No unanswered invitations.</p>
                            ) : (
                                <div className="mt-3 space-y-3">
                                    {invitations.map((event) => (
                                        <Link
                                            key={event.id}
                                            to={event.calendarId ? `/groups/${event.calendarId}` : "/groups"}
                                            className="block rounded-xl border border-amber-200 bg-amber-50 p-3"
                                        >
                                            <p className="font-bold text-amber-950">{event.title}</p>
                                            <p className="mt-1 text-xs text-amber-800">
                                                {event.startTime.toDate().toLocaleString()}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-lg font-black text-slate-950">Your groups</h2>
                            <p className="mt-2 text-3xl font-black text-blue-700">{groups.length}</p>
                            <Link to="/groups" className="mt-3 inline-flex text-sm font-bold text-blue-700">
                                Manage groups →
                            </Link>
                        </section>
                    </aside>
                </div>
            </div>
        </main>
    );
}
