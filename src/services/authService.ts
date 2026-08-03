import type { User as FirebaseUser } from "firebase/auth";
import { GoogleAuthProvider, reauthenticateWithPopup, signInWithPopup, updateProfile } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { auth, functions } from "@/lib/firebase";
import { ensurePersonalCalendar } from "./calendarService";
import { buildUserSearchTokens, createUser, getUserById, updateUser } from "./userService";

const normalizeGoogleName = (displayName: string | null | undefined, email: string | null | undefined): string => {
    const trimmedName = displayName?.trim();
    if (trimmedName) {
        return trimmedName;
    }

    const emailLocalPart = email?.split("@")[0]?.trim();
    if (emailLocalPart) {
        return emailLocalPart;
    }

    return "PeerSchedule User";
};

const buildCachedProfile = (firebaseUser: FirebaseUser) => {
    const displayName = normalizeGoogleName(firebaseUser.displayName, firebaseUser.email);
    const email = firebaseUser.email?.trim() ?? "";

    return {
        displayName,
        displayNameLower: displayName.toLowerCase(),
        email,
        emailLower: email.toLowerCase(),
        photoURL: firebaseUser.photoURL ?? undefined,
        searchTokens: buildUserSearchTokens(displayName),
    };
};

export const signInWithGoogle = async (): Promise<FirebaseUser> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
    const existingUser = await getUserById(firebaseUser.uid);
    const cachedProfile = buildCachedProfile(firebaseUser);

    if (!existingUser) {
        await createUser({
            uid: firebaseUser.uid,
            ...cachedProfile,
            role: "user",
            friendIds: [],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
    } else {
        const searchTokensMatch =
            existingUser.searchTokens?.length === cachedProfile.searchTokens.length &&
            cachedProfile.searchTokens.every((token, index) => existingUser.searchTokens?.[index] === token);
        const hasChanges =
            existingUser.displayName !== cachedProfile.displayName ||
            existingUser.email !== cachedProfile.email ||
            existingUser.photoURL !== cachedProfile.photoURL ||
            !searchTokensMatch;

        if (hasChanges) {
            await updateUser(firebaseUser.uid, cachedProfile);
        }
    }

    // Provision immediately for new accounts and repair older accounts that
    // authenticated before personal calendars were introduced.
    await ensurePersonalCalendar(firebaseUser.uid);

    return firebaseUser;
};

export const updateSignedInUserProfile = async (displayName: string): Promise<void> => {
    const currentUser = auth.currentUser;
    const trimmedName = displayName.trim();

    if (!currentUser) {
        throw new Error("You must be signed in to update your profile.");
    }

    if (trimmedName.length < 2 || trimmedName.length > 80) {
        throw new Error("Display name must be between 2 and 80 characters.");
    }

    await updateProfile(currentUser, { displayName: trimmedName });
    await updateUser(currentUser.uid, {
        displayName: trimmedName,
        displayNameLower: trimmedName.toLowerCase(),
        searchTokens: buildUserSearchTokens(trimmedName),
    });
};

export const signOut = async (): Promise<void> => {
    await auth.signOut();
};

const clearDeletedAccountClientState = async (): Promise<void> => {
    try {
        await auth.signOut();
    } catch (error: unknown) {
        // The backend has already deleted the Auth user, so an invalid-token
        // sign-out response must not prevent local cleanup or redirection.
        console.warn("Firebase session was already invalidated:", error);
    }

    if (typeof window === "undefined") return;

    for (const storage of [window.localStorage, window.sessionStorage]) {
        try {
            const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
                (key): key is string => key !== null
            );
            for (const key of keys) {
                const normalizedKey = key.toLowerCase();
                if (normalizedKey.includes("firebase") || normalizedKey.includes("peerschedule")) {
                    storage.removeItem(key);
                }
            }
        } catch (error: unknown) {
            console.warn("Unable to clear browser storage:", error);
        }
    }

    if ("caches" in window) {
        try {
            await Promise.all((await window.caches.keys()).map((cacheName) => window.caches.delete(cacheName)));
        } catch (error: unknown) {
            console.warn("Unable to clear browser cache storage:", error);
        }
    }
};

export const deleteSignedInAccount = async (): Promise<void> => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("You must be signed in to delete your account.");
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await reauthenticateWithPopup(currentUser, provider);
    await currentUser.getIdToken(true);

    const deleteAccount = httpsCallable<void, { success: boolean }>(functions, "deleteAccount");
    await deleteAccount();
    await clearDeletedAccountClientState();
};
