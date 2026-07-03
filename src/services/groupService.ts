import { db } from "@/lib/firebase";
import { Group } from "@/types/database";
import { addDoc, collection, deleteDoc, getDocs, updateDoc } from "firebase/firestore";

export const getAllGroups = async () => {
    const groupsRef = collection(db, "groups");
    const snapshot = await getDocs(groupsRef);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Group[];
};

export const getGroupById = async (groupId: string) => {
    const groupsRef = collection(db, "groups");
    const snapshot = await getDocs(groupsRef);
    const doc = snapshot.docs.find((doc) => doc.id === groupId);
    return doc ? ({ id: doc.id, ...doc.data() } as Group) : null;
};

export const getGroupsByOwnerId = async (ownerId: string) => {
    const groupsRef = collection(db, "groups");
    const snapshot = await getDocs(groupsRef);
    const groups = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Group)
        .filter((group) => group.ownerId === ownerId);
    return groups;
};

export const getGroupsByMemberId = async (memberId: string) => {
    const groupsRef = collection(db, "groups");
    const snapshot = await getDocs(groupsRef);
    const groups = snapshot.docs;
    return groups
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Group)
        .filter((group) => group.memberIds.includes(memberId));
};

export const getGroupsByIds = async (groupIds: string[]) => {
    if (groupIds.length === 0) {
        return [];
    }
    const groupsRef = collection(db, "groups");
    const snapshot = await getDocs(groupsRef);
    const groups = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Group)
        .filter((group) => groupIds.includes(group.id));
    return groups;
};

export const createGroup = async (group: Omit<Group, "id">): Promise<string> => {
    const groupsRef = collection(db, "groups");
    const docRef = await addDoc(groupsRef, group);
    return docRef.id;
};

export const updateGroup = async (groupId: string, updatedData: Partial<Group>): Promise<void> => {
    const groupsRef = collection(db, "groups");
    const snapshot = await getDocs(groupsRef);
    const doc = snapshot.docs.find((doc) => doc.id === groupId);
    if (doc) {
        await updateDoc(doc.ref, updatedData);
    }
};

export const deleteGroup = async (groupId: string): Promise<void> => {
    const groupsRef = collection(db, "groups");
    const snapshot = await getDocs(groupsRef);
    const doc = snapshot.docs.find((doc) => doc.id === groupId);
    if (doc) {
        await deleteDoc(doc.ref);
    }
};
