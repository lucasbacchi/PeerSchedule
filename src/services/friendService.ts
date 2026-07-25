import {
    Timestamp,
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    runTransaction,
    updateDoc,
    where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { FriendRequest, FriendRequestStatus, User } from "@/types/database";
import { getUsersByIds } from "./userService";

const FRIEND_REQUESTS_COLLECTION = "friendRequests";

const requestFromDocument = (id: string, data: Record<string, unknown>): FriendRequest => ({
    id,
    senderId: typeof data.senderId === "string" ? data.senderId : "",
    receiverId: typeof data.receiverId === "string" ? data.receiverId : "",
    status:
        data.status === "accepted" || data.status === "declined" || data.status === "pending" ? data.status : "pending",
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
    respondedAt: data.respondedAt instanceof Timestamp ? data.respondedAt : undefined,
});

const getRequestsByField = async (field: "senderId" | "receiverId", uid: string): Promise<FriendRequest[]> => {
    const requestsQuery = query(collection(db, FRIEND_REQUESTS_COLLECTION), where(field, "==", uid));
    const snapshot = await getDocs(requestsQuery);
    return snapshot.docs.map((requestDocument) => requestFromDocument(requestDocument.id, requestDocument.data()));
};

export const getFriendRequests = async (
    uid: string
): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> => {
    const [incoming, outgoing] = await Promise.all([
        getRequestsByField("receiverId", uid),
        getRequestsByField("senderId", uid),
    ]);

    const newestFirst = (first: FriendRequest, second: FriendRequest): number =>
        second.createdAt.toMillis() - first.createdAt.toMillis();

    return {
        incoming: incoming.sort(newestFirst),
        outgoing: outgoing.sort(newestFirst),
    };
};

const getRelationshipRequests = async (firstUserId: string, secondUserId: string): Promise<FriendRequest[]> => {
    const requestsReference = collection(db, FRIEND_REQUESTS_COLLECTION);
    const [forwardSnapshot, reverseSnapshot] = await Promise.all([
        getDocs(
            query(
                requestsReference,
                where("senderId", "==", firstUserId),
                where("receiverId", "==", secondUserId),
                limit(5)
            )
        ),
        getDocs(
            query(
                requestsReference,
                where("senderId", "==", secondUserId),
                where("receiverId", "==", firstUserId),
                limit(5)
            )
        ),
    ]);

    return [...forwardSnapshot.docs, ...reverseSnapshot.docs].map((requestDocument) =>
        requestFromDocument(requestDocument.id, requestDocument.data())
    );
};

export const sendFriendRequest = async (senderId: string, receiverId: string): Promise<string> => {
    if (senderId === receiverId) {
        throw new Error("You cannot send a friend request to yourself.");
    }

    const existingRequests = await getRelationshipRequests(senderId, receiverId);
    const activeRequest = existingRequests.find(
        (request) => request.status === "pending" || request.status === "accepted"
    );

    if (activeRequest?.status === "accepted") {
        throw new Error("You are already friends with this user.");
    }

    if (activeRequest?.status === "pending") {
        throw new Error("A friend request is already pending between these users.");
    }

    const documentReference = await addDoc(collection(db, FRIEND_REQUESTS_COLLECTION), {
        senderId,
        receiverId,
        status: "pending" satisfies FriendRequestStatus,
        createdAt: Timestamp.now(),
    });

    return documentReference.id;
};

export const respondToFriendRequest = async (
    requestId: string,
    currentUserId: string,
    status: Extract<FriendRequestStatus, "accepted" | "declined">
): Promise<void> => {
    const requestReference = doc(db, FRIEND_REQUESTS_COLLECTION, requestId);

    await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(requestReference);
        if (!snapshot.exists()) {
            throw new Error("The friend request no longer exists.");
        }

        const request = requestFromDocument(snapshot.id, snapshot.data());
        if (request.receiverId !== currentUserId) {
            throw new Error("Only the recipient can respond to this friend request.");
        }

        if (request.status !== "pending") {
            throw new Error("This friend request has already been answered.");
        }

        transaction.update(requestReference, {
            status,
            respondedAt: Timestamp.now(),
        });
    });
};

export const removeFriend = async (currentUserId: string, friendUserId: string): Promise<void> => {
    const relationships = await getRelationshipRequests(currentUserId, friendUserId);
    const acceptedRelationships = relationships.filter((request) => request.status === "accepted");

    if (acceptedRelationships.length === 0) {
        throw new Error("This user is not in your friend list.");
    }

    await Promise.all(
        acceptedRelationships.map((relationship) => deleteDoc(doc(db, FRIEND_REQUESTS_COLLECTION, relationship.id)))
    );
};

export const cancelFriendRequest = async (requestId: string, currentUserId: string): Promise<void> => {
    const requestReference = doc(db, FRIEND_REQUESTS_COLLECTION, requestId);
    const snapshot = await getDoc(requestReference);

    if (!snapshot.exists()) {
        return;
    }

    const request = requestFromDocument(snapshot.id, snapshot.data());
    if (request.senderId !== currentUserId || request.status !== "pending") {
        throw new Error("Only the sender can cancel a pending friend request.");
    }

    await deleteDoc(requestReference);
};

export const getFriends = async (uid: string): Promise<User[]> => {
    const { incoming, outgoing } = await getFriendRequests(uid);
    const friendIds = new Set<string>();

    for (const request of incoming) {
        if (request.status === "accepted") {
            friendIds.add(request.senderId);
        }
    }

    for (const request of outgoing) {
        if (request.status === "accepted") {
            friendIds.add(request.receiverId);
        }
    }

    return getUsersByIds([...friendIds]);
};

export const areFriends = async (firstUserId: string, secondUserId: string): Promise<boolean> => {
    const relationships = await getRelationshipRequests(firstUserId, secondUserId);
    return relationships.some((relationship) => relationship.status === "accepted");
};

export const reopenDeclinedRequest = async (requestId: string, senderId: string): Promise<void> => {
    const reference = doc(db, FRIEND_REQUESTS_COLLECTION, requestId);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) {
        throw new Error("Friend request not found.");
    }

    const request = requestFromDocument(snapshot.id, snapshot.data());
    if (request.senderId !== senderId || request.status !== "declined") {
        throw new Error("This request cannot be reopened.");
    }

    await updateDoc(reference, { status: "pending", createdAt: Timestamp.now(), respondedAt: null });
};
