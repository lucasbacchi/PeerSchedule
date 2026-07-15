export default function ChooseCalendarPage() {
    return (
        <main className="mx-auto w-full max-w-6xl p-6">
            <title>Calendars | PeerSchedule</title>

            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">
                    Your Calendars
                </h1>

                <button
                    type="button"
                    className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                >
                    Create Calendar
                </button>
            </div>

            <p className="mt-6 text-gray-600 dark:text-gray-400">
                You do not have any calendars yet.
            </p>
        </main>
    );
}