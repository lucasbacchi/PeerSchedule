import {
    Timestamp,
    arrayRemove,
    arrayUnion,
    collection,
    deleteField,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { CalendarEvent, EventType, ParticipantStatus, Visibility } from "@/types/database";

const EVENTS_COLLECTION = "events";
const EVENT_DETAILS_COLLECTION = "eventDetails";

export interface CreateCalendarEventInput {
    title: string;
    description?: string;
    location?: string;
    startTime: Timestamp;
    endTime: Timestamp;
    type: EventType;
    calendarId: string | null;
    creatorId: string;
    visibility: Visibility;
    participants?: Record<string, ParticipantStatus>;
    detailViewerIds?: string[];
    isRecurring?: boolean;
    recurrenceRule?: string;
    recurrenceUntil?: Timestamp;
}

export interface UpdateCalendarEventInput {
    title?: string;
    description?: string;
    location?: string;
    startTime?: Timestamp;
    endTime?: Timestamp;
    type?: EventType;
    visibility?: Visibility;
    participants?: Record<string, ParticipantStatus>;
    detailViewerIds?: string[];
    isRecurring?: boolean;
    recurrenceRule?: string;
    recurrenceUntil?: Timestamp;
}

export type DeleteEventScope = "single" | "series" | "following";

interface EventDetails {
    title: string;
    description: string;
    location: string;
    creatorId: string;
    calendarId: string | null;
    visibility: Visibility;
    viewerIds: string[];
    updatedAt: Timestamp;
}

type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

interface EventInstancePayload {
    publicEvent: Omit<CalendarEvent, "id" | "detailsAvailable" | "detailViewerIds">;
    privateDetails: EventDetails;
}

const eventFromDocument = (id: string, data: Record<string, unknown>): CalendarEvent => {
    const participants =
        data.participants && typeof data.participants === "object"
            ? (data.participants as Record<string, ParticipantStatus>)
            : {};

    return {
        id,
        title: typeof data.title === "string" ? data.title : "Untitled Event",
        description: typeof data.description === "string" ? data.description : "",
        location: typeof data.location === "string" ? data.location : undefined,
        startTime: data.startTime instanceof Timestamp ? data.startTime : Timestamp.now(),
        endTime: data.endTime instanceof Timestamp ? data.endTime : Timestamp.now(),
        type:
            data.type === "open_event" || data.type === "blocked_time" || data.type === "meeting"
                ? data.type
                : "meeting",
        calendarId: typeof data.calendarId === "string" ? data.calendarId : null,
        creatorId: typeof data.creatorId === "string" ? data.creatorId : "",
        visibility:
            data.visibility === "friends_only" || data.visibility === "busy_only" || data.visibility === "full_details"
                ? data.visibility
                : "full_details",
        participants,
        participantIds: Array.isArray(data.participantIds)
            ? data.participantIds.filter((value): value is string => typeof value === "string")
            : Object.keys(participants),
        isRecurring: data.isRecurring === true,
        recurrenceRule: typeof data.recurrenceRule === "string" ? data.recurrenceRule : undefined,
        recurrenceUntil: data.recurrenceUntil instanceof Timestamp ? data.recurrenceUntil : undefined,
        recurrenceSeriesId: typeof data.recurrenceSeriesId === "string" ? data.recurrenceSeriesId : undefined,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : undefined,
        detailsAvailable: data.visibility === "full_details",
    };
};

const detailsFromDocument = (data: Record<string, unknown>): EventDetails => ({
    title: typeof data.title === "string" ? data.title : "Untitled Event",
    description: typeof data.description === "string" ? data.description : "",
    location: typeof data.location === "string" ? data.location : "",
    creatorId: typeof data.creatorId === "string" ? data.creatorId : "",
    calendarId: typeof data.calendarId === "string" ? data.calendarId : null,
    visibility:
        data.visibility === "friends_only" || data.visibility === "busy_only" || data.visibility === "full_details"
            ? data.visibility
            : "full_details",
    viewerIds: Array.isArray(data.viewerIds)
        ? data.viewerIds.filter((value): value is string => typeof value === "string")
        : [],
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : Timestamp.now(),
});

const hydratePrivateDetails = async (event: CalendarEvent): Promise<CalendarEvent> => {
    if (event.visibility === "full_details") {
        return { ...event, detailsAvailable: true };
    }

    try {
        const detailsSnapshot = await getDoc(doc(db, EVENT_DETAILS_COLLECTION, event.id));
        if (!detailsSnapshot.exists()) {
            return { ...event, detailsAvailable: false };
        }

        const details = detailsFromDocument(detailsSnapshot.data());
        return {
            ...event,
            title: details.title,
            description: details.description,
            location: details.location,
            detailsAvailable: true,
            detailViewerIds: details.viewerIds,
        };
    } catch (error: unknown) {
        // Permission-denied is expected when the current user may see the busy block
        // but is not allowed to read its private details.
        if (error instanceof Error && !error.message.toLowerCase().includes("permission")) {
            console.error(`Unable to load private details for event ${event.id}:`, error);
        }
        return { ...event, title: "Busy", description: "", location: "", detailsAvailable: false };
    }
};

const hydrateEvents = async (events: CalendarEvent[]): Promise<CalendarEvent[]> =>
    Promise.all(events.map((event) => hydratePrivateDetails(event)));

const validateEventTimes = (startTime: Timestamp, endTime: Timestamp): void => {
    if (endTime.toMillis() <= startTime.toMillis()) {
        throw new Error("The event end time must be later than the start time.");
    }
};

const validateTitle = (title: string): string => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 120) {
        throw new Error("Event title must be between 2 and 120 characters.");
    }
    return trimmedTitle;
};

