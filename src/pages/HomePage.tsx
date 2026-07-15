export default function HomePage() {
    return (
        <div className="space-y-6 lg:space-y-8">
            <title>Home | PeerSchedule</title>

            <div className="w-full bg-blue-500 py-6">
                <img
                    src="/src/public/img/TempLogo.png"
                    alt="PeerSchedule Logo"
                    className="mx-auto h-20"
                />
            </div>

            <div className="mx-auto max-w-4xl px-4">
                <h2 className="text-3xl font-bold">Welcome to PeerSchedule</h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                    PeerSchedule is a Calendar Sharing application for managing Group Meetings and Schedules. You can create a group, add members, and share your schedules with them. You can also view the schedules of other members in the group and find a common time for meetings.
                </p>
            </div>
            <div className="flex flex-col items-center">
                <p>
                    Sign in With Google to get started.
                </p>
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}
