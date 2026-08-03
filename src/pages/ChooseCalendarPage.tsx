import { type SubmitEventHandler, useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

import Modal from "@/components/common/Modal";
import PageState from "@/components/common/PageState";
import CalendarColorPicker from "@/components/common/CalendarColorPicker";
import { useRequireAuth } from "@/hooks/useAuth";
import {
    createCalendar,
    deleteCalendar,
    ensurePersonalCalendar,
    getUserCalendars,
    updateCalendar,
} from "@/services/calendarService";
import type { Group } from "@/types/database";

interface CalendarFormState {
    name: string;
    description: string;
    color: string;
}

const emptyForm: CalendarFormState = {
    name: "",
    description: "",
    color: "#2563eb",
};

export default function ChooseCalendarPage() {
    const { user, isLoading: isAuthLoading } = useRequireAuth();
    const [calendars, setCalendars] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCalendar, setEditingCalendar] = useState<Group | null>(null);
    const [calendarToDelete, setCalendarToDelete] = useState<Group | null>(null);
    const [form, setForm] = useState<CalendarFormState>(emptyForm);

    const loadCalendars = useCallback(async (): Promise<void> => {
        if (!user) return;

        try {
            setIsLoading(true);
            setErrorMessage(null);
            await ensurePersonalCalendar(user.uid);
            setCalendars(await getUserCalendars(user.uid));
        } catch (error: unknown) {
            console.error("Failed to load calendars:", error);
            setErrorMessage(error instanceof Error ? error.message : "Unable to load your calendars.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadCalendars();
    }, [loadCalendars]);

    const openCreateForm = (): void => {
        setEditingCalendar(null);
        setForm(emptyForm);
        setErrorMessage(null);
        setIsFormOpen(true);
    };

    const openEditForm = (calendar: Group): void => {
        setEditingCalendar(calendar);
        setForm({
            name: calendar.name,
            description: calendar.description ?? "",
            color: calendar.color ?? "#2563eb",
        });
        setErrorMessage(null);
        setIsFormOpen(true);
    };

    const closeForm = (): void => {
        if (isSaving) return;
        setIsFormOpen(false);
        setEditingCalendar(null);
        setForm(emptyForm);
        setErrorMessage(null);
    };

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        void (async () => {
            if (!user) return;

            try {
                setIsSaving(true);
                setErrorMessage(null);
                setSuccessMessage(null);

                if (editingCalendar) {
                    await updateCalendar(editingCalendar.id, form);
                    setSuccessMessage("Calendar updated successfully.");
                } else {
                    await createCalendar({ ...form, ownerId: user.uid });
                    setSuccessMessage("Calendar created successfully.");
                }

                closeForm();
                await loadCalendars();
            } catch (error: unknown) {
                console.error("Unable to save calendar:", error);
                setErrorMessage(error instanceof Error ? error.message : "Unable to save the calendar.");
            } finally {
                setIsSaving(false);
            }
        })();
    };

    const handleDelete = (): void => {
        if (!calendarToDelete) return;

        void (async () => {
            try {
                setIsSaving(true);
                setErrorMessage(null);
                await deleteCalendar(calendarToDelete.id);
                setCalendarToDelete(null);
                setSuccessMessage("Calendar and its events were deleted.");
                await loadCalendars();
            } catch (error: unknown) {
                console.error("Unable to delete calendar:", error);
                setErrorMessage(error instanceof Error ? error.message : "Unable to delete the calendar.");
            } finally {
                setIsSaving(false);
            }
        })();
    };

    if (isAuthLoading || (user && isLoading)) {
        return <PageState title="Loading calendars" message="Getting your shared calendars ready..." />;
    }

    if (!user) return null;

    return (
        <main className="min-h-[calc(100dvh-4rem)] bg-slate-50">
            <title>PeerSchedule</title>
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Your workspace</p>
                        <h1 className="mt-1 text-3xl font-black text-slate-950 sm:text-4xl">Choose a calendar</h1>
                        <p className="mt-3 max-w-2xl text-slate-600">
                            Open a calendar shared with you, or create a new one for a team, class, club, or friend
                            group.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreateForm}
                        className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-sm hover:bg-blue-700"
                    >
                        + Create calendar
                    </button>
                </section>

                {errorMessage && !isFormOpen ? (
                    <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                        {errorMessage}
                    </div>
                ) : null}
                {successMessage ? (
                    <div
                        role="status"
                        className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800"
                    >
                        {successMessage}
                    </div>
                ) : null}

                {calendars.length === 0 ? (
                    <section className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-3xl text-blue-700">
                            ⌘
                        </div>
                        <h2 className="mt-5 text-2xl font-bold text-slate-900">No calendars yet</h2>
                        <p className="mx-auto mt-2 max-w-md text-slate-600">
                            Create your first shared calendar to begin adding events and inviting members.
                        </p>
                        <button
                            type="button"
                            onClick={openCreateForm}
                            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
                        >
                            Create your first calendar
                        </button>
                    </section>
                ) : (
                    <section className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {calendars.map((calendar) => {
                            const isOwner = calendar.ownerId === user.uid;
                            return (
                                <article
                                    key={calendar.id}
                                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                                >
                                    <div className="h-3" style={{ backgroundColor: calendar.color ?? "#2563eb" }} />
                                    <div className="flex min-h-64 flex-col p-6">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <h2 className="text-xl font-bold text-slate-950">{calendar.name}</h2>
                                                <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                                                    {calendar.description?.trim()
                                                        ? calendar.description
                                                        : "No description has been added."}
                                                </p>
                                            </div>
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-bold ${isOwner ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                                            >
                                                {calendar.isPersonal ? "Personal" : isOwner ? "Owner" : "Member"}
                                            </span>
                                        </div>

                                        <div className="mt-6 flex flex-1 items-end justify-between text-sm text-slate-500">
                                            <span>
                                                {calendar.isPersonal
                                                    ? "Private"
                                                    : `${calendar.memberIds.length} ${
                                                          calendar.memberIds.length === 1 ? "member" : "members"
                                                      }`}
                                            </span>
                                            <span>Created {calendar.createdAt.toDate().toLocaleDateString()}</span>
                                        </div>

                                        <div className="mt-6 flex flex-wrap gap-2">
                                            <Link
                                                to={`/calendars/${calendar.id}`}
                                                className="flex-1 rounded-xl px-4 py-2.5 text-center font-bold text-white shadow-sm transition hover:brightness-90"
                                                style={{ backgroundColor: calendar.color ?? "#2563eb" }}
                                            >
                                                Open calendar
                                            </Link>
                                            {isOwner ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditForm(calendar)}
                                                        className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Edit
                                                    </button>
                                                    {!calendar.isPersonal ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCalendarToDelete(calendar)}
                                                            className="rounded-xl border border-red-200 px-4 py-2.5 font-bold text-red-700 hover:bg-red-50"
                                                        >
                                                            Delete
                                                        </button>
                                                    ) : null}
                                                </>
                                            ) : null}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                )}
            </div>

            <Modal
                title={editingCalendar ? "Edit calendar" : "Create calendar"}
                isOpen={isFormOpen}
                onClose={closeForm}
                closeDisabled={isSaving}
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="calendar-name" className="block text-sm font-bold text-slate-700">
                            Calendar name
                        </label>
                        <input
                            id="calendar-name"
                            value={form.name}
                            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                            required
                            minLength={2}
                            maxLength={80}
                            disabled={isSaving}
                            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="COMP4650 Project"
                        />
                    </div>
                    <div>
                        <label htmlFor="calendar-description" className="block text-sm font-bold text-slate-700">
                            Description
                        </label>
                        <textarea
                            id="calendar-description"
                            value={form.description}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, description: event.target.value }))
                            }
                            maxLength={300}
                            rows={4}
                            disabled={isSaving}
                            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            placeholder="What will this calendar be used for?"
                        />
                        <p className="mt-1 text-right text-xs text-slate-500">{form.description.length}/300</p>
                    </div>
                    <div>
                        <label htmlFor="calendar-color" className="block text-sm font-bold text-slate-700">
                            Calendar color
                        </label>
                        <CalendarColorPicker
                            id="calendar-color"
                            value={form.color}
                            onChange={(color) => setForm((current) => ({ ...current, color }))}
                            disabled={isSaving}
                        />
                        <p className="mt-2 text-sm text-slate-600">Used on calendar cards and event accents.</p>
                    </div>
                    {errorMessage ? (
                        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                            {errorMessage}
                        </p>
                    ) : null}
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeForm}
                            disabled={isSaving}
                            className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSaving ? "Saving..." : editingCalendar ? "Save changes" : "Create calendar"}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                title="Delete calendar?"
                isOpen={calendarToDelete !== null}
                onClose={() => setCalendarToDelete(null)}
                size="sm"
                closeDisabled={isSaving}
            >
                <p className="text-slate-600">
                    This permanently deletes <strong>{calendarToDelete?.name}</strong> and every event stored in it.
                    This action cannot be undone.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => setCalendarToDelete(null)}
                        disabled={isSaving}
                        className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isSaving}
                        className="rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        {isSaving ? "Deleting..." : "Delete calendar"}
                    </button>
                </div>
            </Modal>
        </main>
    );
}
