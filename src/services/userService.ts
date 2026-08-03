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

export const buildUserSearchTokens = (displayName: string): string[] => {
    const normalizedName = displayName.trim();
    const tokens = new Set<string>();

    for (let start = 0; start < normalizedName.length; start += 1) {
        for (let end = start + 1; end <= normalizedName.length; end += 1) {
            tokens.add(normalizedName.slice(start, end));
        }
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
    const normalizedSearch = searchText.trim();

    if (normalizedSearch.length < 1) {
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
        searchTokens: buildUserSearchTokens(user.displayName),
    });

    return user.uid;
};

export const updateUser = async (userId: string, updatedData: Partial<User>): Promise<void> => {
    const userReference = doc(db, USERS_COLLECTION, userId);

    await updateDoc(userReference, updatedData);
};

export const ensureUserSearchTokens = async (userId: string): Promise<void> => {
    const user = await getUserById(userId);
    if (!user) return;

    const expectedTokens = buildUserSearchTokens(user.displayName);
    const tokensMatch =
        user.searchTokens?.length === expectedTokens.length &&
        expectedTokens.every((token, index) => user.searchTokens?.[index] === token);

    if (!tokensMatch) {
        await updateUser(userId, { searchTokens: expectedTokens });
    }
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
