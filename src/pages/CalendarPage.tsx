import { type MouseEvent, type SubmitEventHandler, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Timestamp } from "firebase/firestore";

import Modal from "@/components/common/Modal";
import PageState from "@/components/common/PageState";
import CalendarColorPicker from "@/components/common/CalendarColorPicker";
import { useRequireAuth } from "@/hooks/useAuth";
import {
    type AvailabilityStatus,
    type DailyAvailability,
    setAvailabilitySlot,
    setUnavailableSlots,
    watchDailyAvailability,
} from "@/services/availabilityService";
import {
    addCalendarMember,
    deleteCalendar,
    getCalendarById,
    getUserCalendars,
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
    watchEventsByCalendarId,
} from "@/services/calendarEventService";
import type { DeleteEventScope } from "@/services/calendarEventService";
import { getFriends } from "@/services/friendService";
import { getUsersByIds, searchUsers } from "@/services/userService";
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
    recurrenceUntil: string;
}

interface CalendarSettingsState {
    name: string;
    description: string;
    color: string;
    allowMembersToEditEvents: boolean;
}

type CalendarView = "day" | "week" | "month";

const eventTypeLabels: Record<EventType, string> = {
    meeting: "Meeting",
    open_event: "Open event",
    blocked_time: "Blocked time",
};

const eventTypeDescriptions: Record<EventType, string> = {
    meeting: "A scheduled event involving specific participants, such as a study session or group meeting.",
    open_event: "An optional event that calendar members can join or leave themselves.",
    blocked_time: "Legacy blocked time.",
};

const selectableEventTypes: EventType[] = ["meeting", "open_event"];

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
const HOUR_HEIGHT = 56;
const DAY_GRID_HEIGHT = HOUR_HEIGHT * 24;
const hourLabels = Array.from({ length: 24 }, (_, hour) => {
    const date = new Date(2000, 0, 1, hour);
    return date.toLocaleTimeString([], { hour: "numeric" });
});
const availabilitySlots = Array.from({ length: 48 }, (_, index) => {
    const hour = Math.floor(index / 2);
    const minute = index % 2 === 0 ? 0 : 30;
    return {
        key: `${pad(hour)}${pad(minute)}`,
        label: new Date(2000, 0, 1, hour, minute).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
        }),
    };
});

const toDateKey = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const toDateTimeLocal = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const eventGridPosition = (event: CalendarEvent): { top: number; height: number } => {
    const start = event.startTime.toDate();
    const end = event.endTime.toDate();
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const durationMinutes = Math.max(30, (end.getTime() - start.getTime()) / 60_000);

    return {
        top: (startMinutes / 60) * HOUR_HEIGHT,
        height: Math.min((durationMinutes / 60) * HOUR_HEIGHT, DAY_GRID_HEIGHT - (startMinutes / 60) * HOUR_HEIGHT),
    };
};

interface EventGridLayout {
    top: number;
    height: number;
    left: string;
    width: string;
}

const buildOverlappingEventLayouts = (events: CalendarEvent[]): Map<string, EventGridLayout> => {
    const layouts = new Map<string, EventGridLayout>();
    const sortedEvents = [...events].sort(
        (first, second) =>
            first.startTime.toMillis() - second.startTime.toMillis() ||
            first.endTime.toMillis() - second.endTime.toMillis()
    );
    const clusters: CalendarEvent[][] = [];
    let currentCluster: CalendarEvent[] = [];
    let clusterEnd = 0;

    for (const event of sortedEvents) {
        const start = event.startTime.toMillis();
        if (currentCluster.length > 0 && start >= clusterEnd) {
            clusters.push(currentCluster);
            currentCluster = [];
        }
        currentCluster.push(event);
        clusterEnd = Math.max(clusterEnd, event.endTime.toMillis());
    }
    if (currentCluster.length > 0) clusters.push(currentCluster);

    for (const cluster of clusters) {
        const columnEndTimes: number[] = [];
        const eventColumns = new Map<string, number>();
        for (const event of cluster) {
            const start = event.startTime.toMillis();
            let column = columnEndTimes.findIndex((endTime) => endTime <= start);
            if (column === -1) {
                column = columnEndTimes.length;
                columnEndTimes.push(event.endTime.toMillis());
            } else {
                columnEndTimes[column] = event.endTime.toMillis();
            }
            eventColumns.set(event.id, column);
        }

        const columnCount = Math.max(1, columnEndTimes.length);
        for (const event of cluster) {
            const column = eventColumns.get(event.id) ?? 0;
            layouts.set(event.id, {
                ...eventGridPosition(event),
                left: `calc(${(column / columnCount) * 100}% + 4px)`,
                width: `calc(${100 / columnCount}% - 8px)`,
            });
        }
    }

    return layouts;
};

const createDefaultEventForm = (date = new Date(), preserveTime = false): EventFormState => {
    const start = new Date(date);
    if (preserveTime) {
        start.setMinutes(0, 0, 0);
    } else {
        start.setHours(9, 0, 0, 0);
    }
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    const recurrenceUntil = new Date(start);
    recurrenceUntil.setFullYear(recurrenceUntil.getFullYear() + 1);

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
        recurrenceUntil: toDateKey(recurrenceUntil),
    };
};

