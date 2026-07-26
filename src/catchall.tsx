import { Link } from "react-router";

export default function CatchAll() {
    return (
        <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-slate-50 px-4 py-12">
            <title>Page Not Found | PeerSchedule</title>
            <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <p className="text-sm font-bold uppercase tracking-wide text-blue-600">404 error</p>
                <h1 className="mt-2 text-3xl font-black text-slate-950">Page not found</h1>
                <p className="mt-3 text-slate-600">The page may have moved, or the address may be incorrect.</p>
                <Link
                    to="/calendars"
                    className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
                >
                    Return to calendars
                </Link>
            </section>
        </main>
    );
}