const buildPublicFields = (
    visibility: Visibility,
    title: string,
    description: string,
    location: string
): Pick<CalendarEvent, "title" | "description" | "location"> =>
    visibility === "full_details" ? { title, description, location } : { title: "Busy", description: "", location: "" };

const parseRecurrenceFrequency = (recurrenceRule: string): RecurrenceFrequency => {
    const frequencyMatch = /^FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)$/i.exec(recurrenceRule.trim());

    if (!frequencyMatch) {
        throw new Error("Use a supported recurrence rule.");
    }

    return frequencyMatch[1].toUpperCase() as RecurrenceFrequency;
};

const addRecurrenceStep = (date: Date, frequency: RecurrenceFrequency): Date => {
    const nextDate = new Date(date);

    switch (frequency) {
        case "DAILY":
            nextDate.setDate(nextDate.getDate() + 1);
            break;
        case "WEEKLY":
            nextDate.setDate(nextDate.getDate() + 7);
            break;
        case "MONTHLY":
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
        case "YEARLY":
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
    }

    return nextDate;
};

const buildRecurringInstances = (
    input: CreateCalendarEventInput,
    publicFields: Pick<CalendarEvent, "title" | "description" | "location">,
    seriesId = doc(collection(db, EVENTS_COLLECTION)).id
): EventInstancePayload[] => {
    const recurrenceRule = input.recurrenceRule?.trim() ?? "";
    const frequency = parseRecurrenceFrequency(recurrenceRule);
    const startDate = input.startTime.toDate();
    const endDate = input.endTime.toDate();
    const durationMs = endDate.getTime() - startDate.getTime();
    const horizon = input.recurrenceUntil?.toDate();
    if (!horizon || horizon < startDate) {
        throw new Error("The recurrence end date must be on or after the event start date.");
    }

    const participants: Record<string, ParticipantStatus> = {
        ...(input.participants ?? {}),
        [input.creatorId]: "accepted",
    };
    const participantIds = Object.keys(participants);
    const viewerIds = [...new Set([input.creatorId, ...participantIds, ...(input.detailViewerIds ?? [])])];
    const createdAt = Timestamp.now();

    const instances: EventInstancePayload[] = [];
    let currentStart = new Date(startDate);

    while (currentStart < horizon) {
        const currentEnd = new Date(currentStart.getTime() + durationMs);

        instances.push({
            publicEvent: {
                ...publicFields,
                startTime: Timestamp.fromDate(new Date(currentStart)),
                endTime: Timestamp.fromDate(currentEnd),
                type: input.type,
                calendarId: input.calendarId,
                creatorId: input.creatorId,
                visibility: input.visibility,
                participants,
                participantIds,
                isRecurring: true,
                recurrenceRule,
                recurrenceUntil: input.recurrenceUntil,
                recurrenceSeriesId: seriesId,
                createdAt,
                updatedAt: createdAt,
            },
            privateDetails: {
                title: input.title.trim(),
                description: input.description?.trim().slice(0, 1000) ?? "",
                location: input.location?.trim().slice(0, 160) ?? "",
                creatorId: input.creatorId,
                calendarId: input.calendarId,
                visibility: input.visibility,
                viewerIds,
                updatedAt: createdAt,
            },
        });

        currentStart = addRecurrenceStep(currentStart, frequency);
    }

    return instances;
};

