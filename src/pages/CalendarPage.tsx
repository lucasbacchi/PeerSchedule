import { type SubmitEventHandler, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Timestamp } from "firebase/firestore";

import Modal from "@/components/common/Modal";
import PageState from "@/components/common/PageState";
import { useRequireAuth } from "@/hooks/useAuth";
import {
    addCalendarMember,
    deleteCalendar,
    getCalendarById,
    removeCalendarMember,
    updateCalendar,
} from "@/services/calendarService";
import {
    createEvent,
    deleteEvent,
    getEventsByCalendarId,
    removeParticipant,
    updateEvent,
    updateParticipantStatus,
} from "@/services/calendarEventService";
import { getFriends } from "@/services/friendService";
import { getUserByEmail, getUsersByIds } from "@/services/userService";
import type { CalendarEvent, EventType, Group, ParticipantStatus, User, Visibility } from "@/types/database";

interface EventFormState {
    title: string;
    description: string;
    location: string;
    startTime: string;
    endTime: string;
    type: EventType;
    visibility: Visibility;
    participantIds: string[];
    isRecurring: boolean;
    recurrenceRule: string;
}

interface CalendarSettingsState {
    name: string;
    description: string;
    color: string;
}

const eventTypeLabels: Record<EventType, string> = {
    meeting: "Meeting",
    open_event: "Open event",
    blocked_time: "Blocked time",
};

const visibilityLabels: Record<Visibility, string> = {
    full_details: "Full details",
    friends_only: "Friends only",
    busy_only: "Busy only",
};

const eventTypeClasses: Record<EventType, string> = {
    meeting: "border-blue-200 bg-blue-50 text-blue-800",
    open_event: "border-emerald-200 bg-emerald-50 text-emerald-800",
    blocked_time: "border-amber-200 bg-amber-50 text-amber-900",
};

const pad = (value: number): string => value.toString().padStart(2, "0");

const toDateKey = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toDateTimeLocal = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const createDefaultEventForm = (date = new Date()): EventFormState => {
    const start = new Date(date);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);

    return {
        title: "",
        description: "",
        location: "",
        startTime: toDateTimeLocal(start),
        endTime: toDateTimeLocal(end),
        type: "meeting",
        visibility: "full_details",
        participantIds: [],
        isRecurring: false,
        recurrenceRule: "FREQ=WEEKLY",
    };
};

const eventToForm = (event: CalendarEvent): EventFormState => ({
    title: event.title,
    description: event.description,
    location: event.location ?? "",
    startTime: toDateTimeLocal(event.startTime.toDate()),
    endTime: toDateTimeLocal(event.endTime.toDate()),
    type: event.type,
    visibility: event.visibility,
    participantIds: event.participantIds.filter((participantId) => participantId !== event.creatorId),
    isRecurring: event.isRecurring,
    recurrenceRule: event.recurrenceRule ?? "FREQ=WEEKLY",
});

const buildMonthDates = (month: Date): Date[] => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + index);
        return date;
    });
};

