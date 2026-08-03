import { type SubmitEventHandler, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";

import Modal from "@/components/common/Modal";
import PageState from "@/components/common/PageState";
import { useRequireAuth } from "@/hooks/useAuth";
import { getFriends } from "@/services/friendService";
import { getUserById } from "@/services/userService";
import type { User } from "@/types/database";

export default function AccountPage() {
    const navigate = useNavigate();
    const { user, isLoading: isAuthLoading } = useRequireAuth();
    const [profile, setProfile] = useState<User | null>(null);
    const [friendCount, setFriendCount] = useState(0);
    const [displayName, setDisplayName] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");

    const loadProfile = useCallback(async (): Promise<void> => {
        if (!user) return;
        try {
            setIsLoading(true);
            setErrorMessage(null);
            const [nextProfile, friends] = await Promise.all([getUserById(user.uid), getFriends(user.uid)]);
            if (!nextProfile) throw new Error("Your PeerSchedule profile could not be found.");
            setProfile(nextProfile);
            setDisplayName(nextProfile.displayName);
            setFriendCount(friends.length);
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : "Unable to load your account.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void loadProfile();
    }, [loadProfile]);

    const handleProfileSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        void (async () => {
            try {
                setIsSaving(true);
                setMessage(null);
                setErrorMessage(null);
                const { updateSignedInUserProfile } = await import("@/services/authService");
                await updateSignedInUserProfile(displayName);
                setMessage("Your display name was updated.");
                await loadProfile();
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to update your account.");
            } finally {
                setIsSaving(false);
            }
        })();
    };

    const handleSignOut = (): void => {
        void (async () => {
            try {
                setIsSaving(true);
                const { signOut } = await import("@/services/authService");
                await signOut();
                await navigate("/", { replace: true });
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to sign out.");
            } finally {
                setIsSaving(false);
            }
        })();
    };

    const handleDeleteAccount = (): void => {
        if (deleteConfirmation !== "DELETE") return;
        void (async () => {
            try {
                setIsSaving(true);
                setErrorMessage(null);
                const { deleteSignedInAccount } = await import("@/services/authService");
                await deleteSignedInAccount();
                window.location.replace("/");
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to delete your account.");
                setIsDeleteConfirmOpen(false);
            } finally {
                setIsSaving(false);
            }
        })();
    };

    if (isAuthLoading || (user && isLoading)) {
        return <PageState title="Loading account" message="Retrieving your PeerSchedule profile..." />;
    }

    if (!user) return null;
    if (!profile) return <PageState title="Account unavailable" message={errorMessage ?? undefined} tone="error" />;

    return (
        <main className="min-h-[calc(100dvh-4rem)] bg-slate-50">
            <title>PeerSchedule</title>
            <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Profile and settings</p>
                    <h1 className="mt-1 text-3xl font-black text-slate-950">Account management</h1>
                    <p className="mt-2 text-slate-600">
                        View your Google account information and update your PeerSchedule display name.
                    </p>
                </div>

                {message ? (
                    <div
                        role="status"
                        className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800"
                    >
                        {message}
                    </div>
                ) : null}
                {errorMessage ? (
                    <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
                        {errorMessage}
                    </div>
                ) : null}

                <div className="mt-8 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
                    <aside className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                        {profile.photoURL ? (
                            <img
                                src={profile.photoURL}
                                alt={`${profile.displayName}'s profile`}
                                className="mx-auto h-28 w-28 rounded-full border-4 border-blue-100 object-cover"
                            />
                        ) : (
                            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-blue-100 text-4xl font-black text-blue-700">
                                {profile.displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <h2 className="mt-4 text-xl font-black text-slate-950">{profile.displayName}</h2>
                        <p className="mt-1 break-all text-sm text-slate-500">{profile.email}</p>
                        <span className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
                            {profile.role}
                        </span>
                    </aside>

                    <section className="space-y-6">
                        <form
                            onSubmit={handleProfileSubmit}
                            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                        >
                            <h2 className="text-xl font-black text-slate-950">Profile details</h2>
                            <div className="mt-5">
                                <label htmlFor="display-name" className="block text-sm font-bold text-slate-700">
                                    Display name
                                </label>
                                <input
                                    id="display-name"
                                    value={displayName}
                                    onChange={(event) => setDisplayName(event.target.value)}
                                    minLength={2}
                                    maxLength={80}
                                    required
                                    disabled={isSaving}
                                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                            <div className="mt-5">
                                <label htmlFor="email" className="block text-sm font-bold text-slate-700">
                                    Google email
                                </label>
                                <input
                                    id="email"
                                    value={profile.email}
                                    readOnly
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-500"
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Email changes are managed through your Google account.
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={isSaving || displayName.trim() === profile.displayName}
                                className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : "Save profile"}
                            </button>
                        </form>

                        <section className="grid gap-4 sm:grid-cols-3">
                            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-sm font-bold text-slate-500">Friends</p>
                                <p className="mt-2 text-3xl font-black text-slate-950">{friendCount}</p>
                            </article>
                            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-sm font-bold text-slate-500">Member since</p>
                                <p className="mt-2 font-black text-slate-950">
                                    {profile.createdAt.toDate().toLocaleDateString()}
                                </p>
                            </article>
                            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="text-sm font-bold text-slate-500">Account ID</p>
                                <p className="mt-2 truncate font-mono text-xs text-slate-700" title={profile.uid}>
                                    {profile.uid}
                                </p>
                            </article>
                        </section>

                        <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
                            <h2 className="text-xl font-black text-slate-950">Account actions</h2>
                            <p className="mt-2 text-sm text-slate-600">Sign out of PeerSchedule on this browser.</p>
                            <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={handleSignOut}
                                    disabled={isSaving}
                                    className="rounded-xl border border-slate-300 px-5 py-2.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Sign out
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDeleteConfirmation("");
                                        setIsDeleteConfirmOpen(true);
                                    }}
                                    disabled={isSaving}
                                    className="rounded-xl bg-red-600 px-5 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                    Delete account
                                </button>
                            </div>
                        </section>
                    </section>
                </div>
            </div>

            <Modal
                title="Permanently delete account?"
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                closeDisabled={isSaving}
            >
                <div className="space-y-4">
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        This permanently deletes your profile, personal calendar, events you created, availability, and
                        friend requests. Shared calendars you own and their contents will also be deleted. This cannot
                        be undone.
                    </div>
                    <div>
                        <label htmlFor="delete-account-confirmation" className="block text-sm font-bold text-slate-700">
                            Type DELETE to confirm
                        </label>
                        <input
                            id="delete-account-confirmation"
                            value={deleteConfirmation}
                            onChange={(event) => setDeleteConfirmation(event.target.value)}
                            disabled={isSaving}
                            autoComplete="off"
                            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                        />
                    </div>
                    <p className="text-sm text-slate-600">
                        Google will ask you to sign in again before deletion is allowed.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsDeleteConfirmOpen(false)}
                            disabled={isSaving}
                            className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteAccount}
                            disabled={isSaving || deleteConfirmation !== "DELETE"}
                            className="rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSaving ? "Deleting..." : "Permanently delete account"}
                        </button>
                    </div>
                </div>
            </Modal>
        </main>
    );
}
