import { NavLink } from "react-router";

import logo from "@/public/img/TempLogo.png";
import svgPaths from "@/imports/svg-l5xzino1q2";

function Logo() {
  return <img src={logo} alt="PeerSchedule" className="h-10 w-auto" />;
}

function Navbar() {
  const getLinkClasses = ({ isActive }: { isActive: boolean }): string => {
    const baseClasses = "rounded-md px-3 py-2 font-medium transition-colors";
    const activeClasses = "bg-[#2563eb] text-white";
    const inactiveClasses = "text-black hover:text-[#2563eb]";

    return `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
  };

  return (
    <header className="w-full bg-white border-b-2 border-[#e2e8f0] h-16 flex items-center px-12">
      <NavLink to="/home" className="flex items-center gap-3" aria-label="PeerSchedule home">
        <Logo />
      </NavLink>

      <nav className="ml-auto flex items-center gap-8">
        <NavLink to="/home" className={getLinkClasses}>
          Home
        </NavLink>
        <NavLink to="/friends" className={getLinkClasses}>
          Friends
        </NavLink>
        <NavLink to="/account" className={getLinkClasses}>
          Account
        </NavLink>
        <NavLink to="/calendars" className={getLinkClasses}>
          Calendars
        </NavLink>
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 text-[#1d1b20] hover:text-[#2563eb] transition-colors cursor-pointer group"
          aria-label="Notifications"
        >
          <svg viewBox="0 0 21.3333 26.6667" className="w-5 h-5 fill-current transition-colors" aria-hidden="true">
            <path d={svgPaths.p199db900} />
          </svg>
        </button>
        <NavLink
          to="/calendars"
          className="bg-[#2563eb] text-white font-['Inter',sans-serif] font-medium text-sm px-4 py-2 rounded-lg shadow-sm hover:bg-[#1d4ed8] transition-colors cursor-pointer whitespace-nowrap"
        >
          Create Calendar
        </NavLink>
      </nav>
    </header>
  );
}

export default Navbar;