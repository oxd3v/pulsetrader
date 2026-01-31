"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiBarChart,
  FiPieChart,
  FiShield,
  FiActivity,
  FiCreditCard,
  FiPlus,
  FiGlobe,
  FiCopy,
} from "react-icons/fi";
import { RiArrowDropDownLine, RiRefreshLine } from "react-icons/ri";
import { IoWallet } from "react-icons/io5";

import { chains } from "@/constants/common/chain";
import toast from "react-hot-toast";

// Types
import { ORDER_TYPE } from "@/type/order";
import { ACTIVITY_TYPE, WalletConfig } from "@/type/common";

import { getWalletBalance } from "@/lib/blockchain/balance";
import { fetchCodexWalletBalances } from "@/lib/oracle/codex";

// Components
import WalletOverview from "./walletOverview";
import MyTokenPortfolio from "./UserTokensList";
import CreationModel from "@/components/walletManager/modal/createWalletModel";
import { safeParseUnits } from "@/utility/handy";
import { PRECISION_DECIMALS } from "@/constants/common/utils";

// Props
interface PortfolioMainProps {
  user: any;
  chainId: number;
  userOrders: ORDER_TYPE[];
  userWallets: WalletConfig[];
  userHistories: ACTIVITY_TYPE[];
  userConnectedWallet: any;
}

