// navbar.tsx
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PROTOCOL_NAME } from "@/constants/common/frontend";
import { FiActivity, FiX } from "react-icons/fi";
import NavbarRight from "./navbarRightPanel";

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showBetaWarning, setShowBetaWarning] = useState(true);
  const [showComingSoon, setShowComingSoon] = useState(true);
  const isHome = pathname === "/";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 20);
      };
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, []);

  return (
    <>
      <nav
        className={`z-50 transition-all duration-300 ${
          isScrolled
            ? "backdrop-blur-lg shadow-lg"
            : `${isHome ? "bg-black" : "bg-transparent"} backdrop-blur-sm`
        }`}
      >
        <div className="w-full mx-auto px-4 py-1 lg:py-2">
          <div className="w-full flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full opacity-20 group-hover:opacity-30 blur transition-opacity duration-300" />
                <FiActivity
                  className={`w-8 h-8 ${
                    isHome ? "text-white" : "text-black dark:text-white"
                  }`}
                  strokeWidth={2.5}
                />
              </div>
              <h1
                className={`hidden sm:block text-2xl font-black tracking-tighter ${
                  isHome ? "text-white" : "text-black dark:text-white"
                }`}
              >
                PULSE<span className="text-blue-500">TRADER</span>
              </h1>
              {/* BETA tag */}
              <span className="ml-2 px-2 py-1 text-xs font-bold uppercase bg-yellow-400 text-yellow-900 rounded-full shadow-sm">
                Beta
              </span>
            </Link>
            <NavbarRight />
          </div>
        </div>
      </nav>

      {/* Dismissible Notification Banners */}
      <div className="w-full space-y-2 px-4 py-2 bg-transparent">
        {showBetaWarning && (
          <div className="relative flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200">
            <span className="text-sm font-medium pr-8">
              ⚠️ <strong>Beta Version:</strong> Trade with caution. Do not deposit 100% of your assets now. Wait for the final version. Good for testing.
            </span>
            <button
              onClick={() => setShowBetaWarning(false)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded-full transition-colors"
              aria-label="Close"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}

        {showComingSoon && (
          <div className="relative flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
            <span className="text-sm font-medium pr-8">
              🚀 <strong>Coming Soon:</strong> Futures trading, Telegram bot, and AI trading agent.
            </span>
            <button
              onClick={() => setShowComingSoon(false)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full transition-colors"
              aria-label="Close"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}