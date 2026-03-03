import { useEffect, useMemo, useState } from 'react';

export interface SymbolData {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  volume: string;
  quoteVolume: string;
  fundingRate?: string;
  markPrice?: string;
  indexPrice?: string;
  nextFundingTime?: number;
  openInterest?: string;
  status: string;
  contractType: string;
}

interface UseHyperliquidSymbolsResult {
  symbols: SymbolData[];
  filteredSymbols: SymbolData[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  category: string;
  setCategory: (category: string) => void;
  tab: 'Futures' | 'Spot';
  setTab: (tab: 'Futures' | 'Spot') => void;
}

interface UseHyperliquidSymbolsOptions {
  enabled?: boolean;
}

type MetaUniverseItem = {
  name?: string;
};

type MetaPayload = {
  universe?: MetaUniverseItem[];
};

type AssetContext = {
  markPx?: string | number;
  midPx?: string | number;
  oraclePx?: string | number;
  funding?: string | number;
  fundingRate?: string | number;
  dayNtlVlm?: string | number;
  dayNtlVolume?: string | number;
  dayBaseVlm?: string | number;
  openInterest?: string | number;
  openInterestNtl?: string | number;
  prevDayPx?: string | number;
  prevDayPrice?: string | number;
  nextFundingTime?: string | number;
};

type RawMetaAndAssetCtxPayload = [MetaPayload | MetaUniverseItem[], AssetContext[]];

const API_INFO_URL = 'https://api.hyperliquid.xyz/info';
const POLL_MS = 5000;

const CATEGORIES = {
  'All markets': [],
  Top: ['BTC', 'ETH', 'SOL', 'HYPE'],
  New: ['NEW'],
  Meme: ['DOGE', 'PEPE'],
  Stocks: [],
  AI: [],
  'Pre-launch': [],
  Metals: [],
} as const;

const toFiniteNumber = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

const areSymbolsEqual = (prev: SymbolData[], next: SymbolData[]): boolean => {
  if (prev === next) return true;
  if (prev.length !== next.length) return false;

  for (let index = 0; index < prev.length; index += 1) {
    const prevItem = prev[index];
    const nextItem = next[index];
    if (
      prevItem.symbol !== nextItem.symbol ||
      prevItem.lastPrice !== nextItem.lastPrice ||
      prevItem.priceChangePercent !== nextItem.priceChangePercent ||
      prevItem.quoteVolume !== nextItem.quoteVolume ||
      prevItem.fundingRate !== nextItem.fundingRate ||
      prevItem.openInterest !== nextItem.openInterest ||
      prevItem.markPrice !== nextItem.markPrice ||
      prevItem.indexPrice !== nextItem.indexPrice
    ) {
      return false;
    }
  }

  return true;
};

const normalizeMetaAndAssetCtxPayload = (
  payload: RawMetaAndAssetCtxPayload
): [MetaUniverseItem[], AssetContext[]] => {
  const [metaOrUniverse, contexts] = payload;
  const universe = Array.isArray(metaOrUniverse)
    ? metaOrUniverse
    : Array.isArray(metaOrUniverse?.universe)
      ? metaOrUniverse.universe
      : [];

  return [universe, Array.isArray(contexts) ? contexts : []];
};

const fetchMetaAndAssetCtx = async (): Promise<[MetaUniverseItem[], AssetContext[]]> => {
  const response = await fetch(API_INFO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`HyperLiquid symbols request failed (${response.status})`);
  }

  const payload = (await response.json()) as RawMetaAndAssetCtxPayload;
  if (!Array.isArray(payload) || payload.length < 2) {
    throw new Error('Invalid HyperLiquid symbols payload');
  }

  return normalizeMetaAndAssetCtxPayload(payload);
};