export default function CalendarPage() {
    const { calendarId } = useParams();
    const navigate = useNavigate();
    const { user, isLoading: isAuthLoading } = useRequireAuth();

    const [calendar, setCalendar] = useState<Group | null>(null);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [members, setMembers] = useState<User[]>([]);
    const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [currentTime, setCurrentTime] = useState(() => Date.now());
    const [displayMonth, setDisplayMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [isEventFormOpen, setIsEventFormOpen] = useState(false);
    const [eventForm, setEventForm] = useState<EventFormState>(() => createDefaultEventForm());
    const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCalendarDeleteConfirmOpen, setIsCalendarDeleteConfirmOpen] = useState(false);
    const [settings, setSettings] = useState<CalendarSettingsState>({ name: "", description: "", color: "#2563eb" });
    const [memberEmail, setMemberEmail] = useState("");

    const loadCalendar = useCallback(async (): Promise<void> => {
        if (!user || !calendarId) return;

        try {
            setIsLoading(true);
            setErrorMessage(null);
            const nextCalendar = await getCalendarById(calendarId);

            if (!nextCalendar) {
                throw new Error("Calendar not found or you do not have permission to access it.");
            }

            if (!nextCalendar.memberIds.includes(user.uid)) {
                throw new Error("You are not a member of this calendar.");
            }

            const [nextEvents, nextMembers, friends] = await Promise.all([
                getEventsByCalendarId(calendarId),
                getUsersByIds(nextCalendar.memberIds),
                getFriends(user.uid),
            ]);

            setCalendar(nextCalendar);
            setEvents(nextEvents);
            setMembers(nextMembers);
            setFriendIds(new Set(friends.map((friend) => friend.uid)));
            setSettings({
                name: nextCalendar.name,
                description: nextCalendar.description ?? "",
                color: nextCalendar.color ?? "#2563eb",
            });
        } catch (error: unknown) {
            console.error("Unable to load calendar:", error);
            setErrorMessage(error instanceof Error ? error.message : "Unable to load this calendar.");
        } finally {
            setIsLoading(false);
        }
    }, [calendarId, user]);

    useEffect(() => {
        void loadCalendar();
    }, [loadCalendar]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setCurrentTime(Date.now());
        }, 60_000);

        return () => window.clearInterval(intervalId);
    }, []);

    const eventsByDate = useMemo(() => {
        const grouped = new Map<string, CalendarEvent[]>();
        for (const event of events) {
            const key = toDateKey(event.startTime.toDate());
            const existing = grouped.get(key) ?? [];
            existing.push(event);
            grouped.set(key, existing);
        }
        return grouped;
    }, [events]);

    const monthDates = useMemo(() => buildMonthDates(displayMonth), [displayMonth]);
    const isOwner = calendar?.ownerId === user?.uid;
    const memberMap = useMemo(() => new Map(members.map((member) => [member.uid, member])), [members]);

    const canSeeDetails = useCallback(
        (event: CalendarEvent): boolean => {
            if (!user || !calendar) return false;
            if (isOwner || event.creatorId === user.uid || event.participantIds.includes(user.uid)) return true;
            if (event.visibility === "full_details") return true;
            if (event.detailsAvailable !== undefined) return event.detailsAvailable;
            if (event.visibility === "friends_only") return friendIds.has(event.creatorId);
            return false;
        },
        [calendar, friendIds, isOwner, user]
    );

    const visibleTitle = (event: CalendarEvent): string => (canSeeDetails(event) ? event.title : "Busy");

    const openNewEvent = (date = new Date()): void => {
        if (!user) return;
        const nextForm = createDefaultEventForm(date);
        nextForm.participantIds = members.filter((member) => member.uid !== user.uid).map((member) => member.uid);
        setEditingEvent(null);
        setEventForm(nextForm);
        setErrorMessage(null);
        setIsEventFormOpen(true);
    };

    const openEditEvent = (event: CalendarEvent): void => {
        setSelectedEvent(null);
        setEditingEvent(event);
        setEventForm(eventToForm(event));
        setErrorMessage(null);
        setIsEventFormOpen(true);
    };

    const closeEventForm = (): void => {
        if (isSaving) return;
        setIsEventFormOpen(false);
        setEditingEvent(null);
        setErrorMessage(null);
    };

    const handleEventSubmit: SubmitEventHandler<HTMLFormElement> = (submitEvent) => {
        submitEvent.preventDefault();
        void (async () => {
            if (!user || !calendarId) return;

            const startDate = new Date(eventForm.startTime);
            const endDate = new Date(eventForm.endTime);
            if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
                setErrorMessage("Enter valid start and end times.");
                return;
            }

            const participants: Record<string, ParticipantStatus> = { [user.uid]: "accepted" };
            for (const participantId of eventForm.participantIds) {
                const previousStatus = editingEvent?.participants[participantId];
                participants[participantId] = previousStatus ?? "pending";
            }

            try {
                setIsSaving(true);
                setErrorMessage(null);
                setSuccessMessage(null);

                const input = {
                    title: eventForm.title,
                    description: eventForm.description,
                    location: eventForm.location,
                    startTime: Timestamp.fromDate(startDate),
                    endTime: Timestamp.fromDate(endDate),
                    type: eventForm.type,
                    visibility: eventForm.visibility,
                    participants,
                    isRecurring: eventForm.isRecurring,
                    recurrenceRule: eventForm.isRecurring ? eventForm.recurrenceRule : undefined,
                    detailViewerIds: eventForm.visibility === "friends_only" ? [...friendIds] : [],
                };

                if (editingEvent) {
                    await updateEvent(editingEvent.id, input);
                    setSuccessMessage("Event updated successfully.");
                } else {
                    await createEvent({ ...input, calendarId, creatorId: user.uid });
                    setSuccessMessage("Event created successfully.");
                }

                closeEventForm();
                await loadCalendar();
            } catch (error: unknown) {
                console.error("Unable to save event:", error);
                setErrorMessage(error instanceof Error ? error.message : "Unable to save the event.");
            } finally {
                setIsSaving(false);
            }
        })();
    };

    const handleDeleteEvent = (): void => {
        if (!eventToDelete) return;
        void (async () => {
            try {
                setIsSaving(true);
                await deleteEvent(eventToDelete.id);
                setEventToDelete(null);
                setSelectedEvent(null);
                setSuccessMessage("Event deleted.");
                await loadCalendar();
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to delete the event.");
            } finally {
                setIsSaving(false);
            }
        })();
    };

    const handleParticipantResponse = (status: ParticipantStatus): void => {
        if (!selectedEvent || !user) return;
        void (async () => {
            try {
                setIsSaving(true);
                await updateParticipantStatus(selectedEvent.id, user.uid, status);
                await loadCalendar();
                setSelectedEvent((current) =>
                    current
                        ? {
                              ...current,
                              participants: { ...current.participants, [user.uid]: status },
                              participantIds: [...new Set([...current.participantIds, user.uid])],
                          }
                        : null
                );
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to update your response.");
            } finally {
                setIsSaving(false);
            }
        })();
    };

    const handleLeaveOpenEvent = (): void => {
        if (!selectedEvent || !user) return;
        void (async () => {
            try {
                setIsSaving(true);
                await removeParticipant(selectedEvent.id, user.uid);
                setSelectedEvent(null);
                await loadCalendar();
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to leave the event.");
            } finally {
                setIsSaving(false);
            }
        })();
    };

    const handleSettingsSubmit: SubmitEventHandler<HTMLFormElement> = (submitEvent) => {
        submitEvent.preventDefault();
        if (!calendar) return;
        void (async () => {
            try {
                setIsSaving(true);
                setErrorMessage(null);
                await updateCalendar(calendar.id, settings);
                setSuccessMessage("Calendar settings updated.");
                await loadCalendar();
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to update calendar settings.");
            } finally {
                setIsSaving(false);
            }
        })();
    };

    const handleAddMember = (): void => {
        if (!calendar || !memberEmail.trim()) return;
        void (async () => {
            try {
                setIsSaving(true);
                setErrorMessage(null);
                const newMember = await getUserByEmail(memberEmail);
                if (!newMember) throw new Error("No PeerSchedule user was found with that exact email address.");
                if (calendar.memberIds.includes(newMember.uid)) throw new Error("That user is already a member.");
                await addCalendarMember(calendar.id, newMember.uid);
                setMemberEmail("");
                setSuccessMessage(`${newMember.displayName} was added to the calendar.`);
                await loadCalendar();
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to add the member.");
            } finally {
                setIsSaving(false);
            }
        })();
    };

    const handleRemoveMember = (member: User): void => {
        if (!calendar) return;
        void (async () => {
            try {
                setIsSaving(true);
                await removeCalendarMember(calendar.id, member.uid);
                setSuccessMessage(`${member.displayName} was removed from the calendar.`);
                await loadCalendar();
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to remove the member.");
            } finally {
                setIsSaving(false);
            }
        })();
    };

    const handleDeleteCalendar = (): void => {
        if (!calendar) return;
        void (async () => {
            try {
                setIsSaving(true);
                await deleteCalendar(calendar.id);
                await navigate("/calendars", { replace: true });
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to delete the calendar.");
            } finally {
                setIsSaving(false);
            }
        })();
    };

    const handleLeaveCalendar = (): void => {
        if (!calendar || !user) return;
        void (async () => {
            try {
                setIsSaving(true);
                await removeCalendarMember(calendar.id, user.uid);
                await navigate("/calendars", { replace: true });
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to leave the calendar.");
            } finally {
                setIsSaving(false);
            }
        })();
    };

    if (isAuthLoading || (user && isLoading)) {
        return <PageState title="Loading calendar" message="Retrieving events and calendar members..." />;
    }

    if (!user) return null;
    if (errorMessage && !calendar)
        return <PageState title="Calendar unavailable" message={errorMessage} tone="error" />;
    if (!calendar || !calendarId) return <PageState title="Calendar not found" tone="error" />;

    const upcomingEvents = events.filter((event) => event.endTime.toMillis() >= currentTime).slice(0, 6);

    return (
        <main className="min-h-[calc(100dvh-66px)] bg-slate-50">
            <title>{calendar.name} | PeerSchedule</title>
            <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <div
                            className="mt-1 h-12 w-3 rounded-full"
                            style={{ backgroundColor: calendar.color ?? "#2563eb" }}
                        />
                        <div>
                            <Link to="/calendars" className="text-sm font-bold text-blue-600 hover:text-blue-800">
                                ← All calendars
                            </Link>
                            <h1 className="mt-1 text-3xl font-black text-slate-950">{calendar.name}</h1>
                            <p className="mt-1 text-slate-600">
                                {calendar.description?.trim() ? calendar.description : "Shared calendar"} ·{" "}
                                {calendar.memberIds.length} members
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => openNewEvent(new Date())}
                            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
                        >
                            + Add event
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsSettingsOpen(true)}
                            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-100"
                        >
                            {isOwner ? "Manage calendar" : "Members"}
                        </button>
                    </div>
                </div>

                {errorMessage ? (
                    <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                        {errorMessage}
                    </div>
                ) : null}
                {successMessage ? (
                    <div
                        role="status"
                        className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800"
                    >
                        {successMessage}
                    </div>
                ) : null}

                <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <header className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDisplayMonth(
                                            (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                                        )
                                    }
                                    className="rounded-lg border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-slate-50"
                                    aria-label="Previous month"
                                >
                                    ←
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const now = new Date();
                                        setDisplayMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                                    }}
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDisplayMonth(
                                            (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                                        )
                                    }
                                    className="rounded-lg border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-slate-50"
                                    aria-label="Next month"
                                >
                                    →
                                </button>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900">
                                {displayMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                            </h2>
                        </header>

                        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                <div key={day} className="p-3">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">
                            {monthDates.map((date) => {
                                const dateEvents = eventsByDate.get(toDateKey(date)) ?? [];
                                const isCurrentMonth = date.getMonth() === displayMonth.getMonth();
                                const isToday = toDateKey(date) === toDateKey(new Date());
                                return (
                                    <div
                                        key={toDateKey(date)}
                                        className={`min-h-28 border-b border-r border-slate-200 p-2 sm:min-h-36 ${isCurrentMonth ? "bg-white" : "bg-slate-50 text-slate-400"}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => openNewEvent(date)}
                                            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold hover:bg-blue-100 hover:text-blue-700 ${isToday ? "bg-blue-600 text-white" : ""}`}
                                            aria-label={`Add event on ${date.toLocaleDateString()}`}
                                        >
                                            {date.getDate()}
                                        </button>
                                        <div className="mt-2 space-y-1">
                                            {dateEvents.slice(0, 3).map((event) => (
                                                <button
                                                    key={event.id}
                                                    type="button"
                                                    onClick={() => setSelectedEvent(event)}
                                                    className={`block w-full truncate rounded-md border px-2 py-1 text-left text-xs font-bold ${eventTypeClasses[event.type]}`}
                                                    title={visibleTitle(event)}
                                                >
                                                    {event.startTime.toDate().toLocaleTimeString([], {
                                                        hour: "numeric",
                                                        minute: "2-digit",
                                                    })}{" "}
                                                    {visibleTitle(event)}
                                                </button>
                                            ))}
                                            {dateEvents.length > 3 ? (
                                                <p className="px-1 text-xs font-semibold text-slate-500">
                                                    +{dateEvents.length - 3} more
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <aside className="space-y-6">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-lg font-black text-slate-900">Upcoming events</h2>
                            {upcomingEvents.length === 0 ? (
                                <p className="mt-3 text-sm text-slate-500">No upcoming events.</p>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {upcomingEvents.map((event) => (
                                        <button
                                            key={event.id}
                                            type="button"
                                            onClick={() => setSelectedEvent(event)}
                                            className="w-full rounded-xl border border-slate-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50"
                                        >
                                            <p className="font-bold text-slate-900">{visibleTitle(event)}</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {event.startTime
                                                    .toDate()
                                                    .toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-lg font-black text-slate-900">Members</h2>
                            <div className="mt-4 space-y-3">
                                {members.slice(0, 6).map((member) => (
                                    <div key={member.uid} className="flex items-center gap-3">
                                        {member.photoURL ? (
                                            <img
                                                src={member.photoURL}
                                                alt=""
                                                className="h-9 w-9 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                                                {member.displayName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-slate-900">
                                                {member.displayName}
                                            </p>
                                            <p className="truncate text-xs text-slate-500">
                                                {member.uid === calendar.ownerId ? "Owner" : "Member"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </aside>
                </div>
            </div>

            <Modal
                title={editingEvent ? "Edit event" : "Create event"}
                isOpen={isEventFormOpen}
                onClose={closeEventForm}
                size="lg"
                closeDisabled={isSaving}
            >
                <form onSubmit={handleEventSubmit} className="space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <label htmlFor="event-title" className="block text-sm font-bold text-slate-700">
                                Title
                            </label>
                            <input
                                id="event-title"
                                value={eventForm.title}
                                onChange={(event) =>
                                    setEventForm((current) => ({ ...current, title: event.target.value }))
                                }
                                required
                                minLength={2}
                                maxLength={120}
                                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label htmlFor="event-start" className="block text-sm font-bold text-slate-700">
                                Start
                            </label>
                            <input
                                id="event-start"
                                type="datetime-local"
                                value={eventForm.startTime}
                                onChange={(event) =>
                                    setEventForm((current) => ({ ...current, startTime: event.target.value }))
                                }
                                required
                                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                            />
                        </div>
                        <div>
                            <label htmlFor="event-end" className="block text-sm font-bold text-slate-700">
                                End
                            </label>
                            <input
                                id="event-end"
                                type="datetime-local"
                                value={eventForm.endTime}
                                onChange={(event) =>
                                    setEventForm((current) => ({ ...current, endTime: event.target.value }))
                                }
                                required
                                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                            />
                        </div>
                        <div>
                            <label htmlFor="event-type" className="block text-sm font-bold text-slate-700">
                                Type
                            </label>
                            <select
                                id="event-type"
                                value={eventForm.type}
                                onChange={(event) =>
                                    setEventForm((current) => ({ ...current, type: event.target.value as EventType }))
                                }
                                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                            >
                                {Object.entries(eventTypeLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="event-visibility" className="block text-sm font-bold text-slate-700">
                                Visibility
                            </label>
                            <select
                                id="event-visibility"
                                value={eventForm.visibility}
                                onChange={(event) =>
                                    setEventForm((current) => ({
                                        ...current,
                                        visibility: event.target.value as Visibility,
                                    }))
                                }
                                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                            >
                                {Object.entries(visibilityLabels).map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="event-location" className="block text-sm font-bold text-slate-700">
                                Location
                            </label>
                            <input
                                id="event-location"
                                value={eventForm.location}
                                onChange={(event) =>
                                    setEventForm((current) => ({ ...current, location: event.target.value }))
                                }
                                maxLength={160}
                                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                                placeholder="Room, building, or meeting link"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label htmlFor="event-description" className="block text-sm font-bold text-slate-700">
                                Description
                            </label>
                            <textarea
                                id="event-description"
                                value={eventForm.description}
                                onChange={(event) =>
                                    setEventForm((current) => ({ ...current, description: event.target.value }))
                                }
                                maxLength={1000}
                                rows={4}
                                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                            />
                        </div>
                    </div>

                    <fieldset className="rounded-xl border border-slate-200 p-4">
                        <legend className="px-2 text-sm font-bold text-slate-700">Participants</legend>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {members
                                .filter((member) => member.uid !== user.uid)
                                .map((member) => (
                                    <label
                                        key={member.uid}
                                        className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={eventForm.participantIds.includes(member.uid)}
                                            onChange={(event) =>
                                                setEventForm((current) => ({
                                                    ...current,
                                                    participantIds: event.target.checked
                                                        ? [...current.participantIds, member.uid]
                                                        : current.participantIds.filter((id) => id !== member.uid),
                                                }))
                                            }
                                            className="h-4 w-4"
                                        />
                                        <span className="text-sm font-semibold text-slate-700">
                                            {member.displayName}
                                        </span>
                                    </label>
                                ))}
                        </div>
                    </fieldset>

                    <div className="rounded-xl border border-slate-200 p-4">
                        <label className="flex items-center gap-3 font-bold text-slate-700">
                            <input
                                type="checkbox"
                                checked={eventForm.isRecurring}
                                onChange={(event) =>
                                    setEventForm((current) => ({ ...current, isRecurring: event.target.checked }))
                                }
                                className="h-4 w-4"
                            />
                            Recurring event
                        </label>
                        {eventForm.isRecurring ? (
                            <select
                                value={eventForm.recurrenceRule}
                                onChange={(event) =>
                                    setEventForm((current) => ({ ...current, recurrenceRule: event.target.value }))
                                }
                                className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                            >
                                <option value="FREQ=DAILY">Daily</option>
                                <option value="FREQ=WEEKLY">Weekly</option>
                                <option value="FREQ=MONTHLY">Monthly</option>
                                <option value="FREQ=YEARLY">Yearly</option>
                            </select>
                        ) : null}
                        <p className="mt-2 text-xs text-slate-500">
                            The recurrence rule is stored for future expanded recurrence rendering.
                        </p>
                    </div>

                    {errorMessage ? (
                        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            {errorMessage}
                        </p>
                    ) : null}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeEventForm}
                            className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSaving ? "Saving..." : editingEvent ? "Save changes" : "Create event"}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                title={selectedEvent ? visibleTitle(selectedEvent) : "Event details"}
                isOpen={selectedEvent !== null}
                onClose={() => setSelectedEvent(null)}
                size="md"
            >
                {selectedEvent ? (
                    <div className="space-y-5">
                        {canSeeDetails(selectedEvent) ? (
                            <>
                                <div className="flex flex-wrap gap-2">
                                    <span
                                        className={`rounded-full border px-3 py-1 text-xs font-bold ${eventTypeClasses[selectedEvent.type]}`}
                                    >
                                        {eventTypeLabels[selectedEvent.type]}
                                    </span>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                        {visibilityLabels[selectedEvent.visibility]}
                                    </span>
                                </div>
                                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                                    <div>
                                        <dt className="font-bold text-slate-500">Starts</dt>
                                        <dd className="mt-1 text-slate-900">
                                            {selectedEvent.startTime.toDate().toLocaleString()}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="font-bold text-slate-500">Ends</dt>
                                        <dd className="mt-1 text-slate-900">
                                            {selectedEvent.endTime.toDate().toLocaleString()}
                                        </dd>
                                    </div>
                                    {selectedEvent.location ? (
                                        <div className="sm:col-span-2">
                                            <dt className="font-bold text-slate-500">Location</dt>
                                            <dd className="mt-1 text-slate-900">{selectedEvent.location}</dd>
                                        </div>
                                    ) : null}
                                    {selectedEvent.description ? (
                                        <div className="sm:col-span-2">
                                            <dt className="font-bold text-slate-500">Description</dt>
                                            <dd className="mt-1 whitespace-pre-wrap text-slate-900">
                                                {selectedEvent.description}
                                            </dd>
                                        </div>
                                    ) : null}
                                </dl>
                                <div>
                                    <h3 className="font-bold text-slate-900">Participants</h3>
                                    <div className="mt-3 space-y-2">
                                        {selectedEvent.participantIds.map((participantId) => {
                                            const participant = memberMap.get(participantId);
                                            return (
                                                <div
                                                    key={participantId}
                                                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                                                >
                                                    <span>{participant?.displayName ?? "Unknown member"}</span>
                                                    <span className="font-bold capitalize text-slate-600">
                                                        {selectedEvent.participants[participantId] ?? "pending"}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="rounded-xl bg-amber-50 p-5 text-amber-900">
                                <p className="font-bold">This time is marked busy.</p>
                                <p className="mt-2 text-sm">
                                    The event creator chose not to share the event details with you.
                                </p>
                                <p className="mt-3 text-sm">
                                    {selectedEvent.startTime.toDate().toLocaleString()} –{" "}
                                    {selectedEvent.endTime.toDate().toLocaleTimeString()}
                                </p>
                            </div>
                        )}

                        {selectedEvent.participants[user.uid] ? (
                            <div className="rounded-xl border border-slate-200 p-4">
                                <p className="text-sm font-bold text-slate-700">
                                    Your response:{" "}
                                    <span className="capitalize">{selectedEvent.participants[user.uid]}</span>
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {(["accepted", "pending", "declined"] as ParticipantStatus[]).map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => handleParticipantResponse(status)}
                                            disabled={isSaving}
                                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold capitalize text-slate-700 hover:bg-slate-50"
                                        >
                                            {status}
                                        </button>
                                    ))}
                                    {selectedEvent.type === "open_event" && selectedEvent.creatorId !== user.uid ? (
                                        <button
                                            type="button"
                                            onClick={handleLeaveOpenEvent}
                                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                                        >
                                            Leave event
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        ) : selectedEvent.type === "open_event" ? (
                            <button
                                type="button"
                                onClick={() => handleParticipantResponse("accepted")}
                                className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700"
                            >
                                Join open event
                            </button>
                        ) : null}

                        {selectedEvent.creatorId === user.uid || isOwner ? (
                            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                                <button
                                    type="button"
                                    onClick={() => openEditEvent(selectedEvent)}
                                    className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEventToDelete(selectedEvent);
                                        setSelectedEvent(null);
                                    }}
                                    className="rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </Modal>

            <Modal
                title={isOwner ? "Manage calendar" : "Calendar members"}
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                size="lg"
                closeDisabled={isSaving}
            >
                <div className="space-y-7">
                    {isOwner ? (
                        <form
                            onSubmit={handleSettingsSubmit}
                            className="space-y-4 rounded-xl border border-slate-200 p-5"
                        >
                            <h3 className="text-lg font-black text-slate-900">Calendar settings</h3>
                            <div>
                                <label htmlFor="settings-name" className="block text-sm font-bold text-slate-700">
                                    Name
                                </label>
                                <input
                                    id="settings-name"
                                    value={settings.name}
                                    onChange={(event) =>
                                        setSettings((current) => ({ ...current, name: event.target.value }))
                                    }
                                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                                    required
                                />
                            </div>
                            <div>
                                <label
                                    htmlFor="settings-description"
                                    className="block text-sm font-bold text-slate-700"
                                >
                                    Description
                                </label>
                                <textarea
                                    id="settings-description"
                                    value={settings.description}
                                    onChange={(event) =>
                                        setSettings((current) => ({ ...current, description: event.target.value }))
                                    }
                                    rows={3}
                                    maxLength={300}
                                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <label htmlFor="settings-color" className="text-sm font-bold text-slate-700">
                                    Color
                                </label>
                                <input
                                    id="settings-color"
                                    type="color"
                                    value={settings.color}
                                    onChange={(event) =>
                                        setSettings((current) => ({ ...current, color: event.target.value }))
                                    }
                                    className="h-10 w-16 rounded border border-slate-300 bg-white p-1"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                Save settings
                            </button>
                        </form>
                    ) : null}

                    <section>
                        <h3 className="text-lg font-black text-slate-900">Members</h3>
                        {isOwner ? (
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <label htmlFor="member-email" className="sr-only">
                                    Member email
                                </label>
                                <input
                                    id="member-email"
                                    type="email"
                                    value={memberEmail}
                                    onChange={(event) => setMemberEmail(event.target.value)}
                                    placeholder="Exact PeerSchedule email"
                                    className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddMember}
                                    disabled={isSaving || !memberEmail.trim()}
                                    className="rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Add member
                                </button>
                            </div>
                        ) : null}
                        <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200">
                            {members.map((member) => (
                                <div key={member.uid} className="flex items-center justify-between gap-4 p-4">
                                    <div className="min-w-0">
                                        <p className="truncate font-bold text-slate-900">{member.displayName}</p>
                                        <p className="truncate text-sm text-slate-500">
                                            {member.email} · {member.uid === calendar.ownerId ? "Owner" : "Member"}
                                        </p>
                                    </div>
                                    {isOwner && member.uid !== calendar.ownerId ? (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMember(member)}
                                            disabled={isSaving}
                                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                                        >
                                            Remove
                                        </button>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </section>

                    {errorMessage ? (
                        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            {errorMessage}
                        </p>
                    ) : null}
                    <section className="border-t border-slate-200 pt-5">
                        {isOwner ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSettingsOpen(false);
                                    setIsCalendarDeleteConfirmOpen(true);
                                }}
                                disabled={isSaving}
                                className="rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                Delete calendar and events
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleLeaveCalendar}
                                disabled={isSaving}
                                className="rounded-xl border border-red-200 px-4 py-2.5 font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                            >
                                Leave calendar
                            </button>
                        )}
                    </section>
                </div>
            </Modal>

            <Modal
                title="Delete calendar?"
                isOpen={isCalendarDeleteConfirmOpen}
                onClose={() => setIsCalendarDeleteConfirmOpen(false)}
                size="sm"
                closeDisabled={isSaving}
            >
                <p className="text-slate-600">
                    This permanently deletes <strong>{calendar.name}</strong> and all events stored in it. This action
                    cannot be undone.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => setIsCalendarDeleteConfirmOpen(false)}
                        disabled={isSaving}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDeleteCalendar}
                        disabled={isSaving}
                        className="rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        {isSaving ? "Deleting..." : "Delete calendar"}
                    </button>
                </div>
            </Modal>

            <Modal
                title="Delete event?"
                isOpen={eventToDelete !== null}
                onClose={() => setEventToDelete(null)}
                size="sm"
                closeDisabled={isSaving}
            >
                <p className="text-slate-600">
                    Delete <strong>{eventToDelete?.title}</strong>? This cannot be undone.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => setEventToDelete(null)}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDeleteEvent}
                        disabled={isSaving}
                        className="rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        {isSaving ? "Deleting..." : "Delete event"}
                    </button>
                </div>
            </Modal>
        </main>
    );
}
