import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  FiMoreVertical, 
  FiSun, 
  FiMoon, 
  FiCopy, 
  FiExternalLink, 
  FiLogOut 
} from "react-icons/fi";
import ChainSelection from "./chainSelection";
import ThemeToggle from "./ThemeToggle";
import { NAVBAR_ITEM_LIST } from "@/constants/common/frontend";

import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";

export default function NavbarRight() {
  const { setNetwork, network } = useStore(
        useShallow((state:any) => ({
          network: state.network,
          setNetwork: state.setNetwork,
        }))
      );
  const [selectedChain, setSelectedChain] = useState(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  // Mock connection state
  const isConnected = true; 
  const address = "0x71C...3a45";

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex items-center gap-3 md:gap-4">
      {/* 1. Chain Selection */}
      <ChainSelection selectChain={network} setSelectChain={setNetwork} />

      {/* 2. Theme Toggle */}
      <ThemeToggle/>

      {/* 3. Connected User Address (Visible on larger screens) */}
      {isConnected && (
        <div className="hidden sm:flex items-center h-10 px-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          <span className="text-sm font-mono font-medium text-gray-600 dark:text-gray-300">
            {address}
          </span>
        </div>
      )}

      {/* 4. Three-dot Menu Dropdown */}
      <div className="relative" ref={menuRef}>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
            isMenuOpen 
              ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" 
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
          }`}
        >
          <FiMoreVertical className="w-5 h-5" />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
            
            {/* Dynamic Navbar Items */}
            <div className="px-2 pb-2 mb-2 border-b border-gray-100 dark:border-white/5">
              <p className="px-3 py-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Navigation
              </p>
              {NAVBAR_ITEM_LIST.map((item) => {
                const shouldShow = item.type === 'public' || (item.type === 'private' && isConnected);
                if (!shouldShow) return null;

                return (
                  <Link 
                    key={item.href} 
                    href={item.href} 
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                  >
                    {item.name}
                    {item.type === 'private' && (
                      <span className="ml-auto text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-1.5 py-0.5 rounded">Pro</span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Wallet Actions */}
            <div className="px-2">
              <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                Copy Address <FiCopy className="w-4 h-4 opacity-50" />
              </button>
              <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                Explorer <FiExternalLink className="w-4 h-4 opacity-50" />
              </button>
              
              {isConnected && (
                <>
                  <div className="my-2 border-t border-gray-100 dark:border-white/5" />
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors font-medium">
                    <FiLogOut className="w-4 h-4" /> Disconnect
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}