const persistEventInstances = async (instances: EventInstancePayload[]): Promise<void> => {
    for (let start = 0; start < instances.length; start += 200) {
        const batch = writeBatch(db);

        for (const instance of instances.slice(start, start + 200)) {
            const eventReference = doc(collection(db, EVENTS_COLLECTION));
            batch.set(eventReference, instance.publicEvent);
            batch.set(doc(db, EVENT_DETAILS_COLLECTION, eventReference.id), instance.privateDetails);
        }

        await batch.commit();
    }
};

export const createEvent = async (input: CreateCalendarEventInput): Promise<CalendarEvent> => {
    validateEventTimes(input.startTime, input.endTime);
    const title = validateTitle(input.title);
    const description = input.description?.trim().slice(0, 1000) ?? "";
    const location = input.location?.trim().slice(0, 160) ?? "";
    const publicFields = buildPublicFields(input.visibility, title, description, location);

    if (input.isRecurring) {
        if (!input.recurrenceRule?.trim()) {
            throw new Error("A recurrence rule is required for recurring events.");
        }

        const recurringInstances = buildRecurringInstances(input, publicFields);
        await persistEventInstances(recurringInstances);

        const firstInstance = recurringInstances[0];
        return {
            id: "",
            ...firstInstance.publicEvent,
            title,
            description,
            location,
            detailsAvailable: true,
            detailViewerIds: firstInstance.privateDetails.viewerIds,
        };
    }

    const participants: Record<string, ParticipantStatus> = {
        ...(input.participants ?? {}),
        [input.creatorId]: "accepted",
    };
    const participantIds = Object.keys(participants);
    const viewerIds = [...new Set([input.creatorId, ...participantIds, ...(input.detailViewerIds ?? [])])];
    const now = Timestamp.now();
    const eventReference = doc(collection(db, EVENTS_COLLECTION));

    const publicEvent: Omit<CalendarEvent, "id" | "detailsAvailable" | "detailViewerIds"> = {
        ...publicFields,
        startTime: input.startTime,
        endTime: input.endTime,
        type: input.type,
        calendarId: input.calendarId,
        creatorId: input.creatorId,
        visibility: input.visibility,
        participants,
        participantIds,
        isRecurring: false,
        recurrenceRule: undefined,
        createdAt: now,
        updatedAt: now,
    };

    const privateDetails: EventDetails = {
        title,
        description,
        location,
        creatorId: input.creatorId,
        calendarId: input.calendarId,
        visibility: input.visibility,
        viewerIds,
        updatedAt: now,
    };

    const batch = writeBatch(db);
    batch.set(eventReference, publicEvent);
    batch.set(doc(db, EVENT_DETAILS_COLLECTION, eventReference.id), privateDetails);
    await batch.commit();

    return {
        id: eventReference.id,
        ...publicEvent,
        title,
        description,
        location,
        detailsAvailable: true,
        detailViewerIds: viewerIds,
    };
};

export const getEventById = async (eventId: string): Promise<CalendarEvent | null> => {
    const snapshot = await getDoc(doc(db, EVENTS_COLLECTION, eventId));
    return snapshot.exists() ? hydratePrivateDetails(eventFromDocument(snapshot.id, snapshot.data())) : null;
};

export const getEventsByCalendarId = async (calendarId: string): Promise<CalendarEvent[]> => {
    const eventsQuery = query(collection(db, EVENTS_COLLECTION), where("calendarId", "==", calendarId));
    const snapshot = await getDocs(eventsQuery);
    const events = snapshot.docs
        .map((eventDocument) => eventFromDocument(eventDocument.id, eventDocument.data()))
        .sort((first, second) => first.startTime.toMillis() - second.startTime.toMillis());
    return hydrateEvents(events);
};

export const getUserEvents = async (uid: string): Promise<CalendarEvent[]> => {
    const eventsReference = collection(db, EVENTS_COLLECTION);
    const participantSnapshot = await getDocs(
        query(eventsReference, where("participantIds", "array-contains", uid))
    );
    const sortedEvents = participantSnapshot.docs
        .map((eventDocument) => eventFromDocument(eventDocument.id, eventDocument.data()))
        .sort((first, second) => first.startTime.toMillis() - second.startTime.toMillis());
    return hydrateEvents(sortedEvents);
};

