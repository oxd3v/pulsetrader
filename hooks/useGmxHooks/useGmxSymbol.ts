import { useEffect, useMemo, useState } from "react";

import {
  getGmxMarketSnapshot,
  type GmxResolvedMarket,
} from "@/lib/oracle/gmx";

interface UseGmxSymbolsOptions {
  enabled?: boolean;
  refreshMs?: number;
}

interface UseGmxSymbolsResult {
  symbols: GmxResolvedMarket[];
  filteredSymbols: GmxResolvedMarket[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const useGmxSymbols = (
  options: UseGmxSymbolsOptions = {},
): UseGmxSymbolsResult => {
  const { enabled = true, refreshMs = 30_000 } = options;

  const [symbols, setSymbols] = useState<GmxResolvedMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return undefined;
    }

    let disposed = false;

    const loadSymbols = async () => {
      if (!disposed) {
        setLoading(true);
      }

      try {
        const snapshot = await getGmxMarketSnapshot();
        if (!snapshot.success) {
          throw new Error(snapshot.error || "Failed to fetch GMX markets");
        }

        if (!disposed) {
          setSymbols(snapshot.preferredMarkets);
          setError(null);
        }
      } catch (loadError) {
        if (!disposed) {
          setError(toErrorMessage(loadError, "Failed to fetch GMX markets"));
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    void loadSymbols();

    const intervalId = setInterval(() => {
      void loadSymbols();
    }, Math.max(10_000, Math.trunc(refreshMs)));

    return () => {
      disposed = true;
      clearInterval(intervalId);
    };
  }, [enabled, refreshMs]);

  const filteredSymbols = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return symbols;

    return symbols.filter((symbolItem) => {
      return (
        symbolItem.symbol.toLowerCase().includes(query) ||
        symbolItem.marketName.toLowerCase().includes(query) ||
        symbolItem.pairLabel.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, symbols]);

  return {
    symbols,
    filteredSymbols,
    loading,
    error,
    searchQuery,
    setSearchQuery,
  };
};

