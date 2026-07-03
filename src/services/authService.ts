import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { createUser, getUserById } from "./userService";
import { auth, dateToTimestamp } from "@/lib/firebase";

export const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        // Check if the user already exists in the database
        const existingUser = await getUserById(user.uid);
        if (!existingUser) {
            // If the user doesn't exist, create a new user in the database
            await createUser({
                uid: user.uid,
                displayName: user.displayName ?? "",
                email: user.email ?? "",
                role: "user",
                friendIds: [],
                createdAt: dateToTimestamp(new Date()),
            });
        }
        return user;
    } catch (error) {
        console.error("Error signing in with Google:", error);
        throw error;
    }
};

export const signOut = async () => {
    try {
        await auth.signOut();
    } catch (error) {
        console.error("Error signing out:", error);
        throw error;
    }
};