export default function PortfolioMain({
  user,
  chainId,
  userOrders,
  userWallets,
  userHistories,
  userConnectedWallet,
}: PortfolioMainProps) {
  // --- State ---
  const [activeTab, setActiveTab] = useState<
    "overview" | "holdings" | "activity" | "analytics" | "settings"
  >("overview");
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const [isCreationModelOpen, setIsCreationModelOpen] = useState(false);
  const [balanceData, setBalanceData] = useState<{
    nativeBalance: string;
    holdingTokens: any[];
    totalSpotUsd: string;
    totalPerpUsd: string;
  }>({
    nativeBalance: "0",
    holdingTokens: [],
    totalSpotUsd: "0",
    totalPerpUsd: "0",
  });

  // Wallet State
  const [selectedWallet, setSelectedWallet] = useState<WalletConfig | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const isInitialMount = useRef(true);
  const prevSelectedWalletRef = useRef<string | null>(null);
  const prevChainIdRef = useRef<number | null>(null);

  // --- Memoized Values ---

  // 1. Filter Wallets based on Active Network Type
  const filteredWallets = useMemo(() => {
    return userWallets.filter((w) =>
      chainId === chains.Solana ? w.network === "SVM" : w.network === "EVM",
    );
  }, [userWallets, chainId]);

  // --- Handlers ---

  const handleSelectedWallet = useCallback(
    async (walletAddress: string) => {
      if (!walletAddress) return;

      setIsLoading(true);
      try {
        // 1. Fetch data in parallel
        const [walletInfo, nativeBalanceRaw] = await Promise.all([
          fetchCodexWalletBalances({ walletAddress, chainId, limit: 100 }),
          getWalletBalance({ walletAddress, chainId }),
        ]);
        //console.log(walletInfo, nativeBalanceRaw);

        if (walletInfo && Array.isArray(walletInfo)) {
          // 2. High-precision summation using BigInt
          const totalSpotUsdBigInt = walletInfo.reduce(
            (acc: bigint, item: any) => {
              const balance = BigInt(item.balance || 0);
              const priceUsdScaled = safeParseUnits(
                item.tokenPriceUsd || "0",
                PRECISION_DECIMALS,
              );
              const decimals = item.token?.decimals || 18;

              // Math: (Balance * PriceScaled) / 10^Decimals
              const usdValueScaled =
                (balance * priceUsdScaled) / BigInt(10 ** decimals);

              return acc + usdValueScaled;
            },
            BigInt(0),
          );

          setBalanceData({
            nativeBalance: nativeBalanceRaw.toString(),
            holdingTokens:
              walletInfo.filter((w) => w.tokenId !== `native:${chainId}`) || [],
            totalSpotUsd: totalSpotUsdBigInt.toString(),
            totalPerpUsd: "0",
          });
        }
      } catch (error) {
        console.error("Portfolio sync error:", error);
        toast.error("Failed to fetch wallet data");
      } finally {
        setIsLoading(false);
      }
    },
    [chainId], // Removed selectedWallet?.address dependency
  );

  const handleWalletChange = useCallback((wallet: WalletConfig) => {
    setSelectedWallet(wallet);
    setIsWalletDropdownOpen(false);
    // Reset balance data immediately
    setBalanceData({
      nativeBalance: "0",
      holdingTokens: [],
      totalSpotUsd: "0",
      totalPerpUsd: "0",
    });
  }, []);

  // Copy Handler
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied!");
  };

  // --- Effects ---

  // Auto-select wallet when network changes or wallets load
  useEffect(() => {
    if (filteredWallets.length > 0) {
      // Check if selected wallet still exists in filtered wallets
      const walletStillValid =
        selectedWallet &&
        filteredWallets.some((w) => w._id === selectedWallet._id);

      if (walletStillValid) {
        // Wallet is still valid, keep it selected
        return;
      } else {
        // Select the first available wallet
        setSelectedWallet(filteredWallets[0]);
      }
    } else {
      setSelectedWallet(null);
    }
  }, [filteredWallets]); // Removed chainId dependency

  // Fetch wallet data when selected wallet or chainId changes
  useEffect(() => {
    setBalanceData({
      nativeBalance: "0",
      holdingTokens: [],
      totalSpotUsd: "0",
      totalPerpUsd: "0",
    });
    // Skip initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Check if we actually need to fetch new data
    const walletChanged =
      selectedWallet?.address !== prevSelectedWalletRef.current;
    const chainChanged = chainId !== prevChainIdRef.current;

    if (!walletChanged && !chainChanged) {
      return;
    }

    // Update refs
    prevSelectedWalletRef.current = selectedWallet?.address || null;
    prevChainIdRef.current = chainId;

    if (selectedWallet?.address) {
      handleSelectedWallet(selectedWallet.address);
    }
  }, [selectedWallet?.address, chainId, handleSelectedWallet]);

  const tabs = [
    { id: "overview", label: "Overview", icon: FiPieChart },
    { id: "holdings", label: "Holdings", icon: FiCreditCard },
    { id: "activity", label: "Activity", icon: FiActivity },
    { id: "analytics", label: "Analytics", icon: FiBarChart },
    { id: "settings", label: "Setting", icon: FiShield },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#08090a] text-white p-4 lg:p-8 font-sans selection:bg-blue-500/30">
      {/* Header Section */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              Live Portfolio
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r dark:from-white from-black via-gray-200 to-gray-500 bg-clip-text text-transparent">
            {selectedWallet
              ? `Wallet ${selectedWallet._id.slice(0, 4)}`
              : "No Wallet Selected"}
          </h1>

          {selectedWallet && (
            <div
              onClick={() => handleCopy(selectedWallet.address)}
              className="group flex items-center gap-2 mt-2 w-fit cursor-pointer py-1 pr-3 rounded-lg hover:bg-white/5 transition-colors"
            >
              <p className="text-gray-600 dark:text-gray-400 font-mono text-sm opacity-60 group-hover:opacity-100 transition-opacity">
                {selectedWallet.address}
              </p>
              <FiCopy className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
            </div>
          )}

          <div className="relative mb-6 z-20">
            <button
              onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
              className="flex gap-4 justify-between items-center text-gray-300 hover:text-white transition-colors"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-500">
                Selected Wallet
              </span>
              <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                <span className="text-xs font-mono">
                  {filteredWallets.length} Available
                </span>
                <RiArrowDropDownLine
                  size={20}
                  className={`transform transition-transform ${isWalletDropdownOpen ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isWalletDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-8 left-0 w-full bg-[#1a1d26] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[200px] overflow-y-auto custom-scrollbar"
                >
                  {filteredWallets.map((wallet) => (
                    <button
                      key={wallet._id}
                      onClick={() => handleWalletChange(wallet)}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 border-b border-white/5 last:border-0 flex items-center gap-3 ${selectedWallet?._id === wallet._id ? "bg-blue-500/10 text-blue-400" : "text-gray-300"}`}
                    >
                      <IoWallet />
                      <div className="flex-1 truncate">
                        <div className="font-bold">
                          Wallet {wallet._id.slice(0, 4)}
                        </div>
                        <div className="text-[10px] font-mono opacity-60 truncate">
                          {wallet.address}
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsCreationModelOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
          >
            <FiPlus className="w-5 h-5" />
            Add wallets
          </button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            disabled={!selectedWallet?.address || isLoading}
            onClick={() =>
              selectedWallet?.address &&
              handleSelectedWallet(selectedWallet.address)
            }
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 p-4 dark:bg-gray-700 bg-gray-300 text-white dark:text-black rounded-xl font-bold text-sm hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RiRefreshLine
              className={`text-black dark:text-white ${isLoading ? "animate-spin" : ""}`}
            />
          </motion.button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <nav className="lg:col-span-3 space-y-4">
          <div className="dark:bg-[#12141a] bg-white border border-white/5 p-2 rounded-[24px] flex lg:flex-col gap-1 shadow-xl sticky top-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all flex-1 lg:flex-none overflow-hidden ${
                    isActive
                      ? "text-white"
                      : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-blue-600 rounded-xl"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.6,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-3">
                    <Icon
                      className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-500"}`}
                    />
                    <span className="hidden md:block">{tab.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content Area */}
        <section className="lg:col-span-9 min-h-[600px]">
          <AnimatePresence mode="wait">
            {selectedWallet ? (
              <motion.div
                key={`${activeTab}-${selectedWallet._id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "overview" && (
                  <WalletOverview
                    selectedWallet={selectedWallet}
                    balanceData={balanceData}
                    chainId={chainId}
                    user={user}
                  />
                )}
                {activeTab === "holdings" && (
                  <MyTokenPortfolio
                    holdingTokens={balanceData.holdingTokens}
                    walletAddress={selectedWallet.address}
                    chainId={chainId}
                    user={user}
                  />
                )}
                {/* {activeTab === 'analytics' && <RenderWalletAnalytics wallet={selectedWallet} />} */}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-96 text-gray-500 border border-dashed border-gray-800 rounded-3xl bg-white/5">
                <FiGlobe className="w-12 h-12 mb-4 opacity-50" />
                <p>No wallets found.</p>
                <button
                  className="mt-4 text-blue-500 hover:text-blue-400 text-sm font-bold"
                  onClick={() => setIsCreationModelOpen(true)}
                >
                  Create one now
                </button>
              </div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Modals */}
      {isCreationModelOpen && (
        <CreationModel
          isOpen={isCreationModelOpen}
          onClose={() => setIsCreationModelOpen(false)}
        />
      )}
    </div>
  );
}
