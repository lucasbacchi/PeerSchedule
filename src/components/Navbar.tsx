import { NavLink } from "react-router";

import logo from "../public/img/TempLogo.png";

export default function Navbar() {
    const getLinkClasses = ({
        isActive,
    }: {
        isActive: boolean;
    }): string => {
        const baseClasses =
            "rounded-md px-3 py-2 font-medium transition-colors";

        const activeClasses =
            "bg-blue-700 text-white";

        const inactiveClasses =
            "text-white hover:bg-blue-700";

        return `${baseClasses} ${
            isActive ? activeClasses : inactiveClasses
        }`;
    };

    return (
        <header className="sticky top-0 z-40 w-full bg-blue-600 shadow-md">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
                <NavLink
                    to="/"
                    className="flex items-center gap-3"
                    aria-label="PeerSchedule home"
                >
                    <img
                        src={logo}
                        alt=""
                        className="h-10 w-auto"
                    />

                    <span className="text-xl font-bold text-white">
                        PeerSchedule
                    </span>
                </NavLink>

                <nav
                    aria-label="Main navigation"
                    className="flex flex-wrap items-center gap-1"
                >
                    <NavLink
                        to="/"
                        end
                        className={getLinkClasses}
                    >
                        Home
                    </NavLink>

                    <NavLink
                        to="/calendars"
                        className={getLinkClasses}
                    >
                        Calendars
                    </NavLink>

                    <NavLink
                        to="/friends"
                        className={getLinkClasses}
                    >
                        Friends
                    </NavLink>

                    <NavLink
                        to="/account"
                        className={getLinkClasses}
                    >
                        Account
                    </NavLink>
                </nav>
            </div>
        </header>
    );
}