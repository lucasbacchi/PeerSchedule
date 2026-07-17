import type { ReactNode } from "react";
import logo from "@/public/img/TempLogo.png";
import svgPaths from "@/imports/LandingPage/svg-4b7h86uepq";

function Logo({ className = "" }: { className?: string }) {
  return <img src={logo} alt="PeerSchedule" className={`h-12 w-auto object-contain object-left ${className}`} />;
}

function SocialIcon({ children }: { children: ReactNode }) {
  return (
    <button className="flex items-center justify-center w-8 h-8 rounded text-[#828282] hover:text-[#0f172a] transition-colors cursor-pointer">
      {children}
    </button>
  );
}

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t-2 border-[#e2e8f0]">
      <div className="flex items-start px-12 py-8 gap-12 flex-wrap">
        <div className="flex flex-col gap-5 min-w-[180px]">
          <Logo />
          <div className="flex gap-1">
            <SocialIcon>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d={svgPaths.p132b8500} />
              </svg>
            </SocialIcon>
            <SocialIcon>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d={svgPaths.p3a800a00} />
              </svg>
            </SocialIcon>
            <SocialIcon>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d={svgPaths.p3b619c00} />
              </svg>
            </SocialIcon>
            <SocialIcon>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                <path d={svgPaths.p1f140b00} />
              </svg>
            </SocialIcon>
          </div>
        </div>

        <div className="flex-1 flex items-center min-w-[220px] max-w-[340px]">
          <p className="font-['Inter',sans-serif] font-medium text-[#0f172a] text-sm leading-relaxed">
            Disclaimer this is not a real website, all contact info and social media buttons are fake, and just for show.
          </p>
        </div>

        <div className="flex flex-col gap-4 min-w-[130px]">
          <p className="font-['Inter',sans-serif] font-medium text-black text-sm">Contact</p>
          <p className="font-['Inter',sans-serif] font-medium text-[#64748b] text-sm">random@cal.com</p>
          <p className="font-['Inter',sans-serif] font-medium text-[#64748b] text-sm">(978)-123-1234</p>
        </div>

        <div className="flex flex-col gap-4 min-w-[110px]">
          <p className="font-['Inter',sans-serif] font-medium text-[#0f172a] text-sm">Pages</p>
          <p className="font-['Inter',sans-serif] font-medium text-[#64748b] text-sm cursor-pointer hover:text-[#0f172a] transition-colors">Account</p>
          <p className="font-['Inter',sans-serif] font-medium text-[#64748b] text-sm cursor-pointer hover:text-[#0f172a] transition-colors">Friends</p>
          <p className="font-['Inter',sans-serif] font-medium text-[#64748b] text-sm cursor-pointer hover:text-[#0f172a] transition-colors">Page</p>
        </div>
      </div>
    </footer>
  );
}
