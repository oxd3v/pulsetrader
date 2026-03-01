'use client';
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AiOutlineSearch, AiOutlineStar, AiFillStar, AiOutlineClose } from 'react-icons/ai';
import { useAsterSymbols } from '@/hooks/useAssertSymbol';

interface AssetSelectProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: string) => void;
  currentSymbol?: string;
}

const formatNumber = (num: string | number, decimals: number = 2): string => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0.00';
  
  if (n >= 1000000000) {
    return (n / 1000000000).toFixed(decimals) + 'B';
  }
  if (n >= 1000000) {
    return (n / 1000000).toFixed(decimals) + 'M';
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(decimals) + 'K';
  }
  return n.toFixed(decimals);
};

const getCryptoCurrency = (symbol: string): string => {
  // Extract base asset from symbol (e.g., "BTCUSDT" -> "BTC")
  return symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '');
};

const getCryptoIcon = (symbol: string): string => {
  const asset = getCryptoCurrency(symbol);
  const iconMap: Record<string, string> = {
    'BTC': '₿',
    'ETH': 'Ξ',
    'BNB': '⬡',
    'SOL': '◎',
    'XRP': '✕',
    'ADA': '₳',
    'DOGE': '🐕',
    'HYPE': '🚀',
    'ASTER': '⭐',
  };
  return iconMap[asset] || '●';
};

const CATEGORIES = [
  'All markets',
  'Top',
  'New',
  'Meme',
  'Stocks',
  'AI',
  'Pre-launch',
  'Metals',
];

const AssetSelect: React.FC<AssetSelectProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  currentSymbol = '',
}) => {
  const {
    filteredSymbols,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    category,
    setCategory,
    tab,
    setTab,
  } = useAsterSymbols();

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('asterdex_favorites');
    if (saved) {
      setFavorites(new Set(JSON.parse(saved)));
    }
  }, []);

  // Save favorites to localStorage
  useEffect(() => {
    localStorage.setItem('asterdex_favorites', JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  const toggleFavorite = (symbol: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(symbol)) {
      newFavorites.delete(symbol);
    } else {
      newFavorites.add(symbol);
    }
    setFavorites(newFavorites);
  };

  const handleSelectSymbol = (symbol: string) => {
    onSelectSymbol(symbol);
    onClose();
  };

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const displaySymbols =
    category === 'Favorites'
      ? filteredSymbols.filter((s:any) => favorites.has(s.symbol))
      : filteredSymbols;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="relative bg-gray-950 rounded-lg border border-gray-800 w-full max-w-6xl mx-4 max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gray-950 border-b border-gray-800 p-4 z-40">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Select Trading Pair</h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-900 rounded-lg transition-colors"
                >
                  <AiOutlineClose className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <AiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search symbol or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 focus:ring-1 focus:ring-gray-700"
                />
              </div>

              {/* Tabs */}
              <div className="flex gap-4 mb-4 border-b border-gray-800 pb-4">
                <button
                  onClick={() => setTab('Futures')}
                  className={`font-medium transition-colors ${
                    tab === 'Futures'
                      ? 'text-white border-b-2 border-blue-500 -mb-4'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Futures
                </button>
                <button
                  onClick={() => setTab('Spot')}
                  className={`font-medium transition-colors ${
                    tab === 'Spot'
                      ? 'text-white border-b-2 border-blue-500 -mb-4'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Spot
                </button>
              </div>

              {/* Category Filters */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {['Favorites', ...CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap transition-colors ${
                      category === cat
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-900 text-gray-400 hover:text-gray-300 border border-gray-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-400">Loading symbols...</div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-red-400">{error}</div>
                </div>
              ) : displaySymbols.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-400">No symbols found</div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
                    <tr className="text-left text-gray-400 text-xs font-medium uppercase">
                      <th className="w-12 px-4 py-3"></th>
                      <th className="px-4 py-3 min-w-[150px]">Symbols</th>
                      <th className="px-4 py-3 text-right min-w-[120px]">Last price</th>
                      <th className="px-4 py-3 text-right min-w-[100px]">24h change</th>
                      <th className="px-4 py-3 text-right min-w-[100px]">Funding Rate</th>
                      <th className="px-4 py-3 text-right min-w-[120px]">Volume</th>
                      <th className="px-4 py-3 text-right min-w-[120px]">Open Interest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displaySymbols.map((symbol:any) => {
                      const change = parseFloat(symbol.priceChangePercent);
                      const isFavorite = favorites.has(symbol.symbol);
                      const isSelected = currentSymbol === symbol.symbol;

                      return (
                        <motion.tr
                          key={symbol.symbol}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`border-b border-gray-800 hover:bg-gray-900 cursor-pointer transition-colors ${
                            isSelected ? 'bg-gray-900' : ''
                          }`}
                          onClick={() => handleSelectSymbol(symbol.symbol)}
                        >
                          {/* Favorite Toggle */}
                          <td
                            className="w-12 px-4 py-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(symbol.symbol);
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

                          {/* Symbol */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-lg font-bold">
                                {getCryptoIcon(symbol.symbol)}
                              </div>
                              <div>
                                <div className="font-semibold text-white">
                                  {symbol.symbol}
                                </div>
                                <div className="text-xs text-gray-500">
                                  200x
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Last Price */}
                          <td className="px-4 py-3 text-right font-mono text-white">
                            {parseFloat(symbol.lastPrice).toFixed(4)}
                          </td>

                          {/* 24h Change */}
                          <td className={`px-4 py-3 text-right font-mono font-semibold ${
                            change >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                          </td>

                          {/* Funding Rate */}
                          <td className="px-4 py-3 text-right font-mono text-gray-300">
                            {(parseFloat(symbol.fundingRate || '0') * 100).toFixed(4)}%
                          </td>

                          {/* Volume */}
                          <td className="px-4 py-3 text-right font-mono text-gray-300">
                            ${formatNumber(symbol.quoteVolume, 2)}
                          </td>

                          {/* Open Interest */}
                          <td className="px-4 py-3 text-right font-mono text-gray-300">
                            ${formatNumber(symbol.quoteVolume * 0.5, 2)}
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
      )}
    </AnimatePresence>
  );
};

export default AssetSelect;