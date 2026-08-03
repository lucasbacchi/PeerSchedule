import { useEffect, useState } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router";

import { auth } from "@/lib/firebase";
import { ensurePersonalCalendar } from "@/services/calendarService";
import { ensureUserSearchTokens } from "@/services/userService";

interface AuthState {
    user: FirebaseUser | null;
    isLoading: boolean;
}

export function useAuth(): AuthState {
    const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        return onAuthStateChanged(auth, (nextUser) => {
            void (async () => {
                try {
                    if (nextUser) {
                        await Promise.all([ensurePersonalCalendar(nextUser.uid), ensureUserSearchTokens(nextUser.uid)]);
                    }
                } catch (error: unknown) {
                    console.error("Unable to provision personal calendar:", error);
                } finally {
                    setUser(nextUser);
                    setIsLoading(false);
                }
            })();
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

    useEffect(() => {
        const protectRestoredPage = (event: PageTransitionEvent): void => {
            if (event.persisted && !auth.currentUser) {
                void navigate("/", { replace: true });
            }
        };
        window.addEventListener("pageshow", protectRestoredPage);
        return () => window.removeEventListener("pageshow", protectRestoredPage);
    }, [navigate]);

    return authState;
}
