import { useEffect, useState } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router";

import { auth } from "@/lib/firebase";

interface AuthState {
    user: FirebaseUser | null;
    isLoading: boolean;
}

export function useAuth(): AuthState {
    const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
    const [isLoading, setIsLoading] = useState(auth.currentUser === null);

    useEffect(() => {
        return onAuthStateChanged(auth, (nextUser) => {
            setUser(nextUser);
            setIsLoading(false);
        });
    }, []);

    return { user, isLoading };
}

export function useRequireAuth(): AuthState {
    const authState = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authState.isLoading && !authState.user) {
            void navigate("/", { replace: true });
        }
    }, [authState.isLoading, authState.user, navigate]);

    return authState;
}
