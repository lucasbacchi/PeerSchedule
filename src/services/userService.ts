import { dateToTimestamp, db } from "@/lib/firebase";
import { User } from "@/types/database";
import { addDoc, collection, deleteDoc, getDocs, query, updateDoc, where } from "firebase/firestore";

export const getUserById = async (userId: string) => {
    const userRef = collection(db, "users");
    const q = query(userRef, where("id", "==", userId));
    const snapshot = await getDocs(q);
    const doc = snapshot.docs[0];
    return doc ? ({ id: doc.id, ...doc.data() } as unknown as User) : null;
};

export const getUsersByIds = async (userIds: string[]): Promise<User[]> => {
    if (userIds.length === 0) {
        return [];
    }

    const userRef = collection(db, "users");
    const q = query(userRef, where("id", "in", userIds));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as User);
};

export const getAllUsers = async (): Promise<User[]> => {
    const userRef = collection(db, "users");
    const snapshot = await getDocs(userRef);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as User);
};

export const getUsersByRole = async (role: string): Promise<User[]> => {
    const userRef = collection(db, "users");
    const q = query(userRef, where("role", "==", role));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as User);
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
    const userRef = collection(db, "users");
    const q = query(userRef, where("email", "==", email));
    const snapshot = await getDocs(q);
    const doc = snapshot.docs[0];
    return doc ? ({ id: doc.id, ...doc.data() } as unknown as User) : null;
};

export const createUser = async (user: User): Promise<string> => {
    const userRef = collection(db, "users");
    const docRef = await addDoc(userRef, {
        ...user,
        createdAt: dateToTimestamp(new Date()),
    });
    return docRef.id;
};

export const updateUser = async (userId: string, updatedData: Partial<User>): Promise<void> => {
    const userRef = collection(db, "users");
    const q = query(userRef, where("id", "==", userId));
    const snapshot = await getDocs(q);
    const doc = snapshot.docs[0];
    if (doc) {
        await updateDoc(doc.ref, updatedData);
    }
};

export const getUsersByFriendId = async (friendId: string): Promise<User[]> => {
    const userRef = collection(db, "users");
    const q = query(userRef, where("friendIds", "array-contains", friendId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as unknown as User);
};

export const deleteUser = async (userId: string): Promise<void> => {
    const userRef = collection(db, "users");
    const q = query(userRef, where("id", "==", userId));
    const snapshot = await getDocs(q);
    const doc = snapshot.docs[0];
    if (doc) {
        await deleteDoc(doc.ref);
    }
};
