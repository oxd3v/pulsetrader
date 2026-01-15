// import Image from "next/image";
// import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PROTOCOL_NAME } from "@/constants/common/frontend";
import { FiActivity } from "react-icons/fi";
import NavbarRight from "./navbarRight"

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
          : `${isHome ? "bg-black" : "bg-transparent"} backdrop-blur-sm `
      }`}
    >
      <div className="w-full mx-auto px-4 py-1 lg:py-2">
        <div className="w-full flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full opacity-20 group-hover:opacity-30 blur transition-opacity duration-300" />
              {/* <Image
                src="/logo.svg"
                alt="Trading Bot Logo"
                width={36}
                height={36}
                className="relative transform group-hover:scale-110 transition-all duration-300"
              /> */}
              {/* <motion.div 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-8 h-8 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.3)] mb-6"
              >
             </motion.div> */}
            </div>
            <FiActivity
              className={`w-8 h-8 ${
                isHome ? "text-white" : "text-black dark:text-white"
              }`}
              strokeWidth={2.5}
            />
            <h1
              className={`hidden sm:block text-2xl font-black tracking-tighter ${
                isHome ? "text-white" : "text-black dark:text-white"
              }`}
            >
              PULSE<span className="text-blue-500">TRADER</span>
            </h1>
          </Link>
           <NavbarRight/>
        </div>
      </div>
    </nav>
  );
}
