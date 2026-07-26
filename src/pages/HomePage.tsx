import { useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "@/hooks/useAuth";
import logo from "../public/img/TempLogo.png";

export default function HomePage() {
    const navigate = useNavigate();
    const { user, isLoading } = useAuth();
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handlePrimaryAction = (): void => {
        void (async () => {
            if (user) {
                await navigate("/calendars");
                return;
            }

            try {
                setIsSigningIn(true);
                setMessage(null);
                const { signInWithGoogle } = await import("../services/authService");
                await signInWithGoogle();
                await navigate("/calendars", { replace: true });
            } catch (error: unknown) {
                console.error("Google sign-in failed:", error);
                setMessage(
                    error instanceof Error
                        ? `Sign-in failed: ${error.message}`
                        : "Google sign-in failed. Please try again."
                );
            } finally {
                setIsSigningIn(false);
            }
        })();
    };

    return (
        <main className="bg-gradient-to-b from-blue-50 via-white to-slate-50">
            <title>Home | PeerSchedule</title>
            <section className="mx-auto grid min-h-[calc(100dvh-66px)] max-w-7xl items-center gap-12 px-4 py-12 lg:grid-cols-2 lg:px-8">
                <div>
                    <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                        Plan together without the scheduling chaos
                    </span>
                    <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
                        Shared calendars built for peers.
                    </h1>
                    <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                        PeerSchedule helps groups share calendars, coordinate availability, invite participants, and
                        manage meetings in one place.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-4">
                        <button
                            type="button"
                            onClick={handlePrimaryAction}
                            disabled={isSigningIn || isLoading}
                            className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isLoading
                                ? "Loading..."
                                : isSigningIn
                                  ? "Signing in..."
                                  : user
                                    ? "Open my calendars"
                                    : "Sign in with Google"}
                        </button>
                        <span className="text-sm text-slate-500">No separate password required.</span>
                    </div>
                    {message ? (
                        <p
                            role="alert"
                            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                        >
                            {message}
                        </p>
                    ) : null}
                </div>

                <div className="relative mx-auto w-full max-w-lg">
                    <div className="absolute -inset-5 rounded-[2rem] bg-blue-200/50 blur-2xl" />
                    <div className="relative rounded-[2rem] border border-blue-100 bg-white p-8 shadow-xl">
                        <img src={logo} alt="PeerSchedule logo" className="mx-auto h-28 w-28 object-contain" />
                        <div className="mt-8 grid gap-4 sm:grid-cols-2">
                            {[
                                ["Shared calendars", "Keep projects, clubs, and study groups organized."],
                                ["Meeting invites", "Track pending, accepted, and declined responses."],
                                ["Availability", "Share full details or show only that you are busy."],
                                ["Friend connections", "Find other users and coordinate with trusted peers."],
                            ].map(([title, description]) => (
                                <article key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <h2 className="font-bold text-slate-900">{title}</h2>
                                    <p className="mt-1 text-sm text-slate-600">{description}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
