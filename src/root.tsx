import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import type { Route } from "./+types/root";
import Navbar from "./components/Navbar";
import favicon from "./public/img/favicon.ico";

import "./index.css";

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1" />
                <meta name="keywords" content="peer, schedule, application" />
                <meta name="description" content="PeerSchedule - Simple Scheduling Application" />
                <title>PeerSchedule</title>
                <Meta />
                <Links />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
                />
                <link rel="icon" type="image/x-icon" href={favicon} />
            </head>
            <body>
                <div id="root" className="relative flex min-h-dvh flex-col items-stretch">
                    {children}
                </div>
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

export default function Root() {
    return (
        <>
            <Navbar />
            <Outlet />
        </>
    );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    const message = "Oops!";
    let details = "An unexpected error occurred.";
    let stack: string | undefined;

    if (error instanceof Error) {
        details = error.message;
        stack = error.stack;
    }

    return (
        <main className="pt-16 p-4 container mx-auto">
            <h1 className="text-2xl font-bold">{message}</h1>
            <p className="mt-2">{details}</p>
            {stack ? (
                <pre className="w-full p-4 overflow-x-auto bg-gray-100 dark:bg-gray-900 mt-4 rounded text-gray-900 dark:text-gray-100">
                    <code>{stack}</code>
                </pre>
            ) : null}
        </main>
    );
}

// Shown while the client hydrates; keeps the UI feeling responsive on slower connections.
export function HydrateFallback() {
    return (
        <div className="hydrate-fallback">
            <p>Loading PeerSchedule…</p>
        </div>
    );
}
