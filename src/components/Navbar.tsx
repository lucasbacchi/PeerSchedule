import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";

import { useAuth } from "@/hooks/useAuth";
import type { User } from "@/types/database";
import logo from "../public/img/TempLogo.png";

const linkClasses = ({ isActive }: { isActive: boolean }): string =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition ${
        isActive ? "bg-white text-blue-700" : "text-blue-50 hover:bg-blue-500 hover:text-white"
    }`;

export default function Navbar() {
    const { user, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [profile, setProfile] = useState<User | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

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
        <header className="sticky top-0 z-40 w-full border-b border-blue-700 bg-blue-600 shadow-sm">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
                <NavLink
                    to={user ? "/calendars" : "/"}
                    className="flex min-w-0 items-center"
                    aria-label="PeerSchedule home"
                >
                    <img src={logo} alt="" className="h-10 w-10 rounded-lg bg-white object-contain p-1" />
                </NavLink>

                {!isLoading && user ? (
                    <button
                        type="button"
                        onClick={() => setIsMenuOpen((current) => !current)}
                        className="rounded-lg border border-blue-400 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 md:hidden"
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
                        } absolute left-0 right-0 top-full flex-col gap-2 border-b border-blue-700 bg-blue-600 p-4 shadow-lg md:static md:flex md:flex-row md:items-center md:border-0 md:p-0 md:shadow-none`}
                    >
                        <nav aria-label="Main navigation" className="flex flex-col gap-1 md:flex-row md:items-center">
                            <NavLink to="/calendars" className={linkClasses}>
                                Calendars
                            </NavLink>
                            <NavLink to="/friends" className={linkClasses}>
                                Friends
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
                            className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSigningOut ? "Signing out..." : "Sign out"}
                        </button>
                    </div>
                ) : (
                    <NavLink to="/" className="rounded-lg px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                        Home
                    </NavLink>
                )}
            </div>
        </header>
    );
}
