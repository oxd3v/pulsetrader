"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiX } from "react-icons/fi";
import { useShallow } from "zustand/shallow";

import ChartBox from "./ChartBox";
import OrderBox from "@/components/order/dashboard/OrderList";
import TradeBox from "@/components/tradeBox/perpTradeBox";
import { useStore } from "@/store/useStore";
import { useAsterMarketStats } from "@/hooks/useAsterhooks/useAsterMarketStats";

interface DefinedPerpMainProps {
  tokenSymbol: string;
}

const normalizeMarketSymbol = (symbol: string): string => {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return "";
  if (normalized.endsWith("USDT") || normalized.endsWith("USDC") || normalized.endsWith("BUSD")) {
    return normalized;
  }
  return `${normalized}USDT`;
};

const getBaseSymbol = (symbol: string): string => {
  return symbol.replace(/(USDT|USDC|BUSD)$/i, "");
};

export default function DefinedPerpMain({ tokenSymbol }: DefinedPerpMainProps) {
  const { user, isConnected, network, userOrders, userWallets } = useStore(
    useShallow((state: any) => ({
      user: state.user,
      network: state.network,
      userOrders: state.userOrders,
      userWallets: state.userWallets,
      isConnected: state.isConnected,
    }))
  );

  const [selectedSymbol, setSelectedSymbol] = useState(() => normalizeMarketSymbol(tokenSymbol));
  const [isTradeBoxOpen, setIsTradeBoxOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(75);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isDraggingH, setIsDraggingH] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const { stats } = useAsterMarketStats(selectedSymbol);

  useEffect(() => {
    setSelectedSymbol(normalizeMarketSymbol(tokenSymbol));
  }, [tokenSymbol]);

  useEffect(() => {
    const handleViewport = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    handleViewport();
    window.addEventListener("resize", handleViewport);
    return () => window.removeEventListener("resize", handleViewport);
  }, []);

  const handleSymbolChange = useCallback((symbol: string) => {
    setSelectedSymbol(normalizeMarketSymbol(symbol));
  }, []);

  const onMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDraggingH || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;

      const relativeX = event.clientX - rect.left;
      const newWidth = (relativeX / rect.width) * 100;

      if (newWidth > 45 && newWidth < 85) {
        setLeftWidth(newWidth);
      }
    },
    [isDraggingH]
  );

  const onMouseUp = useCallback(() => {
    setIsDraggingH(false);
  }, []);

  useEffect(() => {
    if (!isDraggingH) return undefined;

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "default";
    };
  }, [isDraggingH, onMouseMove, onMouseUp]);

  const chainId = useMemo(() => (typeof network === "number" ? network : 43114), [network]);

  const perpTokenInfo = useMemo(() => {
    const symbol = normalizeMarketSymbol(selectedSymbol);
    const baseSymbol = getBaseSymbol(symbol);

    return {
      address: symbol,
      pairAddress: symbol,
      quoteToken: { symbol: "USDT", address: "USDT", decimals: 6 },
      createdAt: Date.now(),
      chainId,
      name: baseSymbol,
      symbol: baseSymbol,
      decimals: 8,
      imageUrl: "/tokenLogo.png",
      priceUsd: stats.lastPrice > 0 ? stats.lastPrice.toString() : "0",
      token: {},
    };
  }, [chainId, selectedSymbol, stats.lastPrice]);

  const renderTradeBox = useMemo(() => {
    return (
      <TradeBox
        chainId={chainId}
        tokenInfo={perpTokenInfo}
        isConnected={isConnected}
        user={user}
        userPrevOrders={userOrders}
        userWallets={userWallets}
      />
    );
  }, [chainId, isConnected, perpTokenInfo, user, userOrders, userWallets]);

  return (
    <div className="w-full h-full relative select-none">
      <div className="w-full h-full overflow-hidden flex flex-col">
        <div
          ref={containerRef}
          className="flex-1 flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-900 gap-0 p-2 overflow-hidden"
        >
          <div
            style={isDesktop ? { width: `${leftWidth}%` } : undefined}
            className={`h-full flex flex-col transition-all duration-300 ${
              isTradeBoxOpen ? "hidden lg:flex" : "flex"
            }`}
          >
            
            <ChartBox tokenSymbol={selectedSymbol} onSymbolChange={handleSymbolChange} />

            {/* <OrderBox
              network={network}
              userOrders={userOrders}
              orderCategory="perpetual"
              walletAddress=""
              isConnected={isConnected}
              tokenInfo={perpTokenInfo}
            /> */}
          </div>

          <div
            onMouseDown={() => setIsDraggingH(true)}
            className="hidden lg:flex w-2 h-full cursor-col-resize items-center justify-center group transition-colors hover:bg-blue-500/10"
          >
            <div className="h-12 w-1 bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500 rounded-full transition-colors" />
          </div>

          <div
            style={isDesktop ? { width: `${100 - leftWidth}%` } : undefined}
            className="hidden lg:block h-full flex-none min-w-[320px]"
          >
            {renderTradeBox}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isTradeBoxOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTradeBoxOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 h-[85vh] bg-white dark:bg-gray-900 z-50 lg:hidden rounded-t-3xl flex flex-col shadow-2xl"
            >
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img
                    src={perpTokenInfo.imageUrl}
                    className="w-8 h-8 rounded-full"
                    alt="Token"
                  />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      Trade {perpTokenInfo.symbol}
                    </h3>
                    <p className="text-xs text-gray-500">
                      ${Number(perpTokenInfo.priceUsd || 0).toFixed(4)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTradeBoxOpen(false)}
                  className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <FiX className="w-5 h-5 dark:text-white" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">{renderTradeBox}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
    </div>
  );
}
