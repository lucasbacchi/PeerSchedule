import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    deleteDoc,
    deleteField,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where,
    writeBatch,
} from "firebase/firestore";
import { Timestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Group } from "@/types/database";

const GROUPS_COLLECTION = "groups";
const EVENTS_COLLECTION = "events";
const EVENT_DETAILS_COLLECTION = "eventDetails";
const TIME_POLLS_COLLECTION = "timePolls";

export interface CreateCalendarInput {
    name: string;
    description?: string;
    color?: string;
    ownerId: string;
}

export interface UpdateCalendarInput {
    name?: string;
    description?: string;
    color?: string;
}

const calendarFromDocument = (id: string, data: Record<string, unknown>): Group => ({
    id,
    name: typeof data.name === "string" ? data.name : "Untitled Calendar",
    description: typeof data.description === "string" ? data.description : undefined,
    color: typeof data.color === "string" ? data.color : "#2563eb",
    ownerId: typeof data.ownerId === "string" ? data.ownerId : "",
    memberIds: Array.isArray(data.memberIds) ? data.memberIds.filter((value) => typeof value === "string") : [],
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : undefined,
});

const validateCalendarName = (name: string): string => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
        throw new Error("Calendar name must be between 2 and 80 characters.");
    }
    return trimmedName;
};

export const getUserCalendars = async (uid: string): Promise<Group[]> => {
    const groupsQuery = query(collection(db, GROUPS_COLLECTION), where("memberIds", "array-contains", uid));
    const snapshot = await getDocs(groupsQuery);

    return snapshot.docs
        .map((groupDocument) => calendarFromDocument(groupDocument.id, groupDocument.data()))
        .sort((first, second) => first.name.localeCompare(second.name));
};

export const getAllCalendars = async (): Promise<Group[]> => {
    const snapshot = await getDocs(collection(db, GROUPS_COLLECTION));
    return snapshot.docs.map((groupDocument) => calendarFromDocument(groupDocument.id, groupDocument.data()));
};

export const createCalendar = async (input: CreateCalendarInput): Promise<Group> => {
    const name = validateCalendarName(input.name);
    const description = input.description?.trim().slice(0, 300) ?? "";
    const trimmedColor = input.color?.trim();
    const color = trimmedColor && trimmedColor.length > 0 ? trimmedColor : "#2563eb";
    const now = Timestamp.now();

    const newCalendar: Omit<Group, "id"> = {
        name,
        description,
        color,
        ownerId: input.ownerId,
        memberIds: [input.ownerId],
        createdAt: now,
        updatedAt: now,
    };

    const documentReference = await addDoc(collection(db, GROUPS_COLLECTION), newCalendar);
    return { id: documentReference.id, ...newCalendar };
};

export const getCalendarById = async (calendarId: string): Promise<Group | null> => {
    const snapshot = await getDoc(doc(db, GROUPS_COLLECTION, calendarId));
    return snapshot.exists() ? calendarFromDocument(snapshot.id, snapshot.data()) : null;
};

export const updateCalendar = async (calendarId: string, input: UpdateCalendarInput): Promise<void> => {
    const updateData: Record<string, unknown> = { updatedAt: Timestamp.now() };

    if (input.name !== undefined) {
        updateData.name = validateCalendarName(input.name);
    }

    if (input.description !== undefined) {
        updateData.description = input.description.trim().slice(0, 300);
    }

    if (input.color !== undefined) {
        updateData.color = input.color;
    }

    await updateDoc(doc(db, GROUPS_COLLECTION, calendarId), updateData);
};

export const addCalendarMember = async (calendarId: string, userId: string): Promise<void> => {
    await updateDoc(doc(db, GROUPS_COLLECTION, calendarId), {
        memberIds: arrayUnion(userId),
        updatedAt: Timestamp.now(),
    });
};

export const removeCalendarMember = async (calendarId: string, userId: string): Promise<void> => {
    const calendar = await getCalendarById(calendarId);
    if (!calendar) {
        throw new Error("Calendar not found.");
    }

    if (calendar.ownerId === userId) {
        throw new Error("The calendar owner cannot be removed.");
    }

    const eventsQuery = query(collection(db, EVENTS_COLLECTION), where("calendarId", "==", calendarId));
    const eventSnapshot = await getDocs(eventsQuery);

    // Removing a member must also revoke access to existing events in the calendar.
    // Update both the public event document and the private details document so the
    // former member loses participant and viewer access.
    for (let start = 0; start < eventSnapshot.docs.length; start += 225) {
        const batch = writeBatch(db);

        for (const eventDocument of eventSnapshot.docs.slice(start, start + 225)) {
            batch.update(eventDocument.ref, {
                [`participants.${userId}`]: deleteField(),
                participantIds: arrayRemove(userId),
                updatedAt: Timestamp.now(),
            });
            batch.update(doc(db, EVENT_DETAILS_COLLECTION, eventDocument.id), {
                viewerIds: arrayRemove(userId),
                updatedAt: Timestamp.now(),
            });
        }

        await batch.commit();
    }

    await updateDoc(doc(db, GROUPS_COLLECTION, calendarId), {
        memberIds: arrayRemove(userId),
        updatedAt: Timestamp.now(),
    });
};

export const deleteCalendar = async (calendarId: string): Promise<void> => {
    const eventsQuery = query(collection(db, EVENTS_COLLECTION), where("calendarId", "==", calendarId));
    const eventSnapshot = await getDocs(eventsQuery);

    // Each event requires two deletes: its public schedule document and its
    // private detail document. Keep each batch comfortably below 500 writes.
    const eventDocuments = eventSnapshot.docs;
    for (let start = 0; start < eventDocuments.length; start += 225) {
        const batch = writeBatch(db);
        for (const eventDocument of eventDocuments.slice(start, start + 225)) {
            batch.delete(doc(db, EVENT_DETAILS_COLLECTION, eventDocument.id));
            batch.delete(eventDocument.ref);
        }
        await batch.commit();
    }

    const pollsQuery = query(collection(db, TIME_POLLS_COLLECTION), where("calendarId", "==", calendarId));
    const pollSnapshot = await getDocs(pollsQuery);
    for (let start = 0; start < pollSnapshot.docs.length; start += 450) {
        const batch = writeBatch(db);
        for (const pollDocument of pollSnapshot.docs.slice(start, start + 450)) {
            batch.delete(pollDocument.ref);
        }
        await batch.commit();
    }

    await deleteDoc(doc(db, GROUPS_COLLECTION, calendarId));
};
