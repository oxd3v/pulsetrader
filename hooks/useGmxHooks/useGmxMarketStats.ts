import { useEffect, useMemo, useState } from "react";

import {
  findGmxMarket,
  getGmxMarketSnapshot,
  normalizeGmxSymbol,
  type GmxResolvedMarket,
} from "@/lib/oracle/gmx";

interface UseGmxMarketStatsOptions {
  refreshMs?: number;
}

export interface GmxMarketStats {
  symbol: string;
  marketName: string;
  markPrice: number;
  oracleMinPrice: number;
  oracleMaxPrice: number;
  spreadBps: number;
  openInterestUsd: number;
  openInterestLongUsd: number;
  openInterestShortUsd: number;
  availableLiquidityUsd: number;
  availableLiquidityLongUsd: number;
  availableLiquidityShortUsd: number;
}

interface UseGmxMarketStatsResult {
  loading: boolean;
  error: string | null;
  connected: boolean;
  marketSymbol: string;
  market: GmxResolvedMarket | null;
  stats: GmxMarketStats;
}

const createEmptyStats = (symbol: string): GmxMarketStats => ({
  symbol,
  marketName: "",
  markPrice: 0,
  oracleMinPrice: 0,
  oracleMaxPrice: 0,
  spreadBps: 0,
  openInterestUsd: 0,
  openInterestLongUsd: 0,
  openInterestShortUsd: 0,
  availableLiquidityUsd: 0,
  availableLiquidityLongUsd: 0,
  availableLiquidityShortUsd: 0
});

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const useGmxMarketStats = (
  symbol: string,
  options: UseGmxMarketStatsOptions = {},
): UseGmxMarketStatsResult => {
  const marketSymbol = useMemo(() => normalizeGmxSymbol(symbol), [symbol]);
  const refreshMs = useMemo(() => {
    const requestedRefreshMs = Math.trunc(options.refreshMs ?? 15_000);
    return Math.max(10_000, requestedRefreshMs);
  }, [options.refreshMs]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [market, setMarket] = useState<GmxResolvedMarket | null>(null);
  const [stats, setStats] = useState<GmxMarketStats>(() =>
    createEmptyStats(marketSymbol),
  );

  useEffect(() => {
    if (!marketSymbol) {
      setLoading(false);
      setError(null);
      setConnected(false);
      setMarket(null);
      setStats(createEmptyStats(""));
      return undefined;
    }

    let disposed = false;

    const loadMarket = async () => {
      try {
        if (!disposed) {
          setLoading(true);
        }

        const snapshot = await getGmxMarketSnapshot();
        if (!snapshot.success) {
          throw new Error(snapshot.error || "Failed to fetch GMX market");
        }

        const selectedMarket =
          findGmxMarket(snapshot.preferredMarkets, marketSymbol) ??
          findGmxMarket(snapshot.markets, marketSymbol);

        if (!selectedMarket) {
          throw new Error(`No GMX market found for ${marketSymbol}`);
        }

        if (!disposed) {
          setMarket(selectedMarket);
          //console.log(selectedMarket);
          setStats({
            symbol: selectedMarket.symbol,
            marketName: selectedMarket.marketName,
            markPrice: selectedMarket.markPrice,
            oracleMinPrice: selectedMarket.oracleMinPrice,
            oracleMaxPrice: selectedMarket.oracleMaxPrice,
            spreadBps: selectedMarket.spreadBps,
            openInterestUsd: selectedMarket.openInterestUsd,
            openInterestLongUsd: selectedMarket.openInterestLongUsd,
            openInterestShortUsd: selectedMarket.openInterestShortUsd,
            availableLiquidityUsd: selectedMarket.availableLiquidityUsd,
            availableLiquidityLongUsd:
              selectedMarket.availableLiquidityLongUsd,
            availableLiquidityShortUsd:
              selectedMarket.availableLiquidityShortUsd
          });
          setConnected(true);
          setError(null);
        }
      } catch (loadError) {
        if (!disposed) {
          setConnected(false);
          setError(toErrorMessage(loadError, "Failed to fetch GMX market"));
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    void loadMarket();

    const intervalId = setInterval(() => {
      void loadMarket();
    }, refreshMs);

    return () => {
      disposed = true;
      clearInterval(intervalId);
    };
  }, [marketSymbol, refreshMs]);

  return {
    loading,
    error,
    connected,
    marketSymbol,
    market,
    stats,
  };
};
