import { useState } from "react";
import { useNavigate } from "react-router";
import { signInWithGoogle } from "@/services/authService";
import imgLogo from "@/public/img/TempLogo.png";

function Logo({ className = "" }: { className?: string }) {
  return (
    <img
      src={imgLogo}
      alt="PeerSchedule"
      className={`h-12 w-auto object-contain object-left ${className}`}
    />
  );
}



interface LandingNavbarProps {
  isSigningIn: boolean;
  onSignIn: () => void;
}

function LandingNavbar({ isSigningIn, onSignIn }: LandingNavbarProps) {
  return (
    <header className="w-full bg-white border-b-2 border-[#e2e8f0] h-16 flex items-center px-12">
      <Logo />
      <div className="ml-auto flex items-center gap-8">
        <span className="font-['Inter',sans-serif] font-medium text-[#0f172a] text-sm whitespace-nowrap">
          Please Sign in with Google to Get Started
        </span>
        <button
          type="button"
          onClick={onSignIn}
          disabled={isSigningIn}
          className="bg-[#2563eb] text-white font-['Inter',sans-serif] font-medium text-sm px-4 py-2 rounded-lg shadow-sm hover:bg-[#1d4ed8] transition-colors cursor-pointer whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSigningIn ? "Signing In..." : "Sign In"}
        </button>
      </div>
    </header>
  );
}

interface HeroProps {
  isSigningIn: boolean;
  onSignIn: () => void;
  message: string | null;
}

function Hero({ isSigningIn, onSignIn, message }: HeroProps) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="flex flex-col items-center gap-6 max-w-2xl w-full text-center">
        <div className="flex flex-col gap-4 w-full">
          <h1 className="font-['Inter',sans-serif] font-bold text-[#0f172a] text-4xl tracking-tight leading-tight">
            Welcome To PeerSchedule
          </h1>
          <p className="font-['Inter',sans-serif] font-normal text-[#64748b] text-base leading-relaxed">
            PeerSchedule is a Calendar Sharing application for managing Group Meetings and Schedules. You can create a group, add members, and share your schedules with them. You can also view the schedules of other members in the group and find a common time for meetings.
          </p>
        </div>
        <p className="font-['Inter',sans-serif] font-normal text-[#0f172a] text-sm">
          Sign in with Google to Get Started
        </p>
        <button
          type="button"
          onClick={onSignIn}
          disabled={isSigningIn}
          className="bg-[#2563eb] text-white font-['Inter',sans-serif] font-medium text-base px-6 py-3 rounded-lg shadow-sm hover:bg-[#1d4ed8] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSigningIn ? "Signing In..." : "Sign In With Google"}
        </button>
        {message !== null ? (
          <p className="text-center text-red-600">{message}</p>
        ) : null}
      </div>
    </main>
  );
}



export default function LandingPage() {
  const navigate = useNavigate();

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const performGoogleSignIn = async (): Promise<void> => {
    try {
      setIsSigningIn(true);
      setMessage(null);

      await signInWithGoogle();

      await navigate("/calendars", {
        replace: true,
      });
    } catch (error: unknown) {
      console.error("Google sign-in failed:", error);

      if (error instanceof Error) {
        setMessage(`Sign-in failed: ${error.message}`);
      } else {
        setMessage("Google sign-in failed. Please try again.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = (): void => {
    void performGoogleSignIn();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <title>Landing | PeerSchedule</title>
      <LandingNavbar isSigningIn={isSigningIn} onSignIn={handleGoogleSignIn} />
      <Hero isSigningIn={isSigningIn} onSignIn={handleGoogleSignIn} message={message} />
    </div>
  );
}