export const updateEvent = async (eventId: string, input: UpdateCalendarEventInput): Promise<void> => {
    const existingEvent = await getEventById(eventId);
    if (!existingEvent) {
        throw new Error("Event not found.");
    }

    const startTime = input.startTime ?? existingEvent.startTime;
    const endTime = input.endTime ?? existingEvent.endTime;
    validateEventTimes(startTime, endTime);

    const nextTitle = input.title === undefined ? existingEvent.title : validateTitle(input.title);
    const nextDescription = input.description?.trim().slice(0, 1000) ?? existingEvent.description;
    const nextLocation = input.location?.trim().slice(0, 160) ?? existingEvent.location ?? "";
    const nextVisibility = input.visibility ?? existingEvent.visibility;
    const nextParticipants = input.participants
        ? { ...input.participants, [existingEvent.creatorId]: "accepted" as const }
        : existingEvent.participants;
    const nextParticipantIds = Object.keys(nextParticipants);
    const nextIsRecurring = input.isRecurring ?? existingEvent.isRecurring;
    const nextRule = input.recurrenceRule ?? existingEvent.recurrenceRule;
    const nextRecurrenceUntil = input.recurrenceUntil ?? existingEvent.recurrenceUntil;
    const nextRecurrenceSeriesId =
        nextIsRecurring && !existingEvent.recurrenceSeriesId
            ? doc(collection(db, EVENTS_COLLECTION)).id
            : existingEvent.recurrenceSeriesId;

    if (nextIsRecurring && (!nextRule?.trim() || !nextRecurrenceUntil)) {
        throw new Error("A recurrence rule and end date are required for recurring events.");
    }

    const now = Timestamp.now();
    const viewerIds = [
        ...new Set([
            existingEvent.creatorId,
            ...nextParticipantIds,
            ...(input.detailViewerIds ?? existingEvent.detailViewerIds ?? []),
        ]),
    ];
    const publicFields = buildPublicFields(nextVisibility, nextTitle, nextDescription, nextLocation);

    const publicUpdate: Record<string, unknown> = {
        ...publicFields,
        startTime,
        endTime,
        type: input.type ?? existingEvent.type,
        visibility: nextVisibility,
        participants: nextParticipants,
        participantIds: nextParticipantIds,
        isRecurring: nextIsRecurring,
        updatedAt: now,
        recurrenceRule: nextIsRecurring ? nextRule?.trim() : deleteField(),
        recurrenceUntil: nextIsRecurring ? nextRecurrenceUntil : deleteField(),
        recurrenceSeriesId: nextIsRecurring ? nextRecurrenceSeriesId : deleteField(),
    };

    const detailsUpdate: EventDetails = {
        title: nextTitle,
        description: nextDescription,
        location: nextLocation,
        creatorId: existingEvent.creatorId,
        calendarId: existingEvent.calendarId,
        visibility: nextVisibility,
        viewerIds,
        updatedAt: now,
    };

    const batch = writeBatch(db);
    batch.update(doc(db, EVENTS_COLLECTION, eventId), publicUpdate);
    batch.set(doc(db, EVENT_DETAILS_COLLECTION, eventId), detailsUpdate, { merge: true });
    await batch.commit();

    if (!existingEvent.isRecurring && nextIsRecurring && nextRecurrenceUntil && nextRecurrenceSeriesId) {
        const recurringInstances = buildRecurringInstances(
            {
                title: nextTitle,
                description: nextDescription,
                location: nextLocation,
                startTime,
                endTime,
                type: input.type ?? existingEvent.type,
                calendarId: existingEvent.calendarId,
                creatorId: existingEvent.creatorId,
                visibility: nextVisibility,
                participants: nextParticipants,
                detailViewerIds: viewerIds,
                isRecurring: true,
                recurrenceRule: nextRule,
                recurrenceUntil: nextRecurrenceUntil,
            },
            publicFields,
            nextRecurrenceSeriesId
        );

        await persistEventInstances(recurringInstances.slice(1));
    }
};

