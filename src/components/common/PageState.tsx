interface PageStateProps {
    title: string;
    message?: string;
    tone?: "neutral" | "error";
}

export default function PageState({ title, message, tone = "neutral" }: PageStateProps) {
    const toneClasses =
        tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-white text-slate-700";

    return (
        <main className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center justify-center px-4 py-12">
            <section className={`w-full max-w-xl rounded-2xl border p-8 text-center shadow-sm ${toneClasses}`}>
                <h1 className="text-2xl font-bold">{title}</h1>
                {message ? <p className="mt-3">{message}</p> : null}
            </section>
        </main>
    );
}