const buildSymbolRows = (universe: MetaUniverseItem[], contexts: AssetContext[]): SymbolData[] => {
  return universe
    .map((item, index) => {
      const baseAsset = String(item?.name ?? '').toUpperCase();
      if (!baseAsset) return null;

      const context = contexts[index] ?? {};
      const markPrice = toFiniteNumber(context.markPx ?? context.midPx);
      const lastPrice = markPrice > 0 ? markPrice : toFiniteNumber(context.midPx);
      const indexPrice = toFiniteNumber(context.oraclePx ?? context.midPx ?? context.markPx);
      const fundingRate = toFiniteNumber(context.fundingRate ?? context.funding);
      const quoteVolume = toFiniteNumber(context.dayNtlVlm ?? context.dayNtlVolume);
      const volume = toFiniteNumber(context.dayBaseVlm);

      const prevDayPrice = toFiniteNumber(context.prevDayPx ?? context.prevDayPrice);
      const priceChange = lastPrice > 0 && prevDayPrice > 0 ? lastPrice - prevDayPrice : 0;
      const priceChangePercent =
        lastPrice > 0 && prevDayPrice > 0 ? (priceChange / prevDayPrice) * 100 : 0;

      const openInterestNotional = toFiniteNumber(context.openInterestNtl);
      const openInterestUnits = toFiniteNumber(context.openInterest);
      const openInterestValue =
        openInterestNotional > 0
          ? openInterestNotional
          : openInterestUnits > 0 && lastPrice > 0
            ? openInterestUnits * lastPrice
            : 0;

      return {
        symbol: `${baseAsset}USDT`,
        baseAsset,
        quoteAsset: 'USDT',
        lastPrice: String(lastPrice || 0),
        priceChange: String(priceChange || 0),
        priceChangePercent: String(priceChangePercent || 0),
        volume: String(volume || 0),
        quoteVolume: String(quoteVolume || 0),
        fundingRate: String(fundingRate || 0),
        markPrice: String(markPrice || 0),
        indexPrice: String(indexPrice || 0),
        nextFundingTime: Math.trunc(toFiniteNumber(context.nextFundingTime)),
        openInterest: String(openInterestValue || 0),
        status: 'TRADING',
        contractType: 'PERPETUAL',
      } as SymbolData;
    })
    .filter((item): item is SymbolData => item !== null)
    .sort((first, second) => toFiniteNumber(second.quoteVolume) - toFiniteNumber(first.quoteVolume));
};

export const useHyperliquidSymbols = (
  options: UseHyperliquidSymbolsOptions = {}
): UseHyperliquidSymbolsResult => {
  const { enabled = true } = options;

  const [symbols, setSymbols] = useState<SymbolData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All markets');
  const [tab, setTab] = useState<'Futures' | 'Spot'>('Futures');

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }

    let disposed = false;
    let isInitialLoad = true;

    const loadSymbols = async () => {
      try {
        if (!disposed && isInitialLoad) {
          setLoading(true);
          setError(null);
        }

        const [universe, contexts] = await fetchMetaAndAssetCtx();
        if (disposed) return;

        const nextSymbols = buildSymbolRows(universe, contexts);
        setSymbols((previous) => (areSymbolsEqual(previous, nextSymbols) ? previous : nextSymbols));
        setError((previous) => (previous === null ? previous : null));
      } catch (loadError) {
        if (disposed) return;
        const message = toErrorMessage(loadError, 'Failed to fetch HyperLiquid symbols');
        setError((previous) => (previous === message ? previous : message));
      } finally {
        if (!disposed && isInitialLoad) {
          setLoading(false);
          isInitialLoad = false;
        }
      }
    };

    loadSymbols();
    const intervalId = setInterval(loadSymbols, POLL_MS);

    return () => {
      disposed = true;
      clearInterval(intervalId);
    };
  }, [enabled, tab]);

  const filteredSymbols = useMemo(() => {
    let filtered = symbols;

    if (category !== 'All markets' && CATEGORIES[category as keyof typeof CATEGORIES].length > 0) {
      const categoryAssets = CATEGORIES[category as keyof typeof CATEGORIES];
      filtered = filtered.filter((symbolItem) =>
        categoryAssets.some((asset) => symbolItem.symbol.includes(asset))
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((symbolItem) => {
        return (
          symbolItem.symbol.toLowerCase().includes(query) ||
          symbolItem.baseAsset.toLowerCase().includes(query)
        );
      });
    }

    return filtered;
  }, [symbols, category, searchQuery]);

  return {
    symbols,
    filteredSymbols,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    category,
    setCategory,
    tab,
    setTab,
  };
};
