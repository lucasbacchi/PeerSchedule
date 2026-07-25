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
}

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

export const createEvent = async (input: CreateCalendarEventInput): Promise<CalendarEvent> => {
    validateEventTimes(input.startTime, input.endTime);
    const title = validateTitle(input.title);
    const description = input.description?.trim().slice(0, 1000) ?? "";
    const location = input.location?.trim().slice(0, 160) ?? "";
    const participants: Record<string, ParticipantStatus> = {
        ...(input.participants ?? {}),
        [input.creatorId]: "accepted",
    };

    if (input.isRecurring && !input.recurrenceRule?.trim()) {
        throw new Error("A recurrence rule is required for recurring events.");
    }

    const now = Timestamp.now();
    const eventReference = doc(collection(db, EVENTS_COLLECTION));
    const participantIds = Object.keys(participants);
    const viewerIds = [...new Set([input.creatorId, ...participantIds, ...(input.detailViewerIds ?? [])])];
    const publicFields = buildPublicFields(input.visibility, title, description, location);

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
        isRecurring: input.isRecurring ?? false,
        recurrenceRule: input.isRecurring ? input.recurrenceRule?.trim() : undefined,
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
    const [participantSnapshot, creatorSnapshot] = await Promise.all([
        getDocs(query(eventsReference, where("participantIds", "array-contains", uid))),
        getDocs(query(eventsReference, where("creatorId", "==", uid))),
    ]);

    const events = new Map<string, CalendarEvent>();
    for (const eventDocument of [...participantSnapshot.docs, ...creatorSnapshot.docs]) {
        events.set(eventDocument.id, eventFromDocument(eventDocument.id, eventDocument.data()));
    }

    const sortedEvents = [...events.values()].sort(
        (first, second) => first.startTime.toMillis() - second.startTime.toMillis()
    );
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

    if (nextIsRecurring && !nextRule?.trim()) {
        throw new Error("A recurrence rule is required for recurring events.");
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
};

export const deleteEvent = async (eventId: string): Promise<void> => {
    const batch = writeBatch(db);
    batch.delete(doc(db, EVENT_DETAILS_COLLECTION, eventId));
    batch.delete(doc(db, EVENTS_COLLECTION, eventId));
    await batch.commit();
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
