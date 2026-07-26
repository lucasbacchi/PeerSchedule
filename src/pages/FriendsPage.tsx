import { useState } from "react";
import { type StoredFriend, scheduleStore } from "@/lib/localStore";

export default function FriendsPage() {
  const [friends, setFriends] = useState<StoredFriend[]>(scheduleStore.friends);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const visible = friends.filter((friend) => `${friend.name} ${friend.email}`.toLowerCase().includes(query.toLowerCase()));

  function add(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    const next = [...friends, { id: scheduleStore.id(), name: name.trim(), email: email.trim() }];
    scheduleStore.saveFriends(next); setFriends(next); setName(""); setEmail(""); setShowForm(false);
  }
  function remove(id: string) {
    if (!confirm("Remove this friend?")) return;
    const next = friends.filter((friend) => friend.id !== id);
    scheduleStore.saveFriends(next); setFriends(next);
  }

  return <main className="max-w-5xl mx-auto px-6 py-10">
    <title>Friends | PeerSchedule</title>
    <div className="flex justify-between items-end"><div><h1 className="text-3xl font-bold">Friends</h1><p className="text-slate-600">People you can invite to shared calendars.</p></div><button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold">Add friend</button></div>
    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" className="w-full border rounded-xl px-4 py-3 mt-6" />
    <div className="bg-white border rounded-xl divide-y mt-4">
      {visible.map((friend) => <div key={friend.id} className="p-4 flex justify-between items-center"><div><strong>{friend.name}</strong><p className="text-sm text-slate-500">{friend.email}</p></div><button onClick={() => remove(friend.id)} className="text-red-600 text-sm">Remove</button></div>)}
      {!visible.length && <p className="p-8 text-center text-slate-500">{query ? "No matching friends." : "Add friends to start planning together."}</p>}
    </div>
    {showForm && <div className="fixed inset-0 bg-black/40 grid place-items-center z-50"><form onSubmit={add} className="bg-white rounded-2xl p-6 w-[min(420px,calc(100%-2rem))] space-y-4"><h2 className="text-xl font-bold">Add friend</h2><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="w-full border rounded-lg px-3 py-2" /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full border rounded-lg px-3 py-2" /><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="border rounded-lg px-4 py-2">Cancel</button><button className="bg-blue-600 text-white rounded-lg px-4 py-2">Add</button></div></form></div>}
  </main>;
}
