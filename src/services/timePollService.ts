import {
    Timestamp,
    collection,
    doc,
    getDocs,
    query,
    runTransaction,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { TimePoll, TimePollOption } from "@/types/database";

const TIME_POLLS_COLLECTION = "timePolls";

const pollFromDocument = (id: string, data: Record<string, unknown>): TimePoll => ({
    id,
    calendarId: typeof data.calendarId === "string" ? data.calendarId : "",
    creatorId: typeof data.creatorId === "string" ? data.creatorId : "",
    title: typeof data.title === "string" ? data.title : "Choose a time",
    participantIds: Array.isArray(data.participantIds)
        ? data.participantIds.filter((value): value is string => typeof value === "string")
        : [],
    options: Array.isArray(data.options)
        ? data.options
              .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === "object")
              .map((value): TimePollOption => ({
                  id: typeof value.id === "string" ? value.id : "",
                  startTime: value.startTime instanceof Timestamp ? value.startTime : Timestamp.now(),
                  endTime: value.endTime instanceof Timestamp ? value.endTime : Timestamp.now(),
                  voterIds: Array.isArray(value.voterIds)
                      ? value.voterIds.filter((voterId): voterId is string => typeof voterId === "string")
                      : [],
              }))
        : [],
    status: data.status === "closed" ? "closed" : "open",
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : undefined,
});

export const getTimePollsByCalendarId = async (calendarId: string): Promise<TimePoll[]> => {
    const snapshot = await getDocs(query(collection(db, TIME_POLLS_COLLECTION), where("calendarId", "==", calendarId)));
    return snapshot.docs
        .map((pollDocument) => pollFromDocument(pollDocument.id, pollDocument.data()))
        .filter((poll) => poll.status === "open")
        .sort((first, second) => second.createdAt.toMillis() - first.createdAt.toMillis());
};

export const createTimePoll = async (input: {
    calendarId: string;
    creatorId: string;
    title: string;
    participantIds: string[];
    options: { start: Date; end: Date }[];
}): Promise<string> => {
    const reference = doc(collection(db, TIME_POLLS_COLLECTION));
    const now = Timestamp.now();
    await setDoc(reference, {
        calendarId: input.calendarId,
        creatorId: input.creatorId,
        title: input.title.trim().slice(0, 120) || "Choose a time",
        participantIds: [...new Set([input.creatorId, ...input.participantIds])],
        options: input.options.map((option, index) => ({
            id: `${index + 1}`,
            startTime: Timestamp.fromDate(option.start),
            endTime: Timestamp.fromDate(option.end),
            voterIds: [input.creatorId],
        })),
        status: "open",
        createdAt: now,
        updatedAt: now,
    });
    return reference.id;
};

export const setTimePollVote = async (
    pollId: string,
    optionId: string,
    userId: string,
    selected: boolean
): Promise<void> => {
    const reference = doc(db, TIME_POLLS_COLLECTION, pollId);
    await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists()) throw new Error("This time poll no longer exists.");
        const poll = pollFromDocument(snapshot.id, snapshot.data());
        const options = poll.options.map((option) => ({
            ...option,
            voterIds:
                option.id === optionId
                    ? selected
                        ? [...new Set([...option.voterIds, userId])]
                        : option.voterIds.filter((id) => id !== userId)
                    : option.voterIds,
        }));
        transaction.update(reference, { options, updatedAt: Timestamp.now() });
    });
};

export const closeTimePoll = async (pollId: string): Promise<void> => {
    await updateDoc(doc(db, TIME_POLLS_COLLECTION, pollId), {
        status: "closed",
        updatedAt: Timestamp.now(),
    });
};
