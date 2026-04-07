"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { FiPlus, FiX } from "react-icons/fi";
import { useShallow } from "zustand/shallow";

import PerpTradingCaution from "@/components/common/Confirmation/PerpCaution";
import OrderBox from "@/components/order/dashboard/OrderList";
import TradeBox from "@/components/tradeBox/perpTradeBox";
import {
  useHyperliquidMarketStats,
  type HyperliquidMarketStats,
} from "@/hooks/useHyperLiquidHooks/useHyperliquidMarketStats";
import { useStore } from "@/store/useStore";
import type {
  LiveMarketSnapshot,
  MarketSnapshotRef,
  StableMarketTokenInfo,
} from "@/type/market";
import type { ORDER_TYPE } from "@/type/order";
import ChartBox from "./ChartBox";

interface DEFINED_PERP_MAIN_PROPS {
  tokenSymbol: string;
}

type HyperliquidPerpTokenInfo = StableMarketTokenInfo & {
  address: string;
  pairAddress: string;
  quoteToken: { symbol: string; address: string; decimals: number };
  createdAt: number;
  chainId: number;
  name: string;
  symbol: string;
  priceUsd: string;
};

const DEFAULT_CHAIN_ID = 43114;

const normalizeMarketSymbol = (symbol: string): string => {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return "";
  if (
    normalized.endsWith("USDT") ||
    normalized.endsWith("USDC") ||
    normalized.endsWith("BUSD")
  ) {
    return normalized.replace(/(USDT|USDC|BUSD)$/i, "");
  }
  return normalized;
};

const getBaseSymbol = (symbol: string): string => {
  return symbol.replace(/(USDT|USDC|BUSD)$/i, "");
};

const toPriceString = (value: number) => {
  return value > 0 ? value.toString() : "0";
};

const ChartSection = memo(
  ({
    selectedSymbol,
    stats,
    userConnected,
    marketConnected,
    userOrders,
    loading,
    error,
    onSymbolChange,
    leftWidth,
    isDesktop,
    isTradeBoxOpen,
    perpTokenInfo,
    marketSnapshotRef,
  }: {
    selectedSymbol: string;
    stats: HyperliquidMarketStats;
    userConnected: boolean;
    marketConnected: boolean;
    userOrders: ORDER_TYPE[];
    loading: boolean;
    error: string | null;
    onSymbolChange: (symbol: string) => void;
    leftWidth: number;
    isDesktop: boolean;
    isTradeBoxOpen: boolean;
    perpTokenInfo: HyperliquidPerpTokenInfo;
    marketSnapshotRef: MarketSnapshotRef;
  }) => (
    <div
      style={isDesktop ? { width: `${leftWidth}%` } : undefined}
      className={`h-full flex flex-col transition-all duration-300 ${isTradeBoxOpen ? "hidden lg:flex" : "flex"
        }`}
    >
      <ChartBox
        tokenSymbol={selectedSymbol}
        onSymbolChange={onSymbolChange}
        stats={stats}
        connected={marketConnected}
        loading={loading}
        error={error}
      />
      <OrderBox
        orderCategory="perpetual"
        tokenInfo={perpTokenInfo}
        userOrders={userOrders}
        isConnected={userConnected}
        protocol="hyperliquid"
        marketSnapshotRef={marketSnapshotRef}
      />
    </div>
  ),
);
ChartSection.displayName = "ChartSection";

const ResizeDivider = memo(({ onMouseDown }: { onMouseDown: () => void }) => (
  <div
    onMouseDown={onMouseDown}
    className="hidden lg:flex w-2 h-full cursor-col-resize items-center justify-center group transition-colors hover:bg-blue-500/10"
  >
    <div className="h-12 w-1 bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500 rounded-full transition-colors" />
  </div>
));
ResizeDivider.displayName = "ResizeDivider";

