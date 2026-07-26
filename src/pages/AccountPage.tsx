import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { deleteUser } from "firebase/auth";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getUser, updateProfile } from "@/services/dataService";
import { signOut } from "@/services/authService";

export default function AccountPage() {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (user) void getUser(user.uid).then((record) => setName(record?.displayName ?? user.displayName ?? "")); }, [user]);
  if (loading) return <main className="p-10 text-center">Loading…</main>;
  if (!user) return <Navigate to="/" replace />;
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!user || !name.trim()) return;
    try { setBusy(true); await updateProfile(user.uid, name.trim()); setMessage("Profile saved."); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Could not save."); } finally { setBusy(false); }
  }
  async function logout() { await signOut(); void navigate("/", { replace: true }); }
  async function remove() {
    if (!user || !confirm("Permanently delete your authentication account?")) return;
    try { await deleteUser(user); void navigate("/", { replace: true }); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Could not delete account."); }
  }
  return <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
    <title>Account | PeerSchedule</title><div><h1 className="text-3xl font-bold">Account</h1><p className="text-slate-600">Manage your PeerSchedule profile.</p></div>
    <form onSubmit={(event) => void save(event)} className="bg-white border rounded-2xl p-6 space-y-4"><label className="block font-semibold">Display name<input required value={name} onChange={(e) => setName(e.target.value)} className="block w-full border rounded-lg px-3 py-2 mt-1" /></label><label className="block font-semibold">Email<input disabled value={user.email ?? ""} className="block w-full border rounded-lg px-3 py-2 mt-1 bg-slate-100" /></label><button disabled={busy} className="bg-blue-600 text-white rounded-lg px-5 py-2">Save profile</button>{message && <p role="status">{message}</p>}</form>
    <div className="bg-white border rounded-2xl p-6 flex gap-3"><button onClick={() => void logout()} className="border rounded-lg px-5 py-2">Sign out</button><button onClick={() => void remove()} className="bg-red-600 text-white rounded-lg px-5 py-2">Delete account</button></div>
  </main>;
}
