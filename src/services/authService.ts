import type { User as FirebaseUser } from "firebase/auth";
import { GoogleAuthProvider, signInWithPopup, updateProfile } from "firebase/auth";
import { Timestamp } from "firebase/firestore";

import { auth } from "@/lib/firebase";
import { createUser, getUserById, updateUser } from "./userService";

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
        const hasChanges =
            existingUser.displayName !== cachedProfile.displayName ||
            existingUser.email !== cachedProfile.email ||
            existingUser.photoURL !== cachedProfile.photoURL;

        if (hasChanges) {
            await updateUser(firebaseUser.uid, cachedProfile);
        }
    }

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
    });
};

export const signOut = async (): Promise<void> => {
    await auth.signOut();
};
