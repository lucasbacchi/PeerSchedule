import {
    Timestamp,
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Group } from "@/types/database";

const GROUPS_COLLECTION = "groups";

/**
 * Gets every calendar/group that the user belongs to.
 *
 * The owner is also placed in memberIds when a calendar is created,
 * so this returns both owned and shared calendars.
 */
export const getUserCalendars = async (
    uid: string,
): Promise<Group[]> => {
    const groupsRef = collection(db, GROUPS_COLLECTION);

    const groupsQuery = query(
        groupsRef,
        where("memberIds", "array-contains", uid),
    );

    const snapshot = await getDocs(groupsQuery);

    return snapshot.docs.map((groupDocument) => ({
        id: groupDocument.id,
        ...groupDocument.data(),
    })) as Group[];
};

/**
 * Creates a new calendar/group and returns the completed Group object.
 */
export const createCalendar = async (
    name: string,
    ownerId: string,
): Promise<Group> => {
    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
        throw new Error("Calendar name is required.");
    }

    const newCalendar: Omit<Group, "id"> = {
        name: trimmedName,
        ownerId,
        memberIds: [ownerId],
        createdAt: Timestamp.now(),
    };

    const documentReference = await addDoc(
        collection(db, GROUPS_COLLECTION),
        newCalendar,
    );

    return {
        id: documentReference.id,
        ...newCalendar,
    };
};

/**
 * Gets one calendar using its Firestore document ID.
 */
export const getCalendarById = async (
    calendarId: string,
): Promise<Group | null> => {
    const calendarReference = doc(
        db,
        GROUPS_COLLECTION,
        calendarId,
    );

    const snapshot = await getDoc(calendarReference);

    if (!snapshot.exists()) {
        return null;
    }

    return {
        id: snapshot.id,
        ...snapshot.data(),
    } as Group;
};