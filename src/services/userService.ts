import {
    Timestamp,
    collection,
    deleteDoc,
    doc,
    endAt,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    setDoc,
    startAt,
    updateDoc,
    where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { User, UserRole } from "@/types/database";

const USERS_COLLECTION = "users";

const normalizeUser = (user: User): User => ({
    ...user,
    displayName: user.displayName.trim(),
    displayNameLower: user.displayName.trim().toLowerCase(),
    email: user.email.trim(),
    emailLower: user.email.trim().toLowerCase(),
});

const documentToUser = (id: string, data: Record<string, unknown>): User => {
    const displayName = typeof data.displayName === "string" ? data.displayName : "";
    const email = typeof data.email === "string" ? data.email : "";

    return {
        uid: typeof data.uid === "string" ? data.uid : id,
        displayName,
        displayNameLower: typeof data.displayNameLower === "string" ? data.displayNameLower : displayName.toLowerCase(),
        email,
        emailLower: typeof data.emailLower === "string" ? data.emailLower : email.toLowerCase(),
        photoURL: typeof data.photoURL === "string" ? data.photoURL : undefined,
        role: data.role === "admin" ? "admin" : "user",
        friendIds: Array.isArray(data.friendIds) ? data.friendIds.filter((value) => typeof value === "string") : [],
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : undefined,
    };
};

export const getUserById = async (userId: string): Promise<User | null> => {
    const directReference = doc(db, USERS_COLLECTION, userId);
    const directSnapshot = await getDoc(directReference);

    if (directSnapshot.exists()) {
        return documentToUser(directSnapshot.id, directSnapshot.data());
    }

    // Compatibility with early project versions that used an auto-generated document ID.
    const legacyQuery = query(collection(db, USERS_COLLECTION), where("uid", "==", userId), limit(1));
    const legacySnapshot = await getDocs(legacyQuery);
    const legacyDocument = legacySnapshot.docs[0];

    if (!legacyDocument) {
        return null;
    }

    const legacyUser = documentToUser(legacyDocument.id, legacyDocument.data());

    // Migrate the record to the canonical users/{uid} document path.
    await setDoc(directReference, normalizeUser({ ...legacyUser, uid: userId }), { merge: true });
    if (legacyDocument.id !== userId) {
        await deleteDoc(legacyDocument.ref);
    }

    return { ...legacyUser, uid: userId };
};

export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    const users = await Promise.all(uniqueIds.map((userId) => getUserById(userId)));
    return users.filter((user): user is User => user !== null);
};

export const getAllUsers = async (): Promise<User[]> => {
    const snapshot = await getDocs(collection(db, USERS_COLLECTION));
    return snapshot.docs
        .map((userDocument) => documentToUser(userDocument.id, userDocument.data()))
        .sort((first, second) => first.displayName.localeCompare(second.displayName));
};

export const getUsersByRole = async (role: UserRole): Promise<User[]> => {
    const usersQuery = query(collection(db, USERS_COLLECTION), where("role", "==", role));
    const snapshot = await getDocs(usersQuery);
    return snapshot.docs.map((userDocument) => documentToUser(userDocument.id, userDocument.data()));
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
        return null;
    }

    const normalizedQuery = query(
        collection(db, USERS_COLLECTION),
        where("emailLower", "==", normalizedEmail),
        limit(1)
    );
    const normalizedSnapshot = await getDocs(normalizedQuery);
    const normalizedDocument = normalizedSnapshot.docs[0];

    if (normalizedDocument) {
        return documentToUser(normalizedDocument.id, normalizedDocument.data());
    }

    // Compatibility with documents created before emailLower was added.
    const legacyQuery = query(collection(db, USERS_COLLECTION), where("email", "==", email.trim()), limit(1));
    const legacySnapshot = await getDocs(legacyQuery);
    const legacyDocument = legacySnapshot.docs[0];
    return legacyDocument ? documentToUser(legacyDocument.id, legacyDocument.data()) : null;
};

export const searchUsers = async (searchText: string, currentUserId: string): Promise<User[]> => {
    const normalizedSearch = searchText.trim().toLowerCase();
    if (normalizedSearch.length < 2) {
        return [];
    }

    const results = new Map<string, User>();

    const emailQuery = query(collection(db, USERS_COLLECTION), where("emailLower", "==", normalizedSearch), limit(5));

    const nameQuery = query(
        collection(db, USERS_COLLECTION),
        orderBy("displayNameLower"),
        startAt(normalizedSearch),
        endAt(`${normalizedSearch}\uf8ff`),
        limit(10)
    );

    const [emailSnapshot, nameSnapshot] = await Promise.all([getDocs(emailQuery), getDocs(nameQuery)]);

    for (const userDocument of [...emailSnapshot.docs, ...nameSnapshot.docs]) {
        const user = documentToUser(userDocument.id, userDocument.data());
        if (user.uid !== currentUserId) {
            results.set(user.uid, user);
        }
    }

    return [...results.values()].sort((first, second) => first.displayName.localeCompare(second.displayName));
};

export const createUser = async (user: User): Promise<string> => {
    const normalizedUser = normalizeUser({
        ...user,
        createdAt: user.createdAt ?? Timestamp.now(),
        updatedAt: Timestamp.now(),
    });

    await setDoc(doc(db, USERS_COLLECTION, normalizedUser.uid), normalizedUser, { merge: true });
    return normalizedUser.uid;
};

export const updateUser = async (userId: string, updatedData: Partial<User>): Promise<void> => {
    const safeData: Partial<User> = { ...updatedData, updatedAt: Timestamp.now() };

    if (typeof updatedData.displayName === "string") {
        safeData.displayName = updatedData.displayName.trim();
        safeData.displayNameLower = updatedData.displayName.trim().toLowerCase();
    }

    if (typeof updatedData.email === "string") {
        safeData.email = updatedData.email.trim();
        safeData.emailLower = updatedData.email.trim().toLowerCase();
    }

    await updateDoc(doc(db, USERS_COLLECTION, userId), safeData);
};

export const deleteUser = async (userId: string): Promise<void> => {
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
};
