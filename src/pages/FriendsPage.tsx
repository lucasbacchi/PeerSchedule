import { type SubmitEventHandler, useCallback, useEffect, useMemo, useState } from "react";

import PageState from "@/components/common/PageState";
import { useRequireAuth } from "@/hooks/useAuth";
import {
    cancelFriendRequest,
    getFriendRequests,
    getFriends,
    removeFriend,
    respondToFriendRequest,
    sendFriendRequest,
    watchFriendRequests,
} from "@/services/friendService";
import { getUsersByIds, searchUsers } from "@/services/userService";
import type { FriendRequest, User } from "@/types/database";

export default function FriendsPage() {
    const { user, isLoading: isAuthLoading } = useRequireAuth();
    const [friends, setFriends] = useState<User[]>([]);
    const [incoming, setIncoming] = useState<FriendRequest[]>([]);
    const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
    const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
    const [searchText, setSearchText] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isWorking, setIsWorking] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadFriends = useCallback(async (): Promise<void> => {
        if (!user) return;

        try {
            setIsLoading(true);
            setErrorMessage(null);
            const [nextFriends, requests] = await Promise.all([getFriends(user.uid), getFriendRequests(user.uid)]);
            const relatedIds = [
                ...nextFriends.map((friend) => friend.uid),
                ...requests.incoming.map((request) => request.senderId),
                ...requests.outgoing.map((request) => request.receiverId),
            ];
            const relatedUsers = await getUsersByIds(relatedIds);

            setFriends(nextFriends);
            setIncoming(requests.incoming);
            setOutgoing(requests.outgoing);
            setUserMap(new Map(relatedUsers.map((relatedUser) => [relatedUser.uid, relatedUser])));
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : "Unable to load friend information.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;

        return watchFriendRequests(
            user.uid,
            (requests) => {
                void (async () => {
                    try {
                        const nextFriends = await getFriends(user.uid);
                        const relatedIds = [
                            ...nextFriends.map((friend) => friend.uid),
                            ...requests.incoming.map((request) => request.senderId),
                            ...requests.outgoing.map((request) => request.receiverId),
                        ];
                        const relatedUsers = await getUsersByIds(relatedIds);
                        setFriends(nextFriends);
                        setIncoming(requests.incoming);
                        setOutgoing(requests.outgoing);
                        setUserMap(new Map(relatedUsers.map((relatedUser) => [relatedUser.uid, relatedUser])));
                        setIsLoading(false);
                    } catch (error: unknown) {
                        setErrorMessage(
                            error instanceof Error ? error.message : "Unable to update friend information."
                        );
                        setIsLoading(false);
                    }
                })();
            },
            (error) => {
                setErrorMessage(error.message);
                setIsLoading(false);
            }
        );
    }, [user]);

    const friendIdSet = useMemo(() => new Set(friends.map((friend) => friend.uid)), [friends]);
    const pendingUserIds = useMemo(() => {
        const ids = new Set<string>();
        for (const request of incoming.filter((request) => request.status === "pending")) ids.add(request.senderId);
        for (const request of outgoing.filter((request) => request.status === "pending")) ids.add(request.receiverId);
        return ids;
    }, [incoming, outgoing]);
    const incomingRequestBySenderId = useMemo(
        () =>
            new Map(
                incoming.filter((request) => request.status === "pending").map((request) => [request.senderId, request])
            ),
        [incoming]
    );

    const handleSearch: SubmitEventHandler<HTMLFormElement> = (event) => {
        event.preventDefault();
        if (!user) return;

        void (async () => {
            try {
                setIsWorking(true);
                setMessage(null);
                setErrorMessage(null);
                const results = await searchUsers(searchText, user.uid);
                setSearchResults(results);
                if (results.length === 0) setMessage("No users matched that case-sensitive display name fragment.");
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "Unable to search for users.");
            } finally {
                setIsWorking(false);
            }
        })();
    };

    const runAction = (action: () => Promise<void>, successMessage: string): void => {
        void (async () => {
            try {
                setIsWorking(true);
                setMessage(null);
                setErrorMessage(null);
                await action();
                setMessage(successMessage);
                await loadFriends();
            } catch (error: unknown) {
                setErrorMessage(error instanceof Error ? error.message : "The friend action could not be completed.");
            } finally {
                setIsWorking(false);
            }
        })();
    };

    if (isAuthLoading || (user && isLoading)) {
        return <PageState title="Loading friends" message="Retrieving friend requests and connections..." />;
    }
    if (!user) {
        return (
            <PageState
                title="Friends unavailable"
                message="Sign in to view and manage your friends list."
                tone="error"
            />
        );
    }

    const pendingIncoming = incoming.filter((request) => request.status === "pending");
    const pendingOutgoing = outgoing.filter((request) => request.status === "pending");

    return (
        <main className="min-h-[calc(100dvh-4rem)] bg-slate-50">
            <title>PeerSchedule</title>
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-blue-600">Peer connections</p>
                    <h1 className="mt-1 text-3xl font-black text-slate-950">Friend management</h1>
                    <p className="mt-2 max-w-2xl text-slate-600">
                        Find other PeerSchedule users, manage requests, and build a trusted scheduling network.
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

                <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-black text-slate-950">Find a PeerSchedule user</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Search for any case-sensitive part of a user&apos;s display name.
                    </p>
                    <form onSubmit={handleSearch} className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <label htmlFor="friend-search" className="sr-only">
                            Search users
                        </label>
                        <input
                            id="friend-search"
                            value={searchText}
                            onChange={(event) => setSearchText(event.target.value)}
                            minLength={1}
                            required
                            placeholder="Case-sensitive display name fragment"
                            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                        <button
                            type="submit"
                            disabled={isWorking || searchText.trim().length < 1}
                            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isWorking ? "Searching..." : "Search"}
                        </button>
                    </form>

                    {searchResults.length > 0 ? (
                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                            {searchResults.map((result) => {
                                const alreadyFriends = friendIdSet.has(result.uid);
                                const isPending = pendingUserIds.has(result.uid);
                                const incomingRequest = incomingRequestBySenderId.get(result.uid);
                                return (
                                    <article
                                        key={result.uid}
                                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            {result.photoURL ? (
                                                <img
                                                    src={result.photoURL}
                                                    alt=""
                                                    className="h-11 w-11 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-black text-blue-700">
                                                    {result.displayName.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <h3 className="truncate font-bold text-slate-900">
                                                    {result.displayName}
                                                </h3>
                                                <p className="truncate text-sm text-slate-500">{result.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={isWorking || alreadyFriends || (isPending && !incomingRequest)}
                                            onClick={() =>
                                                incomingRequest
                                                    ? runAction(
                                                          () =>
                                                              respondToFriendRequest(
                                                                  incomingRequest.id,
                                                                  user.uid,
                                                                  "accepted"
                                                              ),
                                                          `${result.displayName} is now your friend.`
                                                      )
                                                    : runAction(
                                                          () =>
                                                              sendFriendRequest(user.uid, result.uid).then(
                                                                  () => undefined
                                                              ),
                                                          `Friend request sent to ${result.displayName}.`
                                                      )
                                            }
                                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500"
                                        >
                                            {alreadyFriends
                                                ? "Friends"
                                                : incomingRequest
                                                  ? "Accept"
                                                  : isPending
                                                    ? "Pending"
                                                    : "Add friend"}
                                        </button>
                                    </article>
                                );
                            })}
                        </div>
                    ) : null}
                </section>

                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-950">Incoming requests</h2>
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                                {pendingIncoming.length}
                            </span>
                        </div>
                        {pendingIncoming.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-500">No incoming requests.</p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {pendingIncoming.map((request) => {
                                    const sender = userMap.get(request.senderId);
                                    return (
                                        <article key={request.id} className="rounded-xl border border-slate-200 p-4">
                                            <h3 className="font-bold text-slate-900">
                                                {sender?.displayName ?? "PeerSchedule user"}
                                            </h3>
                                            <p className="text-sm text-slate-500">{sender?.email}</p>
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    type="button"
                                                    disabled={isWorking}
                                                    onClick={() =>
                                                        runAction(
                                                            () =>
                                                                respondToFriendRequest(
                                                                    request.id,
                                                                    user.uid,
                                                                    "accepted"
                                                                ),
                                                            "Friend request accepted."
                                                        )
                                                    }
                                                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isWorking}
                                                    onClick={() =>
                                                        runAction(
                                                            () =>
                                                                respondToFriendRequest(
                                                                    request.id,
                                                                    user.uid,
                                                                    "declined"
                                                                ),
                                                            "Friend request declined."
                                                        )
                                                    }
                                                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-black text-slate-950">Sent requests</h2>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                {pendingOutgoing.length}
                            </span>
                        </div>
                        {pendingOutgoing.length === 0 ? (
                            <p className="mt-4 text-sm text-slate-500">No pending sent requests.</p>
                        ) : (
                            <div className="mt-4 space-y-3">
                                {pendingOutgoing.map((request) => {
                                    const receiver = userMap.get(request.receiverId);
                                    return (
                                        <article
                                            key={request.id}
                                            className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
                                        >
                                            <div className="min-w-0">
                                                <h3 className="truncate font-bold text-slate-900">
                                                    {receiver?.displayName ?? "PeerSchedule user"}
                                                </h3>
                                                <p className="truncate text-sm text-slate-500">{receiver?.email}</p>
                                            </div>
                                            <button
                                                type="button"
                                                disabled={isWorking}
                                                onClick={() =>
                                                    runAction(
                                                        () => cancelFriendRequest(request.id, user.uid),
                                                        "Friend request cancelled."
                                                    )
                                                }
                                                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                                            >
                                                Cancel
                                            </button>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>

                <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-950">Current friends</h2>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            {friends.length}
                        </span>
                    </div>
                    {friends.length === 0 ? (
                        <p className="mt-4 text-sm text-slate-500">You have not added any friends yet.</p>
                    ) : (
                        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {friends.map((friend) => (
                                <article key={friend.uid} className="rounded-xl border border-slate-200 p-4">
                                    <div className="flex items-center gap-3">
                                        {friend.photoURL ? (
                                            <img
                                                src={friend.photoURL}
                                                alt=""
                                                className="h-12 w-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 font-black text-blue-700">
                                                {friend.displayName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <h3 className="truncate font-bold text-slate-900">{friend.displayName}</h3>
                                            <p className="truncate text-sm text-slate-500">{friend.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={isWorking}
                                        onClick={() =>
                                            runAction(
                                                () => removeFriend(user.uid, friend.uid),
                                                `${friend.displayName} was removed from your friends.`
                                            )
                                        }
                                        className="mt-4 w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                                    >
                                        Remove friend
                                    </button>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
