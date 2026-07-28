import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";

import { useAuth } from "@/hooks/useAuth";
import { watchFriendRequests } from "@/services/friendService";
import type { User } from "@/types/database";
import logo from "../public/img/TempLogo.png";

const linkClasses = ({ isActive }: { isActive: boolean }): string =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition ${
        isActive ? "bg-blue-100 text-blue-800" : "text-slate-700 hover:bg-blue-50 hover:text-blue-800"
    }`;

export default function Navbar() {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [profile, setProfile] = useState<User | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const [newRequestCount, setNewRequestCount] = useState(0);

    useEffect(() => {
        setIsMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!user) {
            setProfile(null);
            return;
        }

        let isCancelled = false;
        void import("@/services/userService")
            .then(({ getUserById }) => getUserById(user.uid))
            .then((nextProfile) => {
                if (!isCancelled) setProfile(nextProfile);
            })
            .catch((error: unknown) => {
                console.error("Unable to load navbar profile:", error);
            });

        return () => {
            isCancelled = true;
        };
    }, [user]);

    useEffect(() => {
        if (!user) {
            setNewRequestCount(0);
            return;
        }

        return watchFriendRequests(
            user.uid,
            ({ incoming }) => {
                setNewRequestCount(incoming.filter((request) => request.status === "pending").length);
            },
            () => setNewRequestCount(0)
        );
    }, [user]);

    const handleSignOut = (): void => {
        void (async () => {
            try {
                setIsSigningOut(true);
                const { signOut } = await import("@/services/authService");
                await signOut();
                await navigate("/", { replace: true });
            } catch (error) {
                console.error("Unable to sign out:", error);
            } finally {
                setIsSigningOut(false);
            }
        })();
    };

    return (
        <header className="sticky top-0 z-40 h-16 w-full border-b border-slate-200 bg-white shadow-sm">
            <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4">
                <NavLink
                    to={user ? "/calendars" : "/"}
                    className="flex min-w-0 items-center"
                    aria-label="PeerSchedule home"
                >
                    <img src={logo} alt="" className="h-11 w-auto max-w-[12rem] object-contain sm:h-12" />
                </NavLink>

                {!isLoading && user ? (
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen((current) => !current)}
                        className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 md:hidden"
                        aria-expanded={isMenuOpen}
                        aria-controls="primary-navigation"
                    >
                        Menu
                    </button>
                ) : null}

                {!isLoading && user ? (
                    <div
                        id="primary-navigation"
                        className={`${
                            isMenuOpen ? "flex" : "hidden"
                        } absolute left-0 right-0 top-full flex-col gap-2 border-b border-slate-200 bg-white p-4 shadow-lg md:static md:flex md:flex-row md:items-center md:border-0 md:p-0 md:shadow-none`}
                    >
                        <nav aria-label="Main navigation" className="flex flex-col gap-1 md:flex-row md:items-center">
                            <NavLink to="/calendars" className={linkClasses}>
                                Calendars
                            </NavLink>
                            <NavLink to="/friends" className={(state) => `${linkClasses(state)} relative`}>
                                <span>Friends</span>
                                {newRequestCount > 0 ? (
                                    <span
                                        className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-black leading-none text-white"
                                        aria-label={`${newRequestCount} new friend ${
                                            newRequestCount === 1 ? "request" : "requests"
                                        }`}
                                    >
                                        {newRequestCount > 99 ? "99+" : newRequestCount}
                                    </span>
                                ) : null}
                            </NavLink>
                            <NavLink to="/account" className={linkClasses}>
                                Account
                            </NavLink>
                            {profile?.role === "admin" ? (
                                <NavLink to="/admin" className={linkClasses}>
                                    Admin
                                </NavLink>
                            ) : null}
                        </nav>
                        <button
                            type="button"
                            onClick={handleSignOut}
                            disabled={isSigningOut}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSigningOut ? "Signing out..." : "Sign out"}
                        </button>
                    </div>
                ) : location.pathname !== "/" ? (
                    <NavLink
                        to="/"
                        className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                    >
                        Home
                    </NavLink>
                ) : (
                    <div className="h-10" aria-hidden="true" />
                )}
            </div>
        </header>
    );
}
