import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useAuthUser } from "@/hooks/useAuthUser";
import { type UserRecord, addFriend, getFriends, searchUsers } from "@/services/dataService";

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuthUser();
  const [friends, setFriends] = useState<UserRecord[]>([]);
  const [results, setResults] = useState<UserRecord[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);

  async function refresh(uid: string) {
    try { setFriends(await getFriends(uid)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load friends."); }
  }
  // Firebase is the external source synchronized by this effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (user) void refresh(user.uid); }, [user]);
  useEffect(() => {
    if (!user || query.trim().length < 2) return;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchUsers(query, user.uid).then(setResults).catch((reason: Error) => setError(reason.message)).finally(() => setSearching(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, user]);

  async function connect(friendId: string) {
    if (!user) return;
    try { await addFriend(user.uid, friendId); await refresh(user.uid); setResults((items) => items.filter((item) => item.id !== friendId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not add friend."); }
  }

  if (authLoading) return <main className="p-10 text-center">Loading…</main>;
  if (!user) return <Navigate to="/" replace />;
  const friendIds = new Set(friends.map((friend) => friend.id));
  return <main className="max-w-5xl mx-auto px-6 py-10">
    <title>Friends | PeerSchedule</title>
    <h1 className="text-3xl font-bold">Friends</h1><p className="text-slate-600">Find people by display name or email and add them to your network.</p>
    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" className="w-full border rounded-xl px-4 py-3 mt-6" />
    {error && <p role="alert" className="text-red-600 mt-3">{error}</p>}
    {(query.length >= 2 || searching) && <section className="bg-white border rounded-xl divide-y mt-3"><h2 className="font-bold p-4">Search results</h2>{results.map((person) => <div key={person.id} className="p-4 flex justify-between items-center"><div><strong>{person.displayName}</strong><p className="text-sm text-slate-500">{person.email}</p></div>{friendIds.has(person.id) ? <span className="text-sm text-green-600">Friend</span> : <button onClick={() => void connect(person.id)} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm">Add</button>}</div>)}{!searching && !results.length && <p className="p-4 text-slate-500">No users found.</p>}{searching && <p className="p-4 text-slate-500">Searching…</p>}</section>}
    <section className="bg-white border rounded-xl divide-y mt-6"><h2 className="font-bold p-4">Your friends</h2>{friends.map((friend) => <div key={friend.id} className="p-4"><strong>{friend.displayName}</strong><p className="text-sm text-slate-500">{friend.email}</p></div>)}{!friends.length && <p className="p-8 text-center text-slate-500">No friends yet.</p>}</section>
  </main>;
}
