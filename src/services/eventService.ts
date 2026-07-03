import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { Event } from "../types/database";
import { db } from "@/lib/firebase";

export const getUserEvents = async (uid: string): Promise<Event[]> => {
    const eventsRef = collection(db, "events");
    // Query for events where this user is invited (regardless of status)
    const q = query(eventsRef, where(`participants.${uid}`, "in", ["accepted", "pending", "declined"]));

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Event[];
};

export const createEvent = async (event: Omit<Event, "id">): Promise<string> => {
    const eventsRef = collection(db, "events");
    const docRef = await addDoc(eventsRef, event);
    return docRef.id;
};

export const getEventById = async (eventId: string): Promise<Event | null> => {
    const eventRef = collection(db, "events");
    const q = query(eventRef, where("id", "==", eventId));
    const snapshot = await getDocs(q);
    const doc = snapshot.docs[0];
    return doc ? ({ id: doc.id, ...doc.data() } as Event) : null;
};

export const getEventsByCalendarId = async (calendarId: string): Promise<Event[]> => {
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, where("calendarId", "==", calendarId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Event[];
};

export const getEventsByCreatorId = async (creatorId: string): Promise<Event[]> => {
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, where("creatorId", "==", creatorId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Event[];
};

export const getEventsByParticipantId = async (participantId: string): Promise<Event[]> => {
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, where(`participants.${participantId}`, "in", ["accepted", "pending", "declined"]));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Event[];
};

export const getEventsByType = async (type: string): Promise<Event[]> => {
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, where("type", "==", type));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Event[];
};

export const getEventsByStatus = async (status: string): Promise<Event[]> => {
    const eventsRef = collection(db, "events");
    const q = query(eventsRef, where("status", "==", status));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Event[];
};
