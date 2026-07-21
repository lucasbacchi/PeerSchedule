import { useState } from "react";

export default function AccountPage() {
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email] = useState("random@cal.com");
    const [memberSince] = useState("Jan 2023");
    const [notifications, setNotifications] = useState({
        friendRequests: false,
        eventReminders: false,
        calendarInvitations: false,
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    function toggleNotification(key: keyof typeof notifications) {
        setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    }

    return (
        <div className="bg-[#F8FAFC] flex flex-col font-['Inter',sans-serif]">
            <main className="flex-1 px-10 pt-6 pb-8">
                {/* Page Title */}
                <h1 className="text-[32px] font-bold text-[#0f172a] tracking-tight mb-5">
                    Account Management
                </h1>

                {/* Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Profile Card */}
                    <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-[2px_4px_4px_0px_rgba(0,0,0,0.25)] p-5">
                        <h2 className="text-base font-bold text-black mb-4">Profile</h2>
                        <div className="flex flex-col gap-3 pr-4">
                            <div className="flex items-center gap-2">
                                <label htmlFor="acct-name" className="text-sm font-bold text-black whitespace-nowrap w-20 shrink-0">Name:</label>
                                <input
                                    id="acct-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="bg-[#f9fafb] border border-[#e2e8f0] rounded px-2 py-1 text-sm text-black w-32 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label htmlFor="acct-username" className="text-sm font-bold text-black whitespace-nowrap w-20 shrink-0">Username:</label>
                                <input
                                    id="acct-username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="@username"
                                    className="bg-[#f9fafb] border border-[#e2e8f0] rounded px-2 py-1 text-sm text-black w-32 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Account Info Card */}
                    <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-[2px_4px_4px_0px_rgba(0,0,0,0.25)] p-5">
                        <h2 className="text-base font-bold text-black mb-4">Account Info</h2>
                        <div className="flex flex-col gap-3">
                            <p className="text-sm text-black">
                                <span className="font-bold">Email: </span>
                                <span className="text-[#64748b]">{email}</span>
                            </p>
                            <p className="text-sm text-black">
                                <span className="font-bold">Member Since: </span>
                                <span className="text-[#64748b]">{memberSince}</span>
                            </p>
                        </div>
                    </div>

                    {/* Notifications Card */}
                    <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-[2px_4px_4px_0px_rgba(0,0,0,0.25)] p-5">
                        <h2 className="text-base font-bold text-black mb-4">Notifications</h2>
                        <div className="flex flex-col gap-3">
                            {(
                                [
                                    ["friendRequests", "Friend Requests"],
                                    ["eventReminders", "Event Reminders"],
                                    ["calendarInvitations", "Calendar Invitations"],
                                ] as const
                            ).map(([key, label]) => (
                                <label key={key} className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        aria-pressed={notifications[key]}
                                        onClick={() => toggleNotification(key)}
                                        className={`w-6 h-6 border-2 rounded-sm shrink-0 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 ${
                                            notifications[key]
                                                ? "bg-[#2563eb] border-[#2563eb]"
                                                : "bg-[#f9fafb] border-[#e2e8f0]"
                                        }`}
                                    >
                                        {notifications[key] ? (
                                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        ) : null}
                                    </button>
                                    <span className="text-sm font-bold text-black">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Account Actions Card */}
                <div className="bg-white border border-[#e2e8f0] rounded-2xl shadow-[2px_4px_4px_0px_rgba(0,0,0,0.25)] px-6 py-3 inline-flex items-center gap-6 flex-wrap">
                    <h2 className="text-base font-bold text-black">Account Actions</h2>
                    <button
                        className="bg-[#2563eb] text-white text-sm font-semibold px-5 py-2 rounded-lg shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors"
                        onClick={() => alert("Signed out")}
                    >
                        Sign Out
                    </button>
                    <button
                        className="bg-[#ff383c] text-white text-sm font-semibold px-5 py-2 rounded-lg shadow-sm hover:bg-red-600 active:bg-red-700 transition-colors"
                        onClick={() => setShowDeleteConfirm(true)}
                    >
                        Delete Account
                    </button>
                </div>
            </main>

            {/* Delete Confirm Modal */}
            {showDeleteConfirm ? (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
                        <h3 className="text-base font-bold text-[#0f172a] mb-2">Delete Account?</h3>
                        <p className="text-sm text-[#64748b] mb-5 leading-relaxed">
                            This action cannot be undone. All your data will be permanently removed.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                className="px-4 py-2 rounded-lg border border-[#e2e8f0] text-sm font-medium text-[#0f172a] hover:bg-gray-50 transition-colors"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded-lg bg-[#ff383c] text-white text-sm font-medium hover:bg-red-600 transition-colors"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    alert("Account deleted");
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}