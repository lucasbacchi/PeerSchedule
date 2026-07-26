import { db } from "@/lib/firebase";
import type { User, UserRole } from "@/types/database";

import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    query,
    setDoc,
    updateDoc,
    where,
} from "firebase/firestore";

const USERS_COLLECTION = "users";
const MAX_SEARCH_TOKEN_LENGTH = 30;

export const buildUserSearchTokens = (displayName: string, email: string): string[] => {
    const values = [displayName.trim().toLowerCase(), email.trim().toLowerCase()];
    const tokens = new Set<string>();

    for (const value of values) {
        for (let start = 0; start < value.length; start += 1) {
            for (let length = 2; length <= Math.min(MAX_SEARCH_TOKEN_LENGTH, value.length - start); length += 1) {
                tokens.add(value.slice(start, start + length));
            }
        }
        if (value.length > MAX_SEARCH_TOKEN_LENGTH) tokens.add(value);
    }

    return [...tokens];
};

export const getUserById = async (userId: string): Promise<User | null> => {
    const userReference = doc(db, USERS_COLLECTION, userId);

    const snapshot = await getDoc(userReference);

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.data() as User;
};

export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
    const uniqueUserIds = [...new Set(userIds)];

    const users = await Promise.all(uniqueUserIds.map((userId) => getUserById(userId)));

    return users.filter((user): user is User => user !== null);
};

export const getAllUsers = async (): Promise<User[]> => {
    const usersReference = collection(db, USERS_COLLECTION);

    const snapshot = await getDocs(usersReference);

    return snapshot.docs.map((userDocument) => userDocument.data() as User);
};

export const getUsersByRole = async (role: UserRole): Promise<User[]> => {
    const usersReference = collection(db, USERS_COLLECTION);

    const usersQuery = query(usersReference, where("role", "==", role));

    const snapshot = await getDocs(usersQuery);

    return snapshot.docs.map((userDocument) => userDocument.data() as User);
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
    const normalizedEmail = email.trim().toLowerCase();

    const usersReference = collection(db, USERS_COLLECTION);

    const usersQuery = query(usersReference, where("email", "==", normalizedEmail));

    const snapshot = await getDocs(usersQuery);
    const userDocument = snapshot.docs[0];

    return userDocument ? (userDocument.data() as User) : null;
};

export const searchUsers = async (searchText: string, currentUserId: string): Promise<User[]> => {
    const normalizedSearch = searchText.trim().toLowerCase();

    if (normalizedSearch.length < 2) {
        return [];
    }

    const usersQuery = query(
        collection(db, USERS_COLLECTION),
        where("searchTokens", "array-contains", normalizedSearch),
        limit(20)
    );
    const snapshot = await getDocs(usersQuery);

    return snapshot.docs
        .map((userDocument) => userDocument.data() as User)
        .filter((user) => user.uid !== currentUserId)
        .sort((first, second) => first.displayName.localeCompare(second.displayName));
};

export const createUser = async (user: User): Promise<string> => {
    const userReference = doc(db, USERS_COLLECTION, user.uid);

    await setDoc(userReference, {
        ...user,
        email: user.email.trim().toLowerCase(),
        searchTokens: buildUserSearchTokens(user.displayName, user.email),
    });

    return user.uid;
};

export const updateUser = async (userId: string, updatedData: Partial<User>): Promise<void> => {
    const userReference = doc(db, USERS_COLLECTION, userId);

    await updateDoc(userReference, updatedData);
};

export const getUsersByFriendId = async (friendId: string): Promise<User[]> => {
    const usersReference = collection(db, USERS_COLLECTION);

    const usersQuery = query(usersReference, where("friendIds", "array-contains", friendId));

    const snapshot = await getDocs(usersQuery);

    return snapshot.docs.map((userDocument) => userDocument.data() as User);
};

export const deleteUser = async (userId: string): Promise<void> => {
    const userReference = doc(db, USERS_COLLECTION, userId);

    await deleteDoc(userReference);
};
