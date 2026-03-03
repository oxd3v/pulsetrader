"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiChevronUp } from "react-icons/fi";
import { LuChartCandlestick } from "react-icons/lu";

import TvChartContainer from "@/components/tradingView/perp/hyperliquid/chart";
import OrderBook from "./OrderBook";
import AssetSelect from "./assetSelect";
import { useHyperliquidMarketStats } from "@/hooks/useHyperLiquidHooks/useHyperliquidMarketStats";

interface ChartBoxProps {
  tokenSymbol: string;
  handleTokenSelect?: () => void;
  onSymbolChange?: (symbol: string) => void;
}

const normalizeMarketSymbol = (symbol: string): string => {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return "";
  if (normalized.endsWith("USDT") || normalized.endsWith("USDC") || normalized.endsWith("BUSD")) {
    return normalized;
  }
  return `${normalized}USDT`;
};

const toFiniteNumber = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const formatPrice = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "--";

  if (value >= 1000) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  if (value >= 1) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
};

const formatPercent = (value: number): string => {
  if (!Number.isFinite(value)) return "--";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
};

const formatUsd = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "--";

  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatFundingRate = (value: number): string => {
  if (!Number.isFinite(value)) return "--";
  return `${(value * 100).toFixed(4)}%`;
};

const formatCountdown = (nextFundingTime: number, now: number): string => {
  if (!Number.isFinite(nextFundingTime) || nextFundingTime <= now) {
    return "--:--:--";
  }

  const remainingMs = nextFundingTime - now;
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hoursText = String(hours).padStart(2, "0");
  const minutesText = String(minutes).padStart(2, "0");
  const secondsText = String(seconds).padStart(2, "0");

  return `${hoursText}:${minutesText}:${secondsText}`;
};

export default function ChartBox({
  tokenSymbol,
  handleTokenSelect,
  onSymbolChange,
}: ChartBoxProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAssetSelect, setShowAssetSelect] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState(() => normalizeMarketSymbol(tokenSymbol));
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  const {
    stats,
    connected: marketConnected,
    loading: marketLoading,
    error: marketError,
  } = useHyperliquidMarketStats(selectedSymbol);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1026) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    if (window.innerWidth < 1026) {
      setIsCollapsed(true);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setSelectedSymbol(normalizeMarketSymbol(tokenSymbol));
  }, [tokenSymbol]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const handleSelectSymbol = useCallback(
    (symbol: string) => {
      const normalizedSymbol = normalizeMarketSymbol(symbol);
      setSelectedSymbol(normalizedSymbol);
      if (onSymbolChange) {
        onSymbolChange(normalizedSymbol);
      }
      if (handleTokenSelect) {
        handleTokenSelect();
      }
    },
    [handleTokenSelect, onSymbolChange]
  );

  const memoizedOrderBook = useMemo(
    () => <OrderBook key={selectedSymbol} symbol={selectedSymbol} />,
    [selectedSymbol]
  );

  const metrics = useMemo(() => {
    const fundingCountdown = formatCountdown(stats.nextFundingTime, currentTime);
    return [
      { label: "Mark", value: formatPrice(stats.markPrice) },
      { label: "Index", value: formatPrice(stats.indexPrice) },
      {
        label: "Funding/Countdown",
        value: `${formatFundingRate(stats.fundingRate)} / ${fundingCountdown}`,
      },
      { label: "24h Volume (USDT)", value: formatUsd(stats.quoteVolume) },
      { label: "Open Interest (USDT)", value: formatUsd(stats.openInterestUsd) },
    ];
  }, [currentTime, stats]);

  const changeValue = toFiniteNumber(stats.priceChangePercent);
  const hasSymbol = Boolean(selectedSymbol);

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-2xl font-mono shadow-sm p-1 lg:p-2 border border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between gap-3 p-1">
          <div
            className="flex-1 min-w-0 p-1 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            onClick={() => setShowAssetSelect(true)}
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg lg:text-xl 2xl:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded">
                  {selectedSymbol || "SYMBOL"}
                </span>
                <span className="text-sm lg:text-md text-yellow-400">Perp</span>
              </h2>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-900 dark:text-gray-100 font-semibold">
                  {formatPrice(stats.lastPrice)}
                </span>
                <span
                  className={`font-semibold ${
                    changeValue >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {formatPercent(changeValue)}
                </span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    marketConnected ? "bg-emerald-400" : marketLoading ? "bg-amber-400" : "bg-red-400"
                  }`}
                />
              </div>

              <span className="text-xs text-gray-500 dark:text-gray-400">
                Click to change
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
              {metrics.map((item) => (
                <div
                  key={item.label}
                  className="min-w-0 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 rounded px-2 py-1"
                >
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{item.label}</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{item.value}</p>
                </div>
              ))}
            </div>

            {marketError ? (
              <p className="mt-1 text-[11px] text-red-500">{marketError}</p>
            ) : null}
          </div>

          <button
            onClick={(event) => {
              event.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            className="mt-1 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={isCollapsed ? "Expand chart" : "Collapse chart"}
          >
            {isCollapsed ? (
              <LuChartCandlestick className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <FiChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 border-t border-gray-300 dark:border-gray-800 ${
            isCollapsed
              ? "h-0 border-none"
              : "h-[400px] lg:h-[400px] 2xl:h-[400px]"
          }`}
        >
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-2 h-full p-2">
            <div className="lg:col-span-4 h-full rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
              {hasSymbol ? (
                <div className="w-full h-full">
                 <TvChartContainer symbol={selectedSymbol} />
                </div>
                
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400">
                    Select a symbol to view chart
                  </span>
                </div>
              )}
            </div>

            <div className=" xl:block  xl:h-full h-auto">
              {hasSymbol ? (
                <div className="w-full h-full">{memoizedOrderBook}</div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center h-full">
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    Select a symbol to view order book
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AssetSelect
        isOpen={showAssetSelect}
        onClose={() => setShowAssetSelect(false)}
        onSelectSymbol={handleSelectSymbol}
        currentSymbol={selectedSymbol}
      />
    </>
  );
}
