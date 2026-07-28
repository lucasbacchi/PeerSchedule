import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";

import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import {
    Timestamp,
    collection,
    deleteDoc,
    arrayRemove,
    deleteField,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    setDoc,
    updateDoc,
    where,
    writeBatch,
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
    allowMembersToEditEvents: false,
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
            setDoc(doc(database, "events", "removable-member-event"), {
                ...event,
                creatorId: "member",
                participants: { member: "accepted", owner: "accepted" },
                participantIds: ["member", "owner"],
            }),
            setDoc(doc(database, "eventDetails", "event"), {
                title: event.title,
                description: "",
                location: "",
                creatorId: "owner",
                calendarId: "calendar",
                visibility: "full_details",
                viewerIds: ["owner", "member"],
                updatedAt: Timestamp.now(),
            }),
            setDoc(doc(database, "eventDetails", "removable-member-event"), {
                title: event.title,
                description: "",
                location: "",
                creatorId: "member",
                calendarId: "calendar",
                visibility: "full_details",
                viewerIds: ["member", "owner"],
                updatedAt: Timestamp.now(),
            }),
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

test("legacy calendars without the member-edit field remain editable", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
        const database = context.firestore();
        const { allowMembersToEditEvents: _permission, ...legacyCalendar } = calendar;
        await setDoc(doc(database, "groups", "legacy-calendar"), legacyCalendar);
    });
    const database = testEnvironment.authenticatedContext("owner").firestore();
    await assertSucceeds(
        updateDoc(doc(database, "groups", "legacy-calendar"), {
            name: "Updated legacy calendar",
            updatedAt: Timestamp.now(),
        })
    );
});

test("personal calendars are private, unshareable, and undeletable", async () => {
    const database = testEnvironment.authenticatedContext("owner").firestore();
    const reference = doc(database, "groups", "personal_owner");
    await assertSucceeds(
        setDoc(reference, {
            ...calendar,
            name: "Owner Personal Calendar",
            memberIds: ["owner"],
            isPersonal: true,
        })
    );
    await assertFails(updateDoc(reference, { memberIds: ["owner", "member"], updatedAt: Timestamp.now() }));
    await assertFails(deleteDoc(reference));
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

test("calendar owners can edit any event while members need the calendar permission", async () => {
    const ownerDatabase = testEnvironment.authenticatedContext("owner").firestore();
    const memberDatabase = testEnvironment.authenticatedContext("member").firestore();

    await assertSucceeds(
        updateDoc(doc(ownerDatabase, "events", "event"), {
            title: "Owner edited meeting",
            updatedAt: Timestamp.now(),
        })
    );
    await assertFails(
        updateDoc(doc(memberDatabase, "events", "event"), {
            title: "Member edited meeting",
            updatedAt: Timestamp.now(),
        })
    );

    await assertSucceeds(
        updateDoc(doc(ownerDatabase, "groups", "calendar"), {
            allowMembersToEditEvents: true,
            updatedAt: Timestamp.now(),
        })
    );
    await assertSucceeds(
        updateDoc(doc(memberDatabase, "events", "event"), {
            title: "Member edited meeting",
            updatedAt: Timestamp.now(),
        })
    );
});

test("calendar owners can take ownership of events when removing their creator", async () => {
    const database = testEnvironment.authenticatedContext("owner").firestore();
    const batch = writeBatch(database);
    batch.update(doc(database, "events", "removable-member-event"), {
        creatorId: "owner",
        participants: { owner: "accepted" },
        participantIds: ["owner"],
        updatedAt: Timestamp.now(),
    });
    batch.update(doc(database, "eventDetails", "removable-member-event"), {
        creatorId: "owner",
        viewerIds: ["owner"],
        updatedAt: Timestamp.now(),
    });
    await assertSucceeds(batch.commit());
});

test("participants can remove themselves from an event and its private details", async () => {
    const database = testEnvironment.authenticatedContext("member").firestore();
    const batch = writeBatch(database);
    batch.update(doc(database, "events", "event"), {
        "participants.member": deleteField(),
        participantIds: arrayRemove("member"),
        updatedAt: Timestamp.now(),
    });
    batch.update(doc(database, "eventDetails", "event"), {
        viewerIds: arrayRemove("member"),
        updatedAt: Timestamp.now(),
    });
    batch.update(doc(database, "groups", "calendar"), {
        memberIds: arrayRemove("member"),
        updatedAt: Timestamp.now(),
    });
    await assertSucceeds(batch.commit());
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

test("calendar members can share only their own daily availability", async () => {
    const memberDatabase = testEnvironment.authenticatedContext("member").firestore();
    await assertSucceeds(
        setDoc(doc(memberDatabase, "availability", "calendar_member_2026-07-28"), {
            calendarId: "calendar",
            userId: "member",
            date: "2026-07-28",
            slots: { "0900": "available", "0930": "unavailable" },
        })
    );
    await assertFails(
        setDoc(doc(memberDatabase, "availability", "calendar_owner_2026-07-28"), {
            calendarId: "calendar",
            userId: "owner",
            date: "2026-07-28",
            slots: { "0900": "available" },
        })
    );
});