const TradeBoxSection = memo(
  ({
    rightWidth,
    isDesktop,
    renderTradeBox,
  }: {
    rightWidth: number;
    isDesktop: boolean;
    renderTradeBox: ReactNode;
  }) => (
    <div
      style={isDesktop ? { width: `${rightWidth}%` } : undefined}
      className="hidden lg:block h-full flex-none min-w-[320px]"
    >
      {renderTradeBox}
    </div>
  ),
);
TradeBoxSection.displayName = "TradeBoxSection";

const MobileTradeModal = memo(
  ({
    isOpen,
    onClose,
    perpTokenInfo,
    currentPriceUsd,
    renderTradeBox,
  }: {
    isOpen: boolean;
    onClose: () => void;
    perpTokenInfo: HyperliquidPerpTokenInfo;
    currentPriceUsd: string;
    renderTradeBox: ReactNode;
  }) => (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
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
                  src={perpTokenInfo.imageUrl || "/tokenLogo.png"}
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
                    ${Number(currentPriceUsd || perpTokenInfo.priceUsd || 0).toFixed(4)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
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
  ),
);
MobileTradeModal.displayName = "MobileTradeModal";

const TradeButton = memo(({ onClick }: { onClick: () => void }) => (
  <AnimatePresence>
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 lg:hidden z-30 h-14 px-6 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center gap-2 font-bold"
    >
      <FiPlus className="w-5 h-5" />
      Trade
    </motion.button>
  </AnimatePresence>
));
TradeButton.displayName = "TradeButton";

export default function DefinedPerpMain({
  tokenSymbol,
}: DEFINED_PERP_MAIN_PROPS) {
  const { user, isConnected, network, userOrders, userWallets } = useStore(
    useShallow((state) => {
      const typedState = state as {
        user: unknown;
        network: number | null | undefined;
        userOrders: ORDER_TYPE[];
        userWallets: unknown[];
        isConnected: boolean;
      };

      return {
        user: typedState.user,
        network: typedState.network,
        userOrders: typedState.userOrders,
        userWallets: typedState.userWallets,
        isConnected: typedState.isConnected,
      };
    }),
  );

  const [selectedSymbol, setSelectedSymbol] = useState(() =>
    normalizeMarketSymbol(tokenSymbol),
  );
  const [isTradeBoxOpen, setIsTradeBoxOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(75);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showCaution, setShowCaution] = useState(true);
  const [isDraggingH, setIsDraggingH] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const marketSnapshotRef = useRef<LiveMarketSnapshot>({ priceUsd: "0" });

  const { stats, connected, loading, error } =
    useHyperliquidMarketStats(selectedSymbol);



  useEffect(() => {
    const accepted =
      localStorage.getItem("perp_caution_hyperliquid") === "accepted";
    setShowCaution(!accepted);
  }, []);

  const handleAcceptCaution = useCallback(() => {
    setShowCaution(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("perp_caution_hyperliquid", "accepted");
    }
  }, []);

  const handleDeclineCaution = useCallback(() => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  }, []);

  useEffect(() => {
    marketSnapshotRef.current = { priceUsd: "0" };
    setSelectedSymbol(normalizeMarketSymbol(tokenSymbol));
  }, [tokenSymbol]);

  useEffect(() => {
    marketSnapshotRef.current = {
      priceUsd: toPriceString(stats.lastPrice),
      lastPrice: stats.lastPrice,
      markPrice: stats.markPrice,
      indexPrice: stats.indexPrice,
      fundingRate: stats.fundingRate,
      nextFundingTime: stats.nextFundingTime,
      quoteVolume: stats.quoteVolume,
      openInterest: stats.openInterest,
      openInterestUsd: stats.openInterestUsd,
      eventTime: stats.eventTime,
    };
  }, [
    stats.eventTime,
    stats.fundingRate,
    stats.indexPrice,
    stats.lastPrice,
    stats.markPrice,
    stats.nextFundingTime,
    stats.openInterest,
    stats.openInterestUsd,
    stats.quoteVolume,
  ]);

  useEffect(() => {
    const handleViewport = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    handleViewport();
    window.addEventListener("resize", handleViewport);
    return () => window.removeEventListener("resize", handleViewport);
  }, []);

  const handleSymbolChange = useCallback((symbol: string) => {
    marketSnapshotRef.current = { priceUsd: "0" };
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

  const chainId = useMemo(
    () => (typeof network === "number" ? network : DEFAULT_CHAIN_ID),
    [network],
  );

  const livePriceUsd = useMemo(
    () => toPriceString(stats.lastPrice),
    [stats.lastPrice],
  );

  const perpTokenInfo = useMemo<HyperliquidPerpTokenInfo>(() => {
    const normalizedSymbol = normalizeMarketSymbol(selectedSymbol);
    const baseSymbol = getBaseSymbol(normalizedSymbol);

    return {
      address: normalizedSymbol,
      pairAddress: normalizedSymbol,
      quoteToken: { symbol: "USDC", address: "USDC", decimals: 6 },
      createdAt: 0,
      chainId,
      name: baseSymbol,
      symbol: baseSymbol,
      priceUsd: "0",
      maxLeverage: stats.maxLeverage,
      imageUrl: "/tokenLogo.png",
    };
  }, [chainId, selectedSymbol, stats.maxLeverage]);

  const renderTradeBox = useMemo(() => {
    return (
      <TradeBox
        chainId={chainId}
        tokenInfo={perpTokenInfo}
        isConnected={isConnected}
        user={user}
        userPrevOrders={userOrders}
        userWallets={userWallets}
        protocol="hyperliquid"
        marketSnapshotRef={marketSnapshotRef}
      />
    );
  }, [
    chainId,
    isConnected,
    marketSnapshotRef,
    perpTokenInfo,
    user,
    userOrders,
    userWallets,
  ]);

  const handleResizeDividerMouseDown = useCallback(() => {
    setIsDraggingH(true);
  }, []);

  const handleTradeBoxOpen = useCallback(() => {
    setIsTradeBoxOpen(true);
  }, []);

  const handleTradeBoxClose = useCallback(() => {
    setIsTradeBoxOpen(false);
  }, []);

  const rightWidth = 100 - leftWidth;

  return (
    <>
      <PerpTradingCaution
        isOpen={showCaution}
        onAccept={handleAcceptCaution}
        onDecline={handleDeclineCaution}
        dex="hyperliquid"
      />
      <div
        className={`w-full h-full relative select-none ${showCaution ? "pointer-events-none opacity-30 blur-sm" : ""
          }`}
      >
        <div className="w-full h-full overflow-hidden flex flex-col">
          <div
            ref={containerRef}
            className="flex-1 flex flex-col lg:flex-row bg-gray-50 dark:bg-gray-900 gap-0 p-2 overflow-hidden"
          >
            <ChartSection
              selectedSymbol={selectedSymbol}
              userOrders={userOrders}
              stats={stats}
              userConnected={isConnected}
              marketConnected={connected}
              loading={loading}
              error={error}
              onSymbolChange={handleSymbolChange}
              leftWidth={leftWidth}
              isDesktop={isDesktop}
              isTradeBoxOpen={isTradeBoxOpen}
              perpTokenInfo={perpTokenInfo}
              marketSnapshotRef={marketSnapshotRef}
            />

            <ResizeDivider onMouseDown={handleResizeDividerMouseDown} />

            <TradeBoxSection
              rightWidth={rightWidth}
              isDesktop={isDesktop}
              renderTradeBox={renderTradeBox}
            />
          </div>
        </div>

        <MobileTradeModal
          isOpen={isTradeBoxOpen}
          onClose={handleTradeBoxClose}
          perpTokenInfo={perpTokenInfo}
          currentPriceUsd={livePriceUsd}
          renderTradeBox={renderTradeBox}
        />

        {!isTradeBoxOpen && <TradeButton onClick={handleTradeBoxOpen} />}
      </div>
    </>
  );
}
