"use client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { fetchCodexFilterTokens, fetchCodexCandleBar } from "@/lib/oracle/codex";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiX, FiActivity, FiAlertCircle } from "react-icons/fi";
import { chains } from "@/constants/common/chain";

// internal components
import ChartBox from "./ChartBox";
import TradeBox from "@/components/tradeBox/spotTradeBox";
import SelectTokenModal from "@/components/spot/defined/selectToken";

interface DefinedSpotMainProps {
  tokenAddress: string;
}

// Separate static metadata from dynamic market data to optimize rendering
interface StaticTokenInfo {
  address: string;
  pairAddress: string;
  quoteToken: any;
  createdAt: number;
  chainId: number;
  name: string;
  symbol: string;
  decimals: number;
  imageUrl: string;
}

interface DynamicTokenData {
  priceUsd: string;
  liquidity: string;
  marketCap: string;
  volume24: string;
  change24: string;
  // Add other raw fields needed by ChartBox/TradeBox
  [key: string]: any; 
}

export default function DefinedSpotMain({ tokenAddress }: DefinedSpotMainProps) {
  // --- UI State ---
  const [showTokenSelectionModal, setShowTokenSelectionModal] = useState(false);
  const [isTradeBoxOpen, setIsTradeBoxOpen] = useState(false);
  
  // --- Data State ---
  const [selectedAddress, setSelectedAddress] = useState(tokenAddress);
  const [staticInfo, setStaticInfo] = useState<StaticTokenInfo | null>(null);
  const [dynamicData, setDynamicData] = useState<DynamicTokenData | null>(null);
  
  // --- Status State ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Refs ---
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 1. Initial Data Fetch (Metadata + First Price)
  const fetchTokenData = useCallback(async (addr: string) => {
    if (!addr?.trim()) return;

    // Abort previous pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      // Fetch data
      const response = await fetchCodexFilterTokens({
        variables: {
          phrase: addr,
          statsType: "FILTERED",
          limit: 10, // Reduced limit for faster initial load
          filters: { change24: {} },
        },
      });
      
      console.log(response);

      if (!isMountedRef.current) return;

      // Filter for valid chains
      const validToken = response?.find((t: any) => 
        Object.values(chains).includes(t.token.networkId)
      );

      if (!validToken) {
        setError("Token not found on supported chains");
        setStaticInfo(null);
        setDynamicData(null);
        return;
      }
      // let bars = await fetchCodexCandleBar({
      //   pairAddress:validToken.pair.address,
      //   quoteToken: validToken.quoteToken,
      //   chainId: validToken.token.networkId,
      //   resolution:"1",
      //   limit:330,
      //   createdAt: validToken.createdAt
      // })
      // console.log(bars)

      // Set Static Info (Stable)
      setStaticInfo({
        address: validToken.token.address,
        pairAddress: validToken.pair.address,
        quoteToken: validToken.quoteToken,
        createdAt: validToken.createdAt,
        chainId: validToken.token.networkId,
        name: validToken.token.name,
        symbol: validToken.token.symbol,
        decimals: validToken.token.decimals,
        imageUrl: validToken.token.imageLargeUrl || "/tokenLogo.png",
      });

      // Set Dynamic Data (Changeable)
      setDynamicData(validToken);

    } catch (err: any) {
      console.log(err)
      if (err.name !== 'AbortError' && isMountedRef.current) {
        console.error("Token fetch error:", err);
        setError("Failed to fetch token data");
      }
    } finally {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // Trigger fetch when selected address changes
  useEffect(() => {
    fetchTokenData(selectedAddress);
  }, [selectedAddress, fetchTokenData]);

  // 2. Polling for Price Updates (Only runs when we have valid static info)
  useEffect(() => {
    if (!staticInfo) return;

    const pollPrice = async () => {
      try {
        const res = await fetchCodexFilterTokens({
          variables: {
            tokens: [`${staticInfo.address}:${staticInfo.chainId}`],
            statsType: "FILTERED",
            limit: 1,
            filters: { change24: {} },
          },
        });

        if (isMountedRef.current && res?.[0]) {
          // Only update dynamic data, keeping static info stable
          setDynamicData(res[0]);
        }
      } catch (e) {
        console.error("Price polling error:", e);
      }
    };

    const intervalId = setInterval(pollPrice, 5000);
    return () => clearInterval(intervalId);
  }, [staticInfo]); // Only re-create interval if static info (identity) changes

  // --- Handlers ---

  const handleTokenSelect = useCallback(() => {
    setShowTokenSelectionModal(true);
  }, []);

  const handleTokenSelected = useCallback((token: string) => {
    if (token === selectedAddress) return;
    setSelectedAddress(token);
    // Reset state immediately to prevent stale data flash
    setStaticInfo(null);
    setDynamicData(null);
    setShowTokenSelectionModal(false);
    setIsTradeBoxOpen(false);
  }, [selectedAddress]);

  // --- Render Helpers ---

  // Combine static and dynamic data for children props
  // We use useMemo to create a stable object reference for children props
  const combinedTokenInfo = useMemo(() => {
    if (!staticInfo || !dynamicData) return null;
    return {
      ...staticInfo,
      priceUsd: dynamicData.priceUSD, // Inject current price into the object expected by children
    };
  }, [staticInfo, dynamicData?.priceUSD]); // Only updates when price or identity changes

  const renderTradeBox = useMemo(() => {
    if (!combinedTokenInfo) return null;
    return (
      <TradeBox
        chainId={combinedTokenInfo.chainId}
        tokenInfo={combinedTokenInfo}
        isConnected={true}
      />
    );
  }, [combinedTokenInfo]);

  // Loading View
  if (loading && !staticInfo) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-900 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-500 font-medium animate-pulse">Loading market data...</p>
      </div>
    );
  }

  // Error View
  if (error && !staticInfo) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center max-w-sm p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-red-100 dark:border-red-900/30">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Data Unavailable</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={handleTokenSelect}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-all"
          >
            Select Different Token
          </button>
        </div>
      </div>
    );
  }

  // Empty State
  if (!staticInfo || !combinedTokenInfo) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <button
          onClick={handleTokenSelect}
          className="flex flex-col items-center gap-4 group"
        >
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 rounded-full flex items-center justify-center transition-colors">
            <FiPlus className="w-10 h-10 text-gray-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <span className="text-gray-500 group-hover:text-blue-500 font-medium transition-colors">
            Select a token to begin
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div className="w-full h-full overflow-hidden flex flex-col">
        {/* Main Layout */}
        <div className="flex-1 flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-900 gap-2 p-2 lg:p-3 overflow-hidden">
          
          {/* Left Column: Chart & Info */}
          <div className={`w-full lg:flex-1 h-full flex flex-col gap-2 transition-all duration-300 ${isTradeBoxOpen ? 'hidden lg:flex' : 'flex'}`}>
            <div className="flex-none h-[60%] lg:h-[65%]">
              <ChartBox
                tokenInfo={combinedTokenInfo}
                tokenState={dynamicData}
                handleTokenSelect={handleTokenSelect}
              />
            </div>
            
            {/* Order/Transaction List Placeholder */}
            <div className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col items-center justify-center text-gray-400">
               <FiActivity className="w-6 h-6 mb-2 opacity-50"/>
               <span className="text-sm">Recent Trades & Orders</span>
            </div>
          </div>

          {/* Right Column: Trade Box (Desktop) */}
          <div className="hidden lg:block lg:w-[400px] xl:w-[450px] h-full flex-none">
            {renderTradeBox}
          </div>
        </div>
      </div>

      {/* Mobile Trade Drawer */}
      <AnimatePresence>
        {isTradeBoxOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTradeBoxOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            />
            {/* Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 h-[85vh] bg-white dark:bg-gray-900 z-50 lg:hidden rounded-t-3xl flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img src={staticInfo.imageUrl} className="w-8 h-8 rounded-full" alt="Token" />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Trade {staticInfo.symbol}</h3>
                    <p className="text-xs text-gray-500">${Number(dynamicData?.priceUSD).toFixed(6)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsTradeBoxOpen(false)}
                  className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <FiX className="w-5 h-5 dark:text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {renderTradeBox}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile FAB (Trade Button) */}
      <AnimatePresence>
        {!isTradeBoxOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsTradeBoxOpen(true)}
            className="fixed bottom-6 right-6 lg:hidden z-30 h-14 px-6 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center gap-2 font-bold"
          >
            <FiPlus className="w-5 h-5" />
            Trade
          </motion.button>
        )}
      </AnimatePresence>

      {/* Token Selection Modal */}
      {showTokenSelectionModal && (
        <SelectTokenModal
          selectedToken={selectedAddress}
          setSelectedToken={handleTokenSelected}
          addToken={() => console.log("Add token unimplemented")}
          isOpen={showTokenSelectionModal}
          onClose={() => setShowTokenSelectionModal(false)}
        />
      )}
    </div>
  );
}