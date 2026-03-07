"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AiFillStar,
  AiOutlineClose,
  AiOutlineSearch,
  AiOutlineStar,
} from "react-icons/ai";

import { useGmxSymbols } from "@/hooks/useGmxHooks/useGmxSymbol";
import type { GmxResolvedMarket } from "@/lib/oracle/gmx";

interface AssetSelectProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: string) => void;
  currentSymbol?: string;
}

const formatCompactUsd = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "--";
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};

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

const getSymbolBadge = (market: GmxResolvedMarket) => {
  return market.symbol.slice(0, 1).toUpperCase() || "?";
};

export default function AssetSelect({
  isOpen,
  onClose,
  onSelectSymbol,
  currentSymbol = "",
}: AssetSelectProps) {
  const {
    filteredSymbols,
    loading,
    error,
    searchQuery,
    setSearchQuery,
  } = useGmxSymbols({ enabled: isOpen });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === "undefined") {
      return new Set();
    }

    const savedFavorites = window.localStorage.getItem("gmx_favorites");
    if (!savedFavorites) {
      return new Set();
    }

    try {
      return new Set(JSON.parse(savedFavorites) as string[]);
    } catch {
      return new Set();
    }
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "gmx_favorites",
      JSON.stringify([...favorites.values()]),
    );
  }, [favorites]);

  useEffect(() => {
    if (!isOpen) return;

    const timeoutId = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  const displaySymbols = useMemo(() => {
    if (!showFavoritesOnly) return filteredSymbols;

    return filteredSymbols.filter((market) => favorites.has(market.symbol));
  }, [favorites, filteredSymbols, showFavoritesOnly]);

  const normalizedCurrentSymbol = currentSymbol.trim().toUpperCase();

  const toggleFavorite = useCallback((symbol: string) => {
    setFavorites((previous) => {
      const next = new Set(previous);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (symbol: string) => {
      onSelectSymbol(symbol);
      onClose();
    },
    [onClose, onSelectSymbol],
  );

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50"
          />

          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="relative bg-gray-950 rounded-lg border border-gray-800 w-full max-w-6xl mx-4 max-h-[80vh] overflow-hidden flex flex-col"
          >
            <div className="sticky top-0 bg-gray-950 border-b border-gray-800 p-4 z-40">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Select GMX Market</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-900 rounded-lg transition-colors"
                >
                  <AiOutlineClose className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <AiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search symbol or market..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 focus:ring-1 focus:ring-gray-700"
                  />
                </div>

                <button
                  onClick={() => setShowFavoritesOnly((previous) => !previous)}
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                    showFavoritesOnly
                      ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30"
                      : "bg-gray-900 text-gray-300 border-gray-800"
                  }`}
                >
                  Favorites
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  Loading GMX markets...
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64 text-red-400">
                  {error}
                </div>
              ) : displaySymbols.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  No GMX markets found
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
                    <tr className="text-left text-gray-400 text-xs font-medium uppercase">
                      <th className="w-12 px-4 py-3"></th>
                      <th className="px-4 py-3 min-w-[150px]">Market</th>
                      <th className="px-4 py-3 text-right min-w-[120px]">
                        Oracle Price
                      </th>
                      <th className="px-4 py-3 text-right min-w-[110px]">
                        Spread
                      </th>
                      <th className="px-4 py-3 text-right min-w-[120px]">
                        Open Interest
                      </th>
                      <th className="px-4 py-3 text-right min-w-[120px]">
                        Liquidity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displaySymbols.map((market) => {
                      const isFavorite = favorites.has(market.symbol);
                      const isSelected =
                        normalizedCurrentSymbol === market.symbol.toUpperCase();

                      return (
                        <motion.tr
                          key={market.marketTokenAddress}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`border-b border-gray-800 hover:bg-gray-900 cursor-pointer transition-colors ${
                            isSelected ? "bg-gray-900" : ""
                          }`}
                          onClick={() => handleSelect(market.symbol)}
                        >
                          <td
                            className="w-12 px-4 py-3"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavorite(market.symbol);
                            }}
                          >
                            <button className="p-1 hover:bg-gray-800 rounded transition-colors">
                              {isFavorite ? (
                                <AiFillStar className="w-4 h-4 text-yellow-500" />
                              ) : (
                                <AiOutlineStar className="w-4 h-4 text-gray-500 hover:text-gray-400" />
                              )}
                            </button>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-bold text-gray-100">
                                {getSymbolBadge(market)}
                              </div>
                              <div>
                                <div className="font-semibold text-white">
                                  {market.symbol}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {market.pairLabel}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right font-mono text-white">
                            {formatPrice(market.markPrice)}
                          </td>

                          <td className="px-4 py-3 text-right font-mono text-gray-300">
                            {formatSpread(market.spreadBps)}
                          </td>

                          <td className="px-4 py-3 text-right font-mono text-gray-300">
                            {formatCompactUsd(market.openInterestUsd)}
                          </td>

                          <td className="px-4 py-3 text-right font-mono text-gray-300">
                            {formatCompactUsd(market.availableLiquidityUsd)}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
