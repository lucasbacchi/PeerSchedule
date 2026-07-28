import { type Unsubscribe, collection, deleteField, doc, onSnapshot, query, setDoc, where } from "firebase/firestore";

import { db } from "@/lib/firebase";

export type AvailabilityStatus = "available" | "unavailable";

export interface DailyAvailability {
    id: string;
    calendarId: string;
    userId: string;
    date: string;
    slots: Record<string, AvailabilityStatus>;
}

const COLLECTION = "availability";
const documentId = (calendarId: string, userId: string, date: string): string => `${calendarId}_${userId}_${date}`;

export const watchDailyAvailability = (
    calendarId: string,
    date: string,
    onChange: (records: DailyAvailability[]) => void,
    onError: (error: Error) => void
): Unsubscribe =>
    onSnapshot(
        query(collection(db, COLLECTION), where("calendarId", "==", calendarId), where("date", "==", date)),
        (snapshot) =>
            onChange(
                snapshot.docs.map((item) => ({
                    id: item.id,
                    calendarId: item.data().calendarId as string,
                    userId: item.data().userId as string,
                    date: item.data().date as string,
                    slots: (item.data().slots ?? {}) as Record<string, AvailabilityStatus>,
                }))
            ),
        onError
    );

export const setAvailabilitySlot = async (
    calendarId: string,
    userId: string,
    date: string,
    slot: string,
    status: AvailabilityStatus | null
): Promise<void> => {
    const reference = doc(db, COLLECTION, documentId(calendarId, userId, date));
    await setDoc(
        reference,
        {
            calendarId,
            userId,
            date,
            slots: { [slot]: status ?? deleteField() },
        },
        { merge: true }
    );
};

export const setUnavailableSlots = async (
    calendarId: string,
    userId: string,
    date: string,
    slots: string[]
): Promise<void> => {
    if (slots.length === 0) return;
    await setDoc(
        doc(db, COLLECTION, documentId(calendarId, userId, date)),
        {
            calendarId,
            userId,
            date,
            slots: Object.fromEntries(slots.map((slot) => [slot, "unavailable"])),
        },
        { merge: true }
    );
};
