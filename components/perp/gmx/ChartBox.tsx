"use client";

import { useState } from "react";
import { FiChevronUp } from "react-icons/fi";
import { LuChartCandlestick } from "react-icons/lu";
import { RiArrowDropDownLine } from "react-icons/ri";

import TvChartContainer from "@/components/tradingView/perp/gmx/chart";
import AssetSelect from "@/components/perp/gmx/assetSelect";
import type { GmxMarketStats } from "@/hooks/useGmxHooks/useGmxMarketStats";

interface ChartBoxProps {
  tokenSymbol: string;
  stats: GmxMarketStats;
  connected: boolean;
  loading: boolean;
  error: string | null;
  onSymbolChange?: (symbol: string) => void;
}

interface MetricItem {
  label: string;
  value: string;
}

const formatPrice = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "--";

  if (value >= 1000) {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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

const formatSpread = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return "--";
  return `${value.toFixed(value >= 100 ? 0 : 2)} bps`;
};

const formatCompactUsd = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "--";
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

export default function ChartBox({
  tokenSymbol,
  stats,
  connected,
  loading,
  error,
  onSymbolChange,
}: ChartBoxProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAssetSelect, setShowAssetSelect] = useState(false);

  const metrics: MetricItem[] = [
    {
      label: "Oracle Price",
      value: formatPrice(stats.markPrice),
    },
    {
      label: "Execution Spread",
      value: formatSpread(stats.spreadBps),
    },
    {
      label: "Open Interest",
      value: formatCompactUsd(stats.openInterestUsd),
    },
    {
      label: "Long Liquidity",
      value: formatCompactUsd(stats.availableLiquidityLongUsd),
    },
    {
      label: "Short Liquidity",
      value: formatCompactUsd(stats.availableLiquidityShortUsd),
    },
  ];

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-2xl font-mono shadow-sm p-1 lg:p-2 border border-gray-100 dark:border-gray-800">
        <div className="p-1 space-y-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div
                className="min-w-0 flex-1 rounded-lg p-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                onClick={() => setShowAssetSelect(true)}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <h2 className="flex items-center gap-2 text-lg lg:text-xl 2xl:text-2xl font-bold text-gray-800 dark:text-white">
                    <span className="flex gap-1 items-center bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded">
                      {tokenSymbol || "SYMBOL"} <RiArrowDropDownLine />
                    </span>
                    <span className="text-sm lg:text-md text-emerald-500">
                      GMX
                    </span>
                  </h2>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-900 dark:text-gray-100 font-semibold">
                      {formatPrice(stats.markPrice)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {stats.marketName || "Oracle market"}
                    </span>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        connected
                          ? "bg-emerald-400"
                          : loading
                            ? "bg-amber-400"
                            : "bg-red-400"
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <div className="flex w-full items-stretch justify-end gap-3 xl:w-auto xl:max-w-[820px]">
                  {metrics.map((item) => (
                    <div key={item.label}>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {item.label}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsCollapsed((previous) => !previous);
                  }}
                  className="mt-1 shrink-0 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title={isCollapsed ? "Expand chart" : "Collapse chart"}
                >
                  {isCollapsed ? (
                    <LuChartCandlestick className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <FiChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error ? <p className="text-[11px] text-red-500">{error}</p> : null}
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 border-t border-gray-300 dark:border-gray-800 ${
            isCollapsed
              ? "h-0 border-none"
              : "h-[400px] lg:h-[500px] 2xl:h-[500px]"
          }`}
        >
          <div className="h-full p-2">
            <div className="h-full rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
              {tokenSymbol ? (
                <TvChartContainer symbol={tokenSymbol} />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400">
                    Select a GMX market to view chart
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
        onSelectSymbol={(symbol) => onSymbolChange?.(symbol)}
        currentSymbol={tokenSymbol}
      />
    </>
  );
}
