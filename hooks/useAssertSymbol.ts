import { useEffect, useState, useCallback } from 'react';

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
  openInterest?: string;
  status: string;
  contractType: string;
}

interface UseAsterSymbolsResult {
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

const API_BASE_URL = 'https://api.asterdex.com/fapi/v3';
const CATEGORIES = {
  'All markets': [],
  'Top': ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'],
  'New': ['NEW'],
  'Meme': ['DOGE', 'SHIB'],
  'Stocks': [],
  'AI': [],
  'Pre-launch': [],
  'Metals': ['GOLD', 'SILVER'],
};

export const useAsterSymbols = (): UseAsterSymbolsResult => {
  const [symbols, setSymbols] = useState<SymbolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All markets');
  const [tab, setTab] = useState<'Futures' | 'Spot'>('Futures');

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchSymbols = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch exchange info for all symbols
        const exchangeRes = await fetch(
          `${API_BASE_URL}/exchangeInfo`,
          { signal: controller.signal }
        );

        if (!exchangeRes.ok) throw new Error('Failed to fetch exchange info');
        const exchangeData = await exchangeRes.json();

        // Fetch 24hr ticker data for all symbols
        const tickerRes = await fetch(
          `${API_BASE_URL}/ticker/24hr`,
          { signal: controller.signal }
        );

        if (!tickerRes.ok) throw new Error('Failed to fetch ticker data');
        const tickerData = await tickerRes.json();

        // Fetch funding rate data
        const fundingRes = await fetch(
          `${API_BASE_URL}/fundingRate`,
          { signal: controller.signal }
        );

        let fundingRates: Record<string, string> = {};
        if (fundingRes.ok) {
          const fundingData = await fundingRes.json();
          // Get latest funding rate for each symbol
          fundingData.forEach((item: any) => {
            fundingRates[item.symbol] = item.fundingRate;
          });
        }

        // Merge data
        const mergedData: SymbolData[] = exchangeData.symbols
          .filter((symbol: any) => 
            symbol.contractType === 'PERPETUAL' && 
            symbol.status === 'TRADING'
          )
          .map((symbol: any) => {
            const ticker = tickerData.find((t: any) => t.symbol === symbol.symbol);
            return {
              symbol: symbol.symbol,
              baseAsset: symbol.baseAsset,
              quoteAsset: symbol.quoteAsset,
              lastPrice: ticker?.lastPrice || '0',
              priceChange: ticker?.priceChange || '0',
              priceChangePercent: ticker?.priceChangePercent || '0',
              volume: ticker?.volume || '0',
              quoteVolume: ticker?.quoteVolume || '0',
              fundingRate: fundingRates[symbol.symbol] || '0',
              status: symbol.status,
              contractType: symbol.contractType,
            };
          })
          .sort((a: SymbolData, b: SymbolData) => {
            // Sort by trading volume (most active first)
            return parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume);
          });

        if (isMounted) {
          setSymbols(mergedData);
        }
      } catch (err) {
        if (isMounted && err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
          console.error('Error fetching Aster symbols:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSymbols();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [tab]);

  // Filter symbols based on search and category
  const filteredSymbols = useCallback(() => {
    let filtered = [...symbols];

    // Filter by category
    if (category !== 'All markets' && CATEGORIES[category as keyof typeof CATEGORIES].length > 0) {
      const categoryAssets = CATEGORIES[category as keyof typeof CATEGORIES];
      filtered = filtered.filter(s => 
        categoryAssets.some(asset => s.symbol.includes(asset))
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.symbol.toLowerCase().includes(query) ||
        s.baseAsset.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [symbols, searchQuery, category]);

  return {
    symbols,
    filteredSymbols: filteredSymbols(),
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