const eventToForm = (event: CalendarEvent): EventFormState => ({
    title: event.title,
    description: event.description,
    location: event.location ?? "",
    startTime: toDateTimeLocal(event.startTime.toDate()),
    endTime: toDateTimeLocal(event.endTime.toDate()),
    type: event.type === "blocked_time" ? "meeting" : event.type,
    visibility: event.visibility,
    participantIds: event.participantIds.filter((participantId) => participantId !== event.creatorId),
    isRecurring: event.isRecurring,
    recurrenceRule: event.recurrenceRule ?? "FREQ=WEEKLY",
    recurrenceUntil: toDateKey(
        event.recurrenceUntil?.toDate() ??
            new Date(
                event.startTime.toDate().getFullYear() + 1,
                event.startTime.toDate().getMonth(),
                event.startTime.toDate().getDate()
            )
    ),
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
    const [friends, setFriends] = useState<User[]>([]);
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
    const [calendarView, setCalendarView] = useState<CalendarView>("month");
    const [dayDisplayMode, setDayDisplayMode] = useState<"events" | "availability">("events");
    const [availabilityPaint, setAvailabilityPaint] = useState<AvailabilityStatus | null>("available");
    const [dailyAvailability, setDailyAvailability] = useState<DailyAvailability[]>([]);
    const [hoveredAvailabilitySlot, setHoveredAvailabilitySlot] = useState<string | null>(null);
    const [availabilityComparisonUserId, setAvailabilityComparisonUserId] = useState("everyone");
    const isPaintingAvailability = useRef(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [isEventFormOpen, setIsEventFormOpen] = useState(false);
    const [eventForm, setEventForm] = useState<EventFormState>(() => createDefaultEventForm());
    const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
    const [deleteEventError, setDeleteEventError] = useState<string | null>(null);
    const [deletingScope, setDeletingScope] = useState<DeleteEventScope | null>(null);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCalendarDeleteConfirmOpen, setIsCalendarDeleteConfirmOpen] = useState(false);
    const [settings, setSettings] = useState<CalendarSettingsState>({
        name: "",
        description: "",
        color: "#2563eb",
        allowMembersToEditEvents: false,
    });
    const [memberSearchText, setMemberSearchText] = useState("");
    const [memberSearchResults, setMemberSearchResults] = useState<User[]>([]);
    const [isSearchingMembers, setIsSearchingMembers] = useState(false);

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
            setFriends(friends);
            setFriendIds(new Set(friends.map((friend) => friend.uid)));
            setSettings({
                name: nextCalendar.name,
                description: nextCalendar.description ?? "",
                color: nextCalendar.color ?? "#2563eb",
                allowMembersToEditEvents: nextCalendar.allowMembersToEditEvents,
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
        if (!user || !calendarId) return;

        return watchEventsByCalendarId(calendarId, setEvents, (error) => setErrorMessage(error.message));
    }, [calendarId, user]);

    useEffect(() => {
        if (!calendarId || !user) return;
        return watchDailyAvailability(calendarId, toDateKey(displayMonth), setDailyAvailability, (error) =>
            setErrorMessage(error.message)
        );
    }, [calendarId, displayMonth, user]);

    useEffect(() => {
        const stopPainting = (): void => {
            isPaintingAvailability.current = false;
        };
        window.addEventListener("pointerup", stopPainting);
        return () => window.removeEventListener("pointerup", stopPainting);
    }, []);

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
    const dayEvents = useMemo(() => eventsByDate.get(toDateKey(displayMonth)) ?? [], [displayMonth, eventsByDate]);
    const dayEventLayouts = useMemo(() => buildOverlappingEventLayouts(dayEvents), [dayEvents]);
    const availabilityByUser = useMemo(
        () => new Map(dailyAvailability.map((record) => [record.userId, record.slots])),
        [dailyAvailability]
    );
    const hoveredAvailability = useMemo(() => {
        if (!hoveredAvailabilitySlot) return null;
        const available: string[] = [];
        const unavailable: string[] = [];
        const unanswered: string[] = [];
        for (const member of members) {
            const status = availabilityByUser.get(member.uid)?.[hoveredAvailabilitySlot];
            if (status === "available") available.push(member.displayName);
            else if (status === "unavailable") unavailable.push(member.displayName);
            else unanswered.push(member.displayName);
        }
        return { available, unavailable, unanswered };
    }, [availabilityByUser, hoveredAvailabilitySlot, members]);

    const paintAvailabilitySlot = (slot: string, status: AvailabilityStatus | null = availabilityPaint): void => {
        if (!user || !calendarId) return;
        const date = toDateKey(displayMonth);
        setDailyAvailability((current) => {
            const existing = current.find((record) => record.userId === user.uid);
            const slots = { ...(existing?.slots ?? {}) };
            if (status) slots[slot] = status;
            else delete slots[slot];
            const nextRecord: DailyAvailability = {
                id: `${calendarId}_${user.uid}_${date}`,
                calendarId,
                userId: user.uid,
                date,
                slots,
            };
            return [...current.filter((record) => record.userId !== user.uid), nextRecord];
        });
        void setAvailabilitySlot(calendarId, user.uid, date, slot, status).catch((error: unknown) =>
            setErrorMessage(error instanceof Error ? error.message : "Unable to update availability.")
        );
    };

    const blockFromPersonalCalendar = (): void => {
        if (!user || !calendarId || calendar?.isPersonal) return;
        void (async () => {
            try {
                setIsSaving(true);
                setErrorMessage(null);
                const personalCalendar = (await getUserCalendars(user.uid)).find((item) => item.isPersonal);
                if (!personalCalendar) throw new Error("Your personal calendar is not ready yet.");
                const personalEvents = await getEventsByCalendarId(personalCalendar.id);
                const date = toDateKey(displayMonth);
                const blockedSlots = availabilitySlots
                    .filter((slot) => {
                        const hour = Number(slot.key.slice(0, 2));
                        const minute = Number(slot.key.slice(2, 4));
                        const slotStart = new Date(displayMonth);
                        slotStart.setHours(hour, minute, 0, 0);
                        const slotEnd = new Date(slotStart.getTime() + 30 * 60_000);
                        return personalEvents.some(
                            (event) =>
                                event.startTime.toMillis() < slotEnd.getTime() &&
                                event.endTime.toMillis() > slotStart.getTime()
                        );
                    })
                    .map((slot) => slot.key);
                await setUnavailableSlots(calendarId, user.uid, date, blockedSlots);
                setSuccessMessage(
                    blockedSlots.length
                        ? `Blocked ${blockedSlots.length} time slots from your personal calendar.`
                        : "No personal calendar events overlap this day."
                );
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to import personal busy times.");
            } finally {
                setIsSaving(false);
            }
        })();
    };

    const monthDates = useMemo(() => buildMonthDates(displayMonth), [displayMonth]);
    const weekDates = useMemo(() => {
        const start = new Date(displayMonth);
        start.setDate(start.getDate() - start.getDay());
        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return date;
        });
    }, [displayMonth]);
    const isOwner = calendar?.ownerId === user?.uid;
    const canEditEvent = useCallback(
        (event: CalendarEvent): boolean =>
            Boolean(user && (isOwner || event.creatorId === user.uid || calendar?.allowMembersToEditEvents)),
        [calendar, isOwner, user]
    );
    const memberMap = useMemo(() => new Map(members.map((member) => [member.uid, member])), [members]);

    const canSeeDetails = useCallback(
        (event: CalendarEvent): boolean => {
            if (!user || !calendar) return false;
            if (canEditEvent(event) || event.participantIds.includes(user.uid)) return true;
            if (event.visibility === "full_details") return true;
            if (event.detailsAvailable !== undefined) return event.detailsAvailable;
            if (event.visibility === "friends_only") return friendIds.has(event.creatorId);
            return false;
        },
        [calendar, canEditEvent, friendIds, user]
    );

    const visibleTitle = (event: CalendarEvent): string => (canSeeDetails(event) ? event.title : "Busy");

    const moveCalendar = (direction: -1 | 1): void => {
        setDisplayMonth((current) => {
            const next = new Date(current);
            if (calendarView === "day") next.setDate(next.getDate() + direction);
            if (calendarView === "week") next.setDate(next.getDate() + direction * 7);
            if (calendarView === "month") next.setMonth(next.getMonth() + direction);
            return next;
        });
    };

    const calendarHeading =
        calendarView === "day"
            ? displayMonth.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
              })
            : calendarView === "week"
              ? `${weekDates[0].toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                })} – ${weekDates[6].toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                })}`
              : displayMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    const openNewEvent = (date = new Date(), preserveTime = false): void => {
        if (!user) return;
        const nextForm = createDefaultEventForm(date, preserveTime);
        nextForm.participantIds = [];
        setEditingEvent(null);
        setEventForm(nextForm);
        setErrorMessage(null);
        setIsEventFormOpen(true);
    };

    const openNewEventFromGrid = (date: Date, clickEvent: MouseEvent<HTMLDivElement>): void => {
        if (clickEvent.target instanceof Element && clickEvent.target.closest("button")) return;
        const gridBounds = clickEvent.currentTarget.getBoundingClientRect();
        const clickedOffset = Math.max(0, Math.min(clickEvent.clientY - gridBounds.top, DAY_GRID_HEIGHT - 1));
        const clickedHour = Math.floor(clickedOffset / HOUR_HEIGHT);
        const eventStart = new Date(date);
        eventStart.setHours(clickedHour, 0, 0, 0);
        openNewEvent(eventStart, true);
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

    const handleEventStartTimeChange = (nextStartTime: string): void => {
        setEventForm((current) => {
            const currentStart = new Date(current.startTime);
            const currentEnd = new Date(current.endTime);
            const durationMs =
                Number.isNaN(currentStart.getTime()) || Number.isNaN(currentEnd.getTime())
                    ? 60 * 60 * 1000
                    : Math.max(currentEnd.getTime() - currentStart.getTime(), 15 * 60 * 1000);
            const nextStart = new Date(nextStartTime);
            const nextEnd = new Date(nextStart.getTime() + durationMs);

            return {
                ...current,
                startTime: nextStartTime,
                endTime: toDateTimeLocal(nextEnd),
            };
        });
    };

    const handleEventSubmit: SubmitEventHandler<HTMLFormElement> = (submitEvent) => {
        submitEvent.preventDefault();
        void (async () => {
            if (!user || !calendarId) return;

            const startDate = new Date(eventForm.startTime);
            const endDate = new Date(eventForm.endTime);
            const recurrenceUntilDate = new Date(`${eventForm.recurrenceUntil}T23:59:59`);
            if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
                setErrorMessage("Enter valid start and end times.");
                return;
            }
            if (
                eventForm.isRecurring &&
                (Number.isNaN(recurrenceUntilDate.getTime()) || recurrenceUntilDate < startDate)
            ) {
                setErrorMessage("The recurrence end date must be on or after the event start date.");
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
                    recurrenceUntil: eventForm.isRecurring ? Timestamp.fromDate(recurrenceUntilDate) : undefined,
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

    const handleDeleteEvent = (scope: DeleteEventScope = "single"): void => {
        if (!eventToDelete) return;
        const targetEvent = eventToDelete;
        void (async () => {
            try {
                setIsSaving(true);
                setDeletingScope(scope);
                setDeleteEventError(null);
                await deleteEvent(targetEvent.id, scope);
                setEventToDelete(null);
                setSelectedEvent(null);
                setSuccessMessage(scope === "single" ? "Event deleted." : "Recurring events deleted.");
                await loadCalendar();
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : "Unable to delete the event.";
                setDeleteEventError(message);
                setErrorMessage(message);
            } finally {
                setIsSaving(false);
                setDeletingScope(null);
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

    const handleSearchMembers = (): void => {
        if (!user) return;
        if (memberSearchText.trim().length < 2) {
            setMemberSearchResults([]);
            return;
        }

        void (async () => {
            try {
                setIsSearchingMembers(true);
                setErrorMessage(null);
                const results = await searchUsers(memberSearchText, user.uid);
                setMemberSearchResults(results);
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to search for members.");
            } finally {
                setIsSearchingMembers(false);
            }
        })();
    };

    const handleAddFriendToCalendar = (friend: User): void => {
        if (!calendar) return;

        void (async () => {
            try {
                setIsSaving(true);
                setErrorMessage(null);
                await addCalendarMember(calendar.id, friend.uid);
                setSuccessMessage(`${friend.displayName} was added to the calendar.`);
                setMemberSearchResults((current) => current.filter((result) => result.uid !== friend.uid));
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
    const now = new Date(currentTime);
    const currentTimeGridTop = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT;

    return (
        <main className="min-h-[calc(100dvh-4rem)] bg-slate-50">
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
                                    onClick={() => moveCalendar(-1)}
                                    className="rounded-lg border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-slate-50"
                                    aria-label={`Previous ${calendarView}`}
                                >
                                    ←
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const now = new Date();
                                        setDisplayMonth(
                                            calendarView === "month"
                                                ? new Date(now.getFullYear(), now.getMonth(), 1)
                                                : now
                                        );
                                    }}
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    onClick={() => moveCalendar(1)}
                                    className="rounded-lg border border-slate-300 px-3 py-2 font-bold text-slate-700 hover:bg-slate-50"
                                    aria-label={`Next ${calendarView}`}
                                >
                                    →
                                </button>
                            </div>
                            <div className="flex flex-col items-start gap-3 sm:items-end">
                                <h2 className="text-xl font-black text-slate-900 sm:text-2xl">{calendarHeading}</h2>
                                <div className="flex rounded-lg border border-slate-300 bg-slate-50 p-1">
                                    {(["day", "week", "month"] as const).map((view) => (
                                        <button
                                            key={view}
                                            type="button"
                                            onClick={() => setCalendarView(view)}
                                            className={`rounded-md px-3 py-1.5 text-sm font-bold capitalize ${
                                                calendarView === view
                                                    ? "bg-white text-blue-700 shadow-sm"
                                                    : "text-slate-600 hover:text-slate-900"
                                            }`}
                                            aria-pressed={calendarView === view}
                                        >
                                            {view}
                                        </button>
                                    ))}
                                </div>
                                {calendarView === "day" ? (
                                    <div className="flex rounded-lg border border-slate-300 bg-slate-50 p-1">
                                        {(["events", "availability"] as const).map((mode) => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => setDayDisplayMode(mode)}
                                                className={`rounded-md px-3 py-1.5 text-sm font-bold capitalize ${
                                                    dayDisplayMode === mode
                                                        ? "bg-white text-blue-700 shadow-sm"
                                                        : "text-slate-600"
                                                }`}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </header>

                        {calendarView === "month" ? (
                            <>
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
                                                className={`relative min-h-28 border-b border-r border-slate-200 p-2 sm:min-h-36 ${isCurrentMonth ? "bg-white" : "bg-slate-50 text-slate-400"}`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDisplayMonth(date);
                                                        setCalendarView("day");
                                                    }}
                                                    className="absolute inset-0 hover:bg-blue-50"
                                                    aria-label={`View ${date.toLocaleDateString()}`}
                                                />
                                                <span
                                                    className={`pointer-events-none relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${isToday ? "bg-blue-600 text-white" : ""}`}
                                                >
                                                    {date.getDate()}
                                                </span>
                                                <div className="pointer-events-none relative z-10 mt-2 space-y-1">
                                                    {dateEvents.slice(0, 3).map((event) => (
                                                        <button
                                                            key={event.id}
                                                            type="button"
                                                            onClick={() => setSelectedEvent(event)}
                                                            className={`pointer-events-auto block w-full truncate rounded-md border px-2 py-1 text-left text-xs font-bold ${eventTypeClasses[event.type]}`}
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
                            </>
                        ) : calendarView === "week" ? (
                            <div className="overflow-x-auto">
                                <div className="min-w-[800px]">
                                    <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-slate-200">
                                        <div className="bg-slate-50" />
                                        {weekDates.map((date) => {
                                            const isToday = toDateKey(date) === toDateKey(new Date());
                                            return (
                                                <button
                                                    key={toDateKey(date)}
                                                    type="button"
                                                    onClick={() => {
                                                        setDisplayMonth(date);
                                                        setCalendarView("day");
                                                    }}
                                                    className={`border-l border-slate-200 p-3 text-center hover:bg-blue-50 ${
                                                        isToday
                                                            ? "bg-blue-50 text-blue-700"
                                                            : "bg-slate-50 text-slate-700"
                                                    }`}
                                                >
                                                    <span className="block text-xs font-bold uppercase">
                                                        {date.toLocaleDateString(undefined, { weekday: "short" })}
                                                    </span>
                                                    <span className="text-lg font-black">{date.getDate()}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="grid grid-cols-[4rem_repeat(7,minmax(0,1fr))]">
                                        <div className="relative" style={{ height: DAY_GRID_HEIGHT }}>
                                            {hourLabels.map((label, hour) => (
                                                <span
                                                    key={hour}
                                                    className="absolute right-2 -translate-y-1/2 text-[11px] font-semibold text-slate-400"
                                                    style={{ top: hour * HOUR_HEIGHT }}
                                                >
                                                    {hour === 0 ? "" : label}
                                                </span>
                                            ))}
                                        </div>
                                        {weekDates.map((date) => {
                                            const dateEvents = eventsByDate.get(toDateKey(date)) ?? [];
                                            return (
                                                <div
                                                    key={toDateKey(date)}
                                                    className="relative border-l border-slate-200"
                                                    style={{ height: DAY_GRID_HEIGHT }}
                                                    onDoubleClick={(event) => openNewEventFromGrid(date, event)}
                                                >
                                                    {hourLabels.map((_, hour) => (
                                                        <div
                                                            key={hour}
                                                            className="pointer-events-none absolute left-0 right-0 border-t border-slate-200"
                                                            style={{ top: hour * HOUR_HEIGHT }}
                                                            aria-hidden="true"
                                                        />
                                                    ))}
                                                    {dateEvents.map((event) => (
                                                        <button
                                                            key={event.id}
                                                            type="button"
                                                            onClick={() => setSelectedEvent(event)}
                                                            className={`absolute left-1 right-1 z-10 overflow-hidden rounded-md border p-1.5 text-left text-xs shadow-sm ${eventTypeClasses[event.type]}`}
                                                            style={eventGridPosition(event)}
                                                        >
                                                            <span className="block truncate font-black">
                                                                {visibleTitle(event)}
                                                            </span>
                                                            <span className="block truncate">
                                                                {event.startTime.toDate().toLocaleTimeString([], {
                                                                    hour: "numeric",
                                                                    minute: "2-digit",
                                                                })}
                                                            </span>
                                                        </button>
                                                    ))}
                                                    {toDateKey(date) === toDateKey(now) ? (
                                                        <div
                                                            className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-red-500"
                                                            style={{ top: currentTimeGridTop }}
                                                            aria-hidden="true"
                                                        >
                                                            <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-red-500" />
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : dayDisplayMode === "availability" ? (
                            <div className="p-4">
                                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-black text-slate-900">Daily availability</h3>
                                        <p className="text-sm text-slate-500">
                                            Paint your availability, then compare with the group or one person.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {!calendar.isPersonal ? (
                                            <button
                                                type="button"
                                                onClick={blockFromPersonalCalendar}
                                                disabled={isSaving}
                                                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                                            >
                                                {isSaving ? "Blocking..." : "Block from personal calendar"}
                                            </button>
                                        ) : null}
                                        {(
                                            [
                                                ["available", "Available", "bg-emerald-600 text-white"],
                                                ["unavailable", "Unavailable", "bg-red-600 text-white"],
                                                [null, "Clear", "bg-slate-600 text-white"],
                                            ] as const
                                        ).map(([status, label, activeClass]) => (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={() => setAvailabilityPaint(status)}
                                                className={`rounded-lg px-3 py-2 text-sm font-bold ${
                                                    availabilityPaint === status
                                                        ? activeClass
                                                        : "border border-slate-300 bg-white text-slate-700"
                                                }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {hoveredAvailability ? (
                                    <div className="mb-4 grid gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm sm:grid-cols-3">
                                        <p>
                                            <strong className="text-emerald-700">Available:</strong>{" "}
                                            {hoveredAvailability.available.join(", ") || "Nobody"}
                                        </p>
                                        <p>
                                            <strong className="text-red-700">Unavailable:</strong>{" "}
                                            {hoveredAvailability.unavailable.join(", ") || "Nobody"}
                                        </p>
                                        <p>
                                            <strong className="text-slate-600">No response:</strong>{" "}
                                            {hoveredAvailability.unanswered.join(", ") || "Nobody"}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="mb-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                                        Hover over a time to see everyone’s overlap.
                                    </p>
                                )}

                                <div className="rounded-xl border border-slate-200">
                                    <div>
                                        <div className="sticky top-16 z-20 grid grid-cols-[5rem_minmax(8rem,1fr)_minmax(10rem,1fr)] bg-slate-100 shadow-sm">
                                            <div className="border-r border-slate-200 p-2 text-xs font-bold text-slate-500">
                                                Time
                                            </div>
                                            <div className="border-r border-slate-200 p-2 text-center text-sm font-bold text-slate-800">
                                                Your availability
                                            </div>
                                            <div className="p-2">
                                                <label className="sr-only" htmlFor="availability-comparison">
                                                    Compare availability
                                                </label>
                                                <select
                                                    id="availability-comparison"
                                                    value={availabilityComparisonUserId}
                                                    onChange={(event) =>
                                                        setAvailabilityComparisonUserId(event.target.value)
                                                    }
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-bold text-slate-800"
                                                >
                                                    <option value="everyone">Everyone — availability overlap</option>
                                                    {members
                                                        .filter((member) => member.uid !== user.uid)
                                                        .map((member) => (
                                                            <option key={member.uid} value={member.uid}>
                                                                {member.displayName}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>
                                        </div>
                                        {availabilitySlots.map((slot) => {
                                            const availableCount = members.filter(
                                                (member) =>
                                                    availabilityByUser.get(member.uid)?.[slot.key] === "available"
                                            ).length;
                                            const availableRatio =
                                                members.length === 0 ? 0 : availableCount / members.length;
                                            const ownStatus = availabilityByUser.get(user.uid)?.[slot.key];
                                            const selectedMember = members.find(
                                                (member) => member.uid === availabilityComparisonUserId
                                            );
                                            const selectedStatus = selectedMember
                                                ? availabilityByUser.get(selectedMember.uid)?.[slot.key]
                                                : undefined;
                                            return (
                                                <div
                                                    key={slot.key}
                                                    className="grid grid-cols-[5rem_minmax(8rem,1fr)_minmax(10rem,1fr)]"
                                                    onMouseEnter={() => setHoveredAvailabilitySlot(slot.key)}
                                                    onMouseLeave={() => setHoveredAvailabilitySlot(null)}
                                                >
                                                    <div className="border-r border-t border-slate-200 px-2 py-2 text-xs font-semibold text-slate-500">
                                                        {slot.label}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onPointerDown={(event) => {
                                                            event.preventDefault();
                                                            isPaintingAvailability.current = true;
                                                            paintAvailabilitySlot(slot.key);
                                                        }}
                                                        onPointerEnter={() => {
                                                            if (isPaintingAvailability.current) {
                                                                paintAvailabilitySlot(slot.key);
                                                            }
                                                        }}
                                                        onContextMenu={(event) => {
                                                            event.preventDefault();
                                                            paintAvailabilitySlot(slot.key, null);
                                                        }}
                                                        className={`min-h-9 border-r border-t border-slate-200 ${
                                                            ownStatus === "available"
                                                                ? "bg-emerald-500/75"
                                                                : ownStatus === "unavailable"
                                                                  ? "bg-red-500/70"
                                                                  : "bg-white hover:bg-blue-100"
                                                        }`}
                                                        title={`You: ${ownStatus ?? "No response"}. Right-click to clear.`}
                                                        aria-label={`${slot.label}, your availability: ${ownStatus ?? "No response"}`}
                                                    />
                                                    <div
                                                        className={`min-h-9 border-t border-slate-200 ${
                                                            availabilityComparisonUserId === "everyone"
                                                                ? ""
                                                                : selectedStatus === "available"
                                                                  ? "bg-emerald-500/75"
                                                                  : selectedStatus === "unavailable"
                                                                    ? "bg-red-500/70"
                                                                    : "bg-white"
                                                        }`}
                                                        style={
                                                            availabilityComparisonUserId === "everyone"
                                                                ? {
                                                                      backgroundColor:
                                                                          availableCount === 0
                                                                              ? "rgb(248 250 252)"
                                                                              : `rgb(5 150 105 / ${Math.round(18 + availableRatio * 82)}%)`,
                                                                  }
                                                                : undefined
                                                        }
                                                        title={
                                                            availabilityComparisonUserId === "everyone"
                                                                ? `${availableCount} of ${members.length} people available`
                                                                : `${selectedMember?.displayName ?? "Selected member"}: ${selectedStatus ?? "No response"}`
                                                        }
                                                        aria-label={
                                                            availabilityComparisonUserId === "everyone"
                                                                ? `${slot.label}, ${availableCount} of ${members.length} people available`
                                                                : `${slot.label}, ${selectedMember?.displayName ?? "Selected member"}: ${selectedStatus ?? "No response"}`
                                                        }
                                                    >
                                                        {availabilityComparisonUserId === "everyone" ? (
                                                            <span
                                                                className={`flex h-full min-h-9 items-center justify-center text-xs font-bold ${
                                                                    availableRatio >= 0.6
                                                                        ? "text-white"
                                                                        : "text-slate-700"
                                                                }`}
                                                            >
                                                                {availableCount}/{members.length} available
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-[4rem_minmax(0,1fr)]">
                                <div className="relative" style={{ height: DAY_GRID_HEIGHT }}>
                                    {hourLabels.map((label, hour) => (
                                        <span
                                            key={hour}
                                            className="absolute right-2 -translate-y-1/2 text-[11px] font-semibold text-slate-400"
                                            style={{ top: hour * HOUR_HEIGHT }}
                                        >
                                            {hour === 0 ? "" : label}
                                        </span>
                                    ))}
                                </div>
                                <div
                                    className="relative border-l border-slate-200"
                                    style={{ height: DAY_GRID_HEIGHT }}
                                    onDoubleClick={(event) => openNewEventFromGrid(displayMonth, event)}
                                >
                                    {availabilitySlots.map((slot, index) => {
                                        const availableCount = members.filter(
                                            (member) => availabilityByUser.get(member.uid)?.[slot.key] === "available"
                                        ).length;
                                        const availableRatio =
                                            members.length === 0 ? 0 : availableCount / members.length;
                                        return (
                                            <div
                                                key={`availability-${slot.key}`}
                                                className="pointer-events-none absolute left-0 right-0"
                                                style={{
                                                    top: index * (HOUR_HEIGHT / 2),
                                                    height: HOUR_HEIGHT / 2,
                                                    backgroundColor:
                                                        availableCount === 0
                                                            ? "transparent"
                                                            : `rgb(5 150 105 / ${Math.round(8 + availableRatio * 38)}%)`,
                                                }}
                                                title={`${availableCount} of ${members.length} people available`}
                                                aria-hidden="true"
                                            />
                                        );
                                    })}
                                    {hourLabels.map((_, hour) => (
                                        <div
                                            key={hour}
                                            className="pointer-events-none absolute left-0 right-0 border-t border-slate-200"
                                            style={{ top: hour * HOUR_HEIGHT }}
                                            aria-hidden="true"
                                        />
                                    ))}
                                    {dayEvents.map((event) => (
                                        <button
                                            key={event.id}
                                            type="button"
                                            onClick={() => setSelectedEvent(event)}
                                            className={`absolute z-10 overflow-hidden rounded-lg border px-3 py-2 text-left shadow-sm ${eventTypeClasses[event.type]}`}
                                            style={dayEventLayouts.get(event.id) ?? eventGridPosition(event)}
                                        >
                                            <span className="font-black">{visibleTitle(event)}</span>
                                            <span className="ml-2 text-xs opacity-75">
                                                {event.startTime.toDate().toLocaleTimeString([], {
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                })}
                                                {" – "}
                                                {event.endTime.toDate().toLocaleTimeString([], {
                                                    hour: "numeric",
                                                    minute: "2-digit",
                                                })}
                                            </span>
                                        </button>
                                    ))}
                                    {toDateKey(displayMonth) === toDateKey(now) ? (
                                        <div
                                            className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-red-500"
                                            style={{ top: currentTimeGridTop }}
                                            aria-hidden="true"
                                        >
                                            <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-red-500" />
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        )}
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
                                onChange={(event) => handleEventStartTimeChange(event.target.value)}
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
                                title={eventTypeDescriptions[eventForm.type]}
                                onChange={(event) =>
                                    setEventForm((current) => ({ ...current, type: event.target.value as EventType }))
                                }
                                className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                            >
                                {selectableEventTypes.map((type) => (
                                    <option key={type} value={type} title={eventTypeDescriptions[type]}>
                                        {eventTypeLabels[type]}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-2 text-sm text-slate-500" aria-live="polite">
                                {eventTypeDescriptions[eventForm.type]}
                            </p>
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
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label
                                        htmlFor="recurrence-frequency"
                                        className="block text-xs font-bold text-slate-600"
                                    >
                                        Repeats
                                    </label>
                                    <select
                                        id="recurrence-frequency"
                                        value={eventForm.recurrenceRule}
                                        onChange={(event) =>
                                            setEventForm((current) => ({
                                                ...current,
                                                recurrenceRule: event.target.value,
                                            }))
                                        }
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                                    >
                                        <option value="FREQ=DAILY">Daily</option>
                                        <option value="FREQ=WEEKLY">Weekly</option>
                                        <option value="FREQ=MONTHLY">Monthly</option>
                                        <option value="FREQ=YEARLY">Yearly</option>
                                    </select>
                                </div>
                                <div>
                                    <label
                                        htmlFor="recurrence-until"
                                        className="block text-xs font-bold text-slate-600"
                                    >
                                        Ends on
                                    </label>
                                    <input
                                        id="recurrence-until"
                                        type="date"
                                        value={eventForm.recurrenceUntil}
                                        min={eventForm.startTime.slice(0, 10)}
                                        onChange={(event) =>
                                            setEventForm((current) => ({
                                                ...current,
                                                recurrenceUntil: event.target.value,
                                            }))
                                        }
                                        required
                                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5"
                                    />
                                </div>
                            </div>
                        ) : null}
                        <p className="mt-2 text-xs text-slate-500">
                            Recurring events are added through the selected end date.
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

                        {canEditEvent(selectedEvent) ? (
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
                                        setDeleteEventError(null);
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
                            <div>
                                <p className="text-sm font-bold text-slate-700">Calendar color</p>
                                <CalendarColorPicker
                                    id="settings-color"
                                    value={settings.color}
                                    onChange={(color) => setSettings((current) => ({ ...current, color }))}
                                    disabled={isSaving}
                                />
                            </div>
                            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                                <input
                                    type="checkbox"
                                    checked={settings.allowMembersToEditEvents}
                                    onChange={(event) =>
                                        setSettings((current) => ({
                                            ...current,
                                            allowMembersToEditEvents: event.target.checked,
                                        }))
                                    }
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                                />
                                <span>
                                    <span className="block font-bold text-slate-900">Let members edit all events</span>
                                    <span className="block text-sm text-slate-500">
                                        When enabled, every calendar member can edit events created by other members.
                                        Only the owner and event creator can delete them.
                                    </span>
                                </span>
                            </label>
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
                        {isOwner && !calendar.isPersonal ? (
                            <div className="mt-3 space-y-4">
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <label htmlFor="member-search" className="sr-only">
                                        Search members
                                    </label>
                                    <input
                                        id="member-search"
                                        type="search"
                                        value={memberSearchText}
                                        onChange={(event) => setMemberSearchText(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                                event.preventDefault();
                                                handleSearchMembers();
                                            }
                                        }}
                                        placeholder="Display name or part of an email"
                                        className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSearchMembers}
                                        disabled={isSearchingMembers || memberSearchText.trim().length < 2}
                                        className="rounded-xl border border-blue-200 px-4 py-2.5 font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                                    >
                                        {isSearchingMembers ? "Searching..." : "Search"}
                                    </button>
                                </div>

                                <div>
                                    <p className="mb-2 text-sm font-bold text-slate-700">Friends you can add</p>
                                    <div className="divide-y divide-slate-200 rounded-xl border border-slate-200">
                                        {(memberSearchText.trim() ? memberSearchResults : friends)
                                            .filter((friend) => !calendar.memberIds.includes(friend.uid))
                                            .map((friend) => (
                                                <div
                                                    key={friend.uid}
                                                    className="flex items-center justify-between gap-4 p-3"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold text-slate-900">
                                                            {friend.displayName}
                                                        </p>
                                                        <p className="truncate text-sm text-slate-500">
                                                            {friend.email}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAddFriendToCalendar(friend)}
                                                        disabled={isSaving}
                                                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            ))}
                                        {(memberSearchText.trim() ? memberSearchResults : friends).filter(
                                            (friend) => !calendar.memberIds.includes(friend.uid)
                                        ).length === 0 ? (
                                            <p className="p-3 text-sm text-slate-500">
                                                {memberSearchText.trim()
                                                    ? "No matching users are available to add."
                                                    : "All of your friends are already members."}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
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
                        {calendar.isPersonal ? (
                            <p className="text-sm text-slate-500">
                                Your personal calendar is private and cannot be shared or deleted.
                            </p>
                        ) : isOwner ? (
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
                onClose={() => {
                    setEventToDelete(null);
                    setDeleteEventError(null);
                }}
                size="sm"
                closeDisabled={isSaving}
            >
                <p className="text-slate-600">
                    Delete <strong>{eventToDelete?.title}</strong>? This cannot be undone.
                </p>
                {eventToDelete?.isRecurring ? (
                    <div className="mt-5 grid gap-2">
                        <button
                            type="button"
                            onClick={() => handleDeleteEvent("single")}
                            disabled={isSaving}
                            className="rounded-xl border border-red-200 px-4 py-3 text-left font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                            {deletingScope === "single" ? "Deleting..." : "Only this event"}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDeleteEvent("following")}
                            disabled={isSaving}
                            className="rounded-xl border border-red-200 px-4 py-3 text-left font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                            {deletingScope === "following" ? "Deleting..." : "This and following events"}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDeleteEvent("series")}
                            disabled={isSaving}
                            className="rounded-xl border border-red-200 px-4 py-3 text-left font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                            {deletingScope === "series" ? "Deleting..." : "All events in the series"}
                        </button>
                    </div>
                ) : null}
                {deleteEventError ? (
                    <p
                        role="alert"
                        className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                        {deleteEventError}
                    </p>
                ) : null}
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setEventToDelete(null);
                            setDeleteEventError(null);
                        }}
                        disabled={isSaving}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700"
                    >
                        Cancel
                    </button>
                    {!eventToDelete?.isRecurring ? (
                        <button
                            type="button"
                            onClick={() => handleDeleteEvent("single")}
                            disabled={isSaving}
                            className="rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                            {isSaving ? "Deleting..." : "Delete event"}
                        </button>
                    ) : null}
                </div>
            </Modal>
        </main>
    );
}
