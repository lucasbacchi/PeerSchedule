import { useState } from "react";
import { useNavigate } from "react-router";

import logo from "../public/img/TempLogo.png";

export default function HomePage() {
    const navigate = useNavigate();

    const [isSigningIn, setIsSigningIn] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const performGoogleSignIn = async (): Promise<void> => {
        try {
            setIsSigningIn(true);
            setMessage(null);

            // Firebase Auth loads only after the button is clicked.
            const { signInWithGoogle } = await import(
                "../services/authService"
            );

            await signInWithGoogle();

            // Send the user to the calendar selection page.
            await navigate("/calendars", {
                replace: true,
            });
        } catch (error: unknown) {
            console.error("Google sign-in failed:", error);

            if (error instanceof Error) {
                setMessage(`Sign-in failed: ${error.message}`);
            } else {
                setMessage(
                    "Google sign-in failed. Please try again.",
                );
            }
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleGoogleSignIn = (): void => {
        void performGoogleSignIn();
    };

    return (
        <div className="space-y-6 lg:space-y-8">
            <title>Home | PeerSchedule</title>

            <div className="mx-auto max-w-4xl px-4">
                <h1 className="text-3xl font-bold">
                    Welcome to PeerSchedule
                </h1>

                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
                    PeerSchedule is a calendar-sharing application for
                    managing group meetings and schedules. You can create a
                    group, add members, and share your schedules with them. You
                    can also view the schedules of other members in the group
                    and find a common time for meetings.
                </p>
            </div>

            <div className="flex flex-col items-center gap-4 px-4">
                <p>Sign in with Google to get started.</p>

                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isSigningIn}
                    className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isSigningIn
                        ? "Signing in..."
                        : "Sign in with Google"}
                </button>

                {message !== null ? (
                    <p className="text-center text-red-600">
                        {message}
                    </p>
                ) : null}
            </div>
        </div>
    );
}