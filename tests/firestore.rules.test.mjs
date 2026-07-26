import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";

import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
    Timestamp,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";

const projectId = "peerschedule-rules-test";
let testEnvironment;

const user = (uid, role = "user") => ({
    uid,
    displayName: uid,
    displayNameLower: uid.toLowerCase(),
    email: `${uid.toLowerCase()}@example.com`,
    emailLower: `${uid.toLowerCase()}@example.com`,
    searchTokens: [uid.toLowerCase(), "example"],
    role,
    friendIds: [],
    createdAt: Timestamp.now(),
});

const calendar = {
    name: "Shared Calendar",
    description: "",
    color: "#2563eb",
    ownerId: "owner",
    memberIds: ["owner", "member"],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
};

const event = {
    title: "Project meeting",
    description: "",
    location: "",
    startTime: Timestamp.fromMillis(2_000_000),
    endTime: Timestamp.fromMillis(2_060_000),
    type: "meeting",
    calendarId: "calendar",
    creatorId: "owner",
    visibility: "full_details",
    participants: { owner: "accepted", member: "pending" },
    participantIds: ["owner", "member"],
    isRecurring: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
};

before(async () => {
    testEnvironment = await initializeTestEnvironment({
        projectId,
        firestore: {
            rules: await readFile("firestore.rules", "utf8"),
            host: "127.0.0.1",
            port: 8080,
        },
    });
});

beforeEach(async () => {
    await testEnvironment.clearFirestore();
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
        const database = context.firestore();
        await Promise.all([
            setDoc(doc(database, "users", "owner"), user("Owner")),
            setDoc(doc(database, "users", "member"), user("Member")),
            setDoc(doc(database, "users", "outsider"), user("Outsider")),
            setDoc(doc(database, "users", "admin"), user("Admin", "admin")),
            setDoc(doc(database, "groups", "calendar"), calendar),
            setDoc(doc(database, "events", "event"), event),
        ]);
    });
});

after(async () => {
    await testEnvironment?.cleanup();
});

test("signed-out users cannot read calendars", async () => {
    const database = testEnvironment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(database, "groups", "calendar")));
});

test("members can read their shared calendar", async () => {
    const database = testEnvironment.authenticatedContext("member").firestore();
    await assertSucceeds(getDoc(doc(database, "groups", "calendar")));
});

test("nonmembers cannot read a private calendar", async () => {
    const database = testEnvironment.authenticatedContext("outsider").firestore();
    await assertFails(getDoc(doc(database, "groups", "calendar")));
});

test("members can create valid events", async () => {
    const database = testEnvironment.authenticatedContext("member").firestore();
    await assertSucceeds(
        setDoc(doc(database, "events", "member-event"), {
            ...event,
            creatorId: "member",
            participants: { member: "accepted" },
            participantIds: ["member"],
        })
    );
});

test("nonmembers cannot create events on private calendars", async () => {
    const database = testEnvironment.authenticatedContext("outsider").firestore();
    await assertFails(
        setDoc(doc(database, "events", "outsider-event"), {
            ...event,
            creatorId: "outsider",
            participants: { outsider: "accepted" },
            participantIds: ["outsider"],
        })
    );
});

test("participants can update only their own RSVP", async () => {
    const database = testEnvironment.authenticatedContext("member").firestore();
    const eventReference = doc(database, "events", "event");
    await assertSucceeds(
        updateDoc(eventReference, {
            "participants.member": "accepted",
            participantIds: ["owner", "member"],
            updatedAt: Timestamp.now(),
        })
    );
    await assertFails(
        updateDoc(eventReference, {
            "participants.owner": "declined",
            participantIds: ["owner", "member"],
            updatedAt: Timestamp.now(),
        })
    );
});

test("normal users cannot perform admin reads", async () => {
    const database = testEnvironment.authenticatedContext("member").firestore();
    await assertFails(getDocs(collection(database, "groups")));
});

test("user directory searches must be constrained and limited", async () => {
    const database = testEnvironment.authenticatedContext("member").firestore();
    await assertSucceeds(
        getDocs(query(collection(database, "users"), where("searchTokens", "array-contains", "example"), limit(20)))
    );
    await assertFails(getDocs(collection(database, "users")));
});

test("members can create time polls and outsiders cannot", async () => {
    const poll = {
        calendarId: "calendar",
        creatorId: "member",
        title: "Project planning",
        participantIds: ["member", "owner"],
        options: [
            {
                id: "1",
                startTime: Timestamp.fromMillis(3_000_000),
                endTime: Timestamp.fromMillis(3_060_000),
                voterIds: ["member"],
            },
            {
                id: "2",
                startTime: Timestamp.fromMillis(4_000_000),
                endTime: Timestamp.fromMillis(4_060_000),
                voterIds: ["member"],
            },
        ],
        status: "open",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };
    const memberDatabase = testEnvironment.authenticatedContext("member").firestore();
    await assertSucceeds(setDoc(doc(memberDatabase, "timePolls", "member-poll"), poll));

    const outsiderDatabase = testEnvironment.authenticatedContext("outsider").firestore();
    await assertFails(
        setDoc(doc(outsiderDatabase, "timePolls", "outsider-poll"), {
            ...poll,
            creatorId: "outsider",
            participantIds: ["outsider"],
        })
    );
});
