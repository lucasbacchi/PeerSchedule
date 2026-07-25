import type { User as FirebaseUser } from "firebase/auth";
import { GoogleAuthProvider, signInWithPopup, updateProfile } from "firebase/auth";
import { Timestamp } from "firebase/firestore";

import { auth } from "@/lib/firebase";
import { createUser, getUserById, updateUser } from "./userService";

export const signInWithGoogle = async (): Promise<FirebaseUser> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;
    const existingUser = await getUserById(firebaseUser.uid);

    if (!existingUser) {
        const googleDisplayName = firebaseUser.displayName?.trim();
        const emailLocalPart = firebaseUser.email?.split("@")[0]?.trim();
        const displayName =
            googleDisplayName && googleDisplayName.length > 0
                ? googleDisplayName
                : emailLocalPart && emailLocalPart.length > 0
                  ? emailLocalPart
                  : "PeerSchedule User";
        const email = firebaseUser.email?.trim() ?? "";

        await createUser({
            uid: firebaseUser.uid,
            displayName,
            displayNameLower: displayName.toLowerCase(),
            email,
            emailLower: email.toLowerCase(),
            photoURL: firebaseUser.photoURL ?? undefined,
            role: "user",
            friendIds: [],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
    } else {
        const trimmedGoogleName = firebaseUser.displayName?.trim();
        const trimmedGoogleEmail = firebaseUser.email?.trim();
        const nextDisplayName =
            trimmedGoogleName && trimmedGoogleName.length > 0 ? trimmedGoogleName : existingUser.displayName;
        const nextEmail = trimmedGoogleEmail && trimmedGoogleEmail.length > 0 ? trimmedGoogleEmail : existingUser.email;

        await updateUser(firebaseUser.uid, {
            displayName: nextDisplayName,
            email: nextEmail,
            photoURL: firebaseUser.photoURL ?? existingUser.photoURL,
        });
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
    await updateUser(currentUser.uid, { displayName: trimmedName });
};

export const signOut = async (): Promise<void> => {
    await auth.signOut();
};
