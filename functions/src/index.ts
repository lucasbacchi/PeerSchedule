/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { getApps, initializeApp } from "firebase-admin/app";
import { type DocumentReference, FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
// import {onRequest} from "firebase-functions/https";
// import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

if (getApps().length === 0) {
    initializeApp();
}

const deleteReferences = async (references: DocumentReference[]): Promise<void> => {
    const firestore = getFirestore();
    for (let offset = 0; offset < references.length; offset += 400) {
        const batch = firestore.batch();
        for (const reference of references.slice(offset, offset + 400)) {
            batch.delete(reference);
        }
        await batch.commit();
    }
};

export const deleteAccount = onCall({ invoker: "public" }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new HttpsError("unauthenticated", "You must be signed in to delete your account.");
    }
    const authenticationTime = Number(request.auth?.token.auth_time ?? 0);
    if (Date.now() / 1000 - authenticationTime > 5 * 60) {
        throw new HttpsError("failed-precondition", "Please sign in again before deleting your account.");
    }

    const firestore = getFirestore();
    const groups = firestore.collection("groups");
    const events = firestore.collection("events");
    const eventDetails = firestore.collection("eventDetails");
    const availability = firestore.collection("availability");

    const [ownedGroupsSnapshot, memberGroupsSnapshot] = await Promise.all([
        groups.where("ownerId", "==", uid).get(),
        groups.where("memberIds", "array-contains", uid).get(),
    ]);
    const ownedGroupIds = new Set(ownedGroupsSnapshot.docs.map((document) => document.id));

    const eventReferences = new Map<string, DocumentReference>();
    const availabilityReferences = new Map<string, DocumentReference>();

    for (const groupId of ownedGroupIds) {
        const [groupEvents, groupAvailability] = await Promise.all([
            events.where("calendarId", "==", groupId).get(),
            availability.where("calendarId", "==", groupId).get(),
        ]);
        for (const document of groupEvents.docs) eventReferences.set(document.id, document.ref);
        for (const document of groupAvailability.docs) availabilityReferences.set(document.id, document.ref);
    }

    const [createdEvents, participantEvents, userAvailability, sentRequests, receivedRequests, legacyFriends] =
        await Promise.all([
            events.where("creatorId", "==", uid).get(),
            events.where("participantIds", "array-contains", uid).get(),
            availability.where("userId", "==", uid).get(),
            firestore.collection("friendRequests").where("senderId", "==", uid).get(),
            firestore.collection("friendRequests").where("receiverId", "==", uid).get(),
            firestore.collection("users").where("friendIds", "array-contains", uid).get(),
        ]);

    for (const document of createdEvents.docs) eventReferences.set(document.id, document.ref);
    for (const document of userAvailability.docs) availabilityReferences.set(document.id, document.ref);

    const participantUpdates = participantEvents.docs.filter((document) => !eventReferences.has(document.id));
    // Each participant requires one event update and one event-details update.
    // Limit this to 200 participants so the batch remains below 500 writes.
    const participantBatchSize = 200;
    for (let offset = 0; offset < participantUpdates.length; offset += participantBatchSize) {
        const batch = firestore.batch();
        for (const document of participantUpdates.slice(offset, offset + participantBatchSize)) {
            batch.update(document.ref, {
                [`participants.${uid}`]: FieldValue.delete(),
                participantIds: FieldValue.arrayRemove(uid),
                updatedAt: FieldValue.serverTimestamp(),
            });
            batch.update(eventDetails.doc(document.id), {
                viewerIds: FieldValue.arrayRemove(uid),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }
        await batch.commit();
    }

    await deleteReferences([
        ...[...eventReferences.keys()].map((eventId) => eventDetails.doc(eventId)),
        ...eventReferences.values(),
        ...availabilityReferences.values(),
    ]);

    const sharedMemberships = memberGroupsSnapshot.docs.filter((document) => !ownedGroupIds.has(document.id));
    for (let offset = 0; offset < sharedMemberships.length; offset += 400) {
        const batch = firestore.batch();
        for (const document of sharedMemberships.slice(offset, offset + 400)) {
            batch.update(document.ref, {
                memberIds: FieldValue.arrayRemove(uid),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }
        await batch.commit();
    }

    for (let offset = 0; offset < legacyFriends.docs.length; offset += 400) {
        const batch = firestore.batch();
        for (const document of legacyFriends.docs.slice(offset, offset + 400)) {
            batch.update(document.ref, {
                friendIds: FieldValue.arrayRemove(uid),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }
        await batch.commit();
    }

    const requestReferences = new Map<string, DocumentReference>();
    for (const document of [...sentRequests.docs, ...receivedRequests.docs]) {
        requestReferences.set(document.id, document.ref);
    }
    await deleteReferences([
        ...requestReferences.values(),
        ...ownedGroupsSnapshot.docs.map((document) => document.ref),
        firestore.collection("users").doc(uid),
    ]);

    await getAuth().deleteUser(uid);
    return { success: true };
});

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
