import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PROTOCOL_NAME } from "@/constants/common/frontend";

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  let isHome = pathname == "/";

  useEffect(() => {
    // Only run on client-side to prevent hydration errors
    if (typeof window !== "undefined") {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 20);
      };
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, []);

  return (
    <nav
      className={`z-50 transition-all duration-300  ${
        isScrolled
          ? ` backdrop-blur-lg shadow-lg`
          : `${isHome ? "bg-gray-900" : "bg-transparent"} backdrop-blur-sm `
      }`}
    >
      <div className="w-full mx-auto px-4 py-1 lg:py-2">
        <div className="w-full flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full opacity-20 group-hover:opacity-30 blur transition-opacity duration-300" />
              <Image
                src="/logo.svg"
                alt="Trading Bot Logo"
                width={36}
                height={36}
                className="relative transform group-hover:scale-110 transition-all duration-300"
              />
            </div>
            <span className="hidden lg:block text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {PROTOCOL_NAME}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 xl:hidden" />
          </div>
        </div>
      </div>
    </nav>
  );
}
