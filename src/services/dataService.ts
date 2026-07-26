import {
  type DocumentData, type QueryDocumentSnapshot, type Unsubscribe, addDoc, arrayUnion, collection, deleteDoc,
  doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp,
  setDoc, updateDoc, where,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";

export interface CalendarRecord {
  id: string; name: string; description: string; ownerId: string; memberIds: string[];
}
export interface EventRecord {
  id: string; calendarId: string; title: string; date: string; start: string; end: string;
  ownerId: string; description?: string; participantIds?: string[];
}
export interface UserRecord {
  id: string; displayName: string; email: string; photoURL: string; friendIds: string[];
}

const mapCalendar = (snap: QueryDocumentSnapshot<DocumentData>): CalendarRecord => ({ id: snap.id, ...snap.data() } as CalendarRecord);
const mapEvent = (snap: QueryDocumentSnapshot<DocumentData>): EventRecord => ({ id: snap.id, ...snap.data() } as EventRecord);

export async function ensureUser(user: User) {
  const ref = doc(db, "users", user.uid);
  const existing = await getDoc(ref);
  const existingFriendIds = existing.exists() && Array.isArray(existing.get("friendIds"))
    ? existing.get("friendIds") as string[]
    : [];
  await setDoc(ref, {
    displayName: user.displayName ?? user.email?.split("@")[0] ?? "PeerSchedule user",
    displayNameLower: (user.displayName ?? "").toLowerCase(),
    email: user.email ?? "",
    emailLower: (user.email ?? "").toLowerCase(),
    photoURL: user.photoURL ?? "",
    friendIds: existingFriendIds,
    updatedAt: serverTimestamp(),
    ...(!existing.exists() ? { createdAt: serverTimestamp() } : {}),
  }, { merge: true });
}

export function watchCalendars(uid: string, next: (items: CalendarRecord[]) => void, error: (error: Error) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "calendars"), where("memberIds", "array-contains", uid)), (snap) => next(snap.docs.map(mapCalendar)), error);
}
export async function createCalendar(uid: string, name: string, description: string) {
  return addDoc(collection(db, "calendars"), { name, description, ownerId: uid, memberIds: [uid], createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
export async function deleteCalendar(id: string) { await deleteDoc(doc(db, "calendars", id)); }
export async function getCalendar(id: string): Promise<CalendarRecord | null> {
  const snap = await getDoc(doc(db, "calendars", id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as CalendarRecord) : null;
}

export function watchEvents(calendarId: string, next: (items: EventRecord[]) => void, error: (error: Error) => void): Unsubscribe {
  return onSnapshot(query(collection(db, "events"), where("calendarId", "==", calendarId)), (snap) => next(snap.docs.map(mapEvent)), error);
}
export async function getEvents(calendarId: string): Promise<EventRecord[]> {
  const snap = await getDocs(query(collection(db, "events"), where("calendarId", "==", calendarId)));
  return snap.docs.map(mapEvent);
}
export async function saveEvent(uid: string, value: Omit<EventRecord, "id" | "ownerId"> & { id?: string }) {
  const data = { ...value, ownerId: uid, updatedAt: serverTimestamp() };
  if (value.id) {
    const { id, ...rest } = data;
    await updateDoc(doc(db, "events", id), rest);
    return id;
  }
  const result = await addDoc(collection(db, "events"), { ...data, createdAt: serverTimestamp() });
  return result.id;
}
export async function deleteEvent(id: string) { await deleteDoc(doc(db, "events", id)); }

export async function getUser(uid: string): Promise<UserRecord | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as UserRecord) : null;
}
export async function updateProfile(uid: string, displayName: string) {
  await updateDoc(doc(db, "users", uid), { displayName, displayNameLower: displayName.toLowerCase(), updatedAt: serverTimestamp() });
}
export async function searchUsers(term: string, currentUid: string): Promise<UserRecord[]> {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return [];
  const field = normalized.includes("@") ? "emailLower" : "displayNameLower";
  const snap = await getDocs(query(collection(db, "users"), orderBy(field), where(field, ">=", normalized), where(field, "<=", `${normalized}\uf8ff`), limit(20)));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() } as UserRecord)).filter((item) => item.id !== currentUid);
}
export async function addFriend(uid: string, friendId: string) {
  await Promise.all([
    updateDoc(doc(db, "users", uid), { friendIds: arrayUnion(friendId) }),
    updateDoc(doc(db, "users", friendId), { friendIds: arrayUnion(uid) }),
  ]);
}
export async function getFriends(uid: string): Promise<UserRecord[]> {
  const user = await getUser(uid);
  if (!user?.friendIds.length) return [];
  const records = await Promise.all(user.friendIds.map((id) => getUser(id)));
  return records.filter((item): item is UserRecord => item !== null);
}
export async function addCalendarMember(calendarId: string, uid: string) {
  await updateDoc(doc(db, "calendars", calendarId), { memberIds: arrayUnion(uid), updatedAt: serverTimestamp() });
}
