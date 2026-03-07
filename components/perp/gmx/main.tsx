"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiPlus, FiX } from "react-icons/fi";
import Image from "next/image";
import { useShallow } from "zustand/shallow";

import ChartBox from "./ChartBox";
import OrderBox from "@/components/order/dashboard/OrderList";
import TradeBox from "@/components/tradeBox/perpTradeBox";
import { useStore } from "@/store/useStore";
import { chains } from "@/constants/common/chain";
import { normalizeGmxSymbol } from "@/lib/oracle/gmx";
import { useGmxMarketStats } from "@/hooks/useGmxHooks/useGmxMarketStats";
import type { ORDER_TYPE } from "@/type/order";

interface GmxMainProps {
  tokenSymbol: string;
}

export default function GmxMain({ tokenSymbol }: GmxMainProps) {
  const { user, isConnected, userOrders, userWallets } = useStore(
    useShallow((state) => {
      const typedState = state as {
        user: unknown;
        userOrders: ORDER_TYPE[];
        userWallets: unknown[];
        isConnected: boolean;
      };

      return {
        user: typedState.user,
        userOrders: typedState.userOrders,
        userWallets: typedState.userWallets,
        isConnected: typedState.isConnected,
      };
    }),
  );

  const [selectedSymbol, setSelectedSymbol] = useState(() =>
    normalizeGmxSymbol(tokenSymbol),
  );
  const [isTradeBoxOpen, setIsTradeBoxOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(75);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isDraggingH, setIsDraggingH] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const { market, stats, connected, loading, error } =
    useGmxMarketStats(selectedSymbol);

  useEffect(() => {
    setSelectedSymbol(normalizeGmxSymbol(tokenSymbol));
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
    setSelectedSymbol(normalizeGmxSymbol(symbol));
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
    [isDraggingH],
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

  const chainId = chains.Arbitrum;

  const perpTokenInfo = useMemo(() => {
    return {
      address: market?.indexTokenAddress ?? selectedSymbol,
      pairAddress: market?.marketTokenAddress ?? selectedSymbol,
      marketTokenAddress: market?.marketTokenAddress,
      quoteToken: { symbol: "USD", address: "USD", decimals: 6 },
      createdAt: market?.listingTimestamp ?? 0,
      chainId,
      name: market?.symbol ?? selectedSymbol,
      symbol: market?.symbol ?? selectedSymbol,
      decimals: market?.indexTokenDecimals ?? 18,
      imageUrl: "/tokenLogo.png",
      priceUsd: stats.markPrice > 0 ? stats.markPrice.toString() : "0",
      token: {
        marketName: market?.marketName,
        longTokenSymbol: market?.longTokenSymbol,
        shortTokenSymbol: market?.shortTokenSymbol,
      },
    };
  }, [chainId, market, selectedSymbol, stats.markPrice]);

  const renderTradeBox = useMemo(() => {
    if (!market && loading) {
      return (
        <div className="h-full rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-sm text-gray-500 dark:text-gray-400">
          Loading GMX market...
        </div>
      );
    }

    if (!market) {
      return (
        <div className="h-full rounded-2xl border border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-900 p-6 text-sm text-red-500">
          {error || "GMX market data is unavailable for this symbol."}
        </div>
      );
    }

    return (
      <TradeBox
        chainId={chainId}
        tokenInfo={perpTokenInfo}
        isConnected={isConnected}
        user={user}
        userPrevOrders={userOrders}
        userWallets={userWallets}
        protocol="gmx"
      />
    );
  }, [
    chainId,
    error,
    isConnected,
    loading,
    market,
    perpTokenInfo,
    user,
    userOrders,
    userWallets,
  ]);

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
            <ChartBox
              tokenSymbol={selectedSymbol}
              stats={stats}
              connected={connected}
              loading={loading}
              error={error}
              onSymbolChange={handleSymbolChange}
            />

            <OrderBox
              network={chainId}
              userOrders={userOrders}
              orderCategory="perpetual"
              walletAddress=""
              isConnected={isConnected}
              tokenInfo={perpTokenInfo}
            />
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
        {isTradeBoxOpen ? (
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
                  <Image
                    src={perpTokenInfo.imageUrl}
                    alt="Token"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full"
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
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {!isTradeBoxOpen ? (
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
        ) : null}
      </AnimatePresence>
    </div>
  );
}