export const deleteEvent = async (eventId: string, scope: DeleteEventScope = "single"): Promise<void> => {
    const selectedEvent = await getEventById(eventId);
    if (!selectedEvent) return;

    let eventIds = [eventId];

    if (scope !== "single" && selectedEvent.isRecurring) {
        const snapshot =
            selectedEvent.calendarId === null
                ? await getDocs(
                      query(collection(db, EVENTS_COLLECTION), where("creatorId", "==", selectedEvent.creatorId))
                  )
                : await getDocs(
                      query(collection(db, EVENTS_COLLECTION), where("calendarId", "==", selectedEvent.calendarId))
                  );

        eventIds = snapshot.docs
            .filter((eventDocument) => {
                const candidate = eventFromDocument(eventDocument.id, eventDocument.data());
                const belongsToSeries = selectedEvent.recurrenceSeriesId
                    ? candidate.recurrenceSeriesId === selectedEvent.recurrenceSeriesId
                    : candidate.isRecurring &&
                      candidate.creatorId === selectedEvent.creatorId &&
                      candidate.createdAt.toMillis() === selectedEvent.createdAt.toMillis() &&
                      candidate.recurrenceRule === selectedEvent.recurrenceRule;

                return (
                    belongsToSeries &&
                    (scope === "series" || candidate.startTime.toMillis() >= selectedEvent.startTime.toMillis())
                );
            })
            .map((eventDocument) => eventDocument.id);
    }

    for (let start = 0; start < eventIds.length; start += 225) {
        const batch = writeBatch(db);
        for (const id of eventIds.slice(start, start + 225)) {
            batch.delete(doc(db, EVENT_DETAILS_COLLECTION, id));
            batch.delete(doc(db, EVENTS_COLLECTION, id));
        }
        await batch.commit();
    }
};

export const updateParticipantStatus = async (
    eventId: string,
    participantId: string,
    status: ParticipantStatus
): Promise<void> => {
    await updateDoc(doc(db, EVENTS_COLLECTION, eventId), {
        [`participants.${participantId}`]: status,
        participantIds: arrayUnion(participantId),
        updatedAt: Timestamp.now(),
    });
};

export const removeParticipant = async (eventId: string, participantId: string): Promise<void> => {
    await updateDoc(doc(db, EVENTS_COLLECTION, eventId), {
        [`participants.${participantId}`]: deleteField(),
        participantIds: arrayRemove(participantId),
        updatedAt: Timestamp.now(),
    });
};

export const getEventsByCreatorId = async (creatorId: string): Promise<CalendarEvent[]> => {
    const eventsQuery = query(collection(db, EVENTS_COLLECTION), where("creatorId", "==", creatorId));
    const snapshot = await getDocs(eventsQuery);
    return hydrateEvents(
        snapshot.docs.map((eventDocument) => eventFromDocument(eventDocument.id, eventDocument.data()))
    );
};

export const getEventsByParticipantId = async (participantId: string): Promise<CalendarEvent[]> => {
    const eventsQuery = query(
        collection(db, EVENTS_COLLECTION),
        where("participantIds", "array-contains", participantId)
    );
    const snapshot = await getDocs(eventsQuery);
    return hydrateEvents(
        snapshot.docs.map((eventDocument) => eventFromDocument(eventDocument.id, eventDocument.data()))
    );
};

export const getEventsByType = async (type: EventType): Promise<CalendarEvent[]> => {
    const eventsQuery = query(collection(db, EVENTS_COLLECTION), where("type", "==", type));
    const snapshot = await getDocs(eventsQuery);
    return hydrateEvents(
        snapshot.docs.map((eventDocument) => eventFromDocument(eventDocument.id, eventDocument.data()))
    );
};

export const getEventsByParticipantStatus = async (
    participantId: string,
    status: ParticipantStatus
): Promise<CalendarEvent[]> => {
    const eventsQuery = query(collection(db, EVENTS_COLLECTION), where(`participants.${participantId}`, "==", status));
    const snapshot = await getDocs(eventsQuery);
    return hydrateEvents(
        snapshot.docs.map((eventDocument) => eventFromDocument(eventDocument.id, eventDocument.data()))
    );
};

export const getAllEvents = async (): Promise<CalendarEvent[]> => {
    const snapshot = await getDocs(collection(db, EVENTS_COLLECTION));
    return hydrateEvents(
        snapshot.docs.map((eventDocument) => eventFromDocument(eventDocument.id, eventDocument.data()))
    );
};
