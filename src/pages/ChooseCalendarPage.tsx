import {
    type SubmitEventHandler,
    useEffect,
    useState,
} from "react";

import {
    Link,
    useNavigate,
} from "react-router";

import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";
import type { Group } from "@/types/database";
import {
    createCalendar,
    getUserCalendars,
} from "@/services/calendarService";

export default function ChooseCalendarPage() {
    const navigate = useNavigate();

    const [calendars, setCalendars] = useState<Group[]>([]);
    const [currentUserId, setCurrentUserId] =
        useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const [calendarName, setCalendarName] = useState("");
    const [errorMessage, setErrorMessage] =
        useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setCurrentUserId(null);
                setIsLoading(false);

                void navigate("/", {
                    replace: true,
                });

                return;
            }

            setCurrentUserId(user.uid);
            setIsLoading(true);
            setErrorMessage(null);

            getUserCalendars(user.uid)
                .then((userCalendars) => {
                    setCalendars(userCalendars);
                })
                .catch((error: unknown) => {
                    console.error(
                        "Failed to load calendars:",
                        error,
                    );

                    if (error instanceof Error) {
                        setErrorMessage(error.message);
                    } else {
                        setErrorMessage(
                            "Unable to load your calendars.",
                        );
                    }
                })
                .finally(() => {
                    setIsLoading(false);
                });
        });

        return unsubscribe;
    }, [navigate]);

    const performCreateCalendar =
        async (): Promise<void> => {
            if (!currentUserId) {
                setErrorMessage(
                    "You must be signed in to create a calendar.",
                );
                return;
            }

            const trimmedName = calendarName.trim();

            if (trimmedName.length === 0) {
                setErrorMessage(
                    "Please enter a calendar name.",
                );
                return;
            }

            try {
                setIsCreating(true);
                setErrorMessage(null);

                const newCalendar = await createCalendar(
                    trimmedName,
                    currentUserId,
                );

                setCalendars((currentCalendars) => [
                    ...currentCalendars,
                    newCalendar,
                ]);

                setCalendarName("");
                setIsCreateOpen(false);
            } catch (error: unknown) {
                console.error(
                    "Failed to create calendar:",
                    error,
                );

                if (error instanceof Error) {
                    setErrorMessage(error.message);
                } else {
                    setErrorMessage(
                        "Unable to create the calendar.",
                    );
                }
            } finally {
                setIsCreating(false);
            }
        };

    const handleCreateCalendar: SubmitEventHandler<HTMLFormElement> = (
        event,
    ) => {
        event.preventDefault();
        void performCreateCalendar();
    };

    const handleOpenCreateForm = (): void => {
        setCalendarName("");
        setErrorMessage(null);
        setIsCreateOpen(true);
    };

    const handleCloseCreateForm = (): void => {
        if (isCreating) {
            return;
        }

        setCalendarName("");
        setErrorMessage(null);
        setIsCreateOpen(false);
    };

    if (isLoading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
                <title>Calendars | PeerSchedule</title>

                <p className="text-lg text-gray-600 dark:text-gray-300">
                    Loading your calendars...
                </p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <title>Choose Calendar | PeerSchedule</title>

            <div className="mx-auto max-w-6xl px-4 py-8">
                <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Choose a Calendar
                        </h1>

                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Open one of your calendars or create a
                            new shared calendar.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleOpenCreateForm}
                        className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                    >
                        Create Calendar
                    </button>
                </section>

                {errorMessage !== null && !isCreateOpen ? (
                    <div
                        role="alert"
                        className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                    >
                        {errorMessage}
                    </div>
                ) : null}

                {calendars.length > 0 ? (
                    <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {calendars.map((calendar) => {
                            const isOwner =
                                calendar.ownerId ===
                                currentUserId;

                            return (
                                <article
                                    key={calendar.id}
                                    className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                            {calendar.name}
                                        </h2>

                                        <span
                                            className={
                                                isOwner
                                                    ? "rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                                    : "rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                                            }
                                        >
                                            {isOwner
                                                ? "Owner"
                                                : "Member"}
                                        </span>
                                    </div>

                                    <p className="mt-4 flex-1 text-gray-600 dark:text-gray-400">
                                        {calendar.memberIds.length}{" "}
                                        {calendar.memberIds.length ===
                                        1
                                            ? "member"
                                            : "members"}
                                    </p>

                                    <Link
                                        to={`/calendars/${calendar.id}`}
                                        className="mt-6 block rounded-lg bg-blue-600 px-4 py-2 text-center font-semibold text-white hover:bg-blue-700"
                                    >
                                        Open Calendar
                                    </Link>
                                </article>
                            );
                        })}
                    </section>
                ) : (
                    <section className="mt-8 rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center dark:border-gray-700 dark:bg-gray-900">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            You do not have any calendars yet
                        </h2>

                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Create your first calendar to begin
                            scheduling events.
                        </p>

                        <button
                            type="button"
                            onClick={handleOpenCreateForm}
                            className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                        >
                            Create Your First Calendar
                        </button>
                    </section>
                )}
            </div>

            {isCreateOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Create Calendar
                            </h2>

                            <button
                                type="button"
                                onClick={handleCloseCreateForm}
                                disabled={isCreating}
                                aria-label="Close create calendar form"
                                className="text-2xl text-gray-500 hover:text-gray-900 disabled:opacity-50 dark:hover:text-white"
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={handleCreateCalendar}
                            className="mt-6 space-y-5"
                        >
                            <div>
                                <label
                                    htmlFor="calendar-name"
                                    className="block font-medium text-gray-700 dark:text-gray-300"
                                >
                                    Calendar name
                                </label>

                                <input
                                    id="calendar-name"
                                    type="text"
                                    value={calendarName}
                                    onChange={(event) => {
                                        setCalendarName(
                                            event.target.value,
                                        );
                                    }}
                                    required
                                    disabled={isCreating}
                                    placeholder="Example: COMP4650 Project"
                                    className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                />
                            </div>

                            {errorMessage !== null ? (
                                <p
                                    role="alert"
                                    className="text-sm text-red-600 dark:text-red-400"
                                >
                                    {errorMessage}
                                </p>
                            ) : null}

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseCreateForm}
                                    disabled={isCreating}
                                    className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isCreating
                                        ? "Creating..."
                                        : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </main>
    );
}