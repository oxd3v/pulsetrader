"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  memo,
  useDeferredValue,
} from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useShallow } from "zustand/shallow";
import { FiSearch, FiX, FiPlus, FiInfo } from "react-icons/fi";
import { BiCoinStack } from "react-icons/bi";
import { BsArrowUpRight } from "react-icons/bs";
import { IoBookmark, IoBookmarkOutline } from "react-icons/io5";
import { MdBookmarkAdded } from "react-icons/md";

import { userDeafultTokens, CollateralTokens } from "@/constants/common/tokens";
import { fetchCodexFilterTokens } from "@/lib/oracle/codex";
import { displayNumber } from "@/utility/displayPrice";
import { formateNumberInUnit } from "@/utility/handy";
import { useStore } from "@/store/useStore";
import { useUserAuth } from "@/hooks/useAuth";

// --- Types ---
interface TokenSelectionParams {
  isOpen: boolean;
  onClose: () => void;
  selectedToken: string;
  setSelectedToken: (token: string) => void;
}

interface TokenInfo {
  token: {
    address: string;
    networkId: number;
    name: string;
    symbol: string;
    info?: {
      imageSmallUrl?: string;
      symbol?: string;
    };
  };
  priceUSD: string;
  change24: string;
  liquidity: string;
  marketCap: string;
}

// --- Memoized Token Row ---
const TokenRow = memo(
  ({
    tokenInfo,
    isSelected,
    isAlreadyAdded,
    showBookmark,
    onSelect,
    onAdd,
  }: {
    tokenInfo: TokenInfo;
    isSelected: boolean;
    isAlreadyAdded: boolean;
    showBookmark: boolean;
    onSelect: (address: string) => void;
    onAdd: (address: string, add: boolean) => Promise<any>;
  }) => {
    const [isLoading, setIsLoading] = useState(false);
    const imageSrc = tokenInfo.token.info?.imageSmallUrl || "/tokenLogo.png";
    const symbol = tokenInfo.token.info?.symbol || tokenInfo.token.symbol || "Unknown";

    const handleAddToken = useCallback(async () => {
      setIsLoading(true);
      try {
        await onAdd(tokenInfo.token.address, true);
      } catch {
        // error handled in parent
      } finally {
        setIsLoading(false);
      }
    }, [tokenInfo.token.address, onAdd]);

    const handleRemoveToken = useCallback(async () => {
      setIsLoading(true);
      try {
        await onAdd(tokenInfo.token.address, false);
      } catch {
        // error handled in parent
      } finally {
        setIsLoading(false);
      }
    }, [tokenInfo.token.address, onAdd]);

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full flex items-center p-3 xl:p-4 rounded-xl hover:bg-white dark:hover:bg-gray-800 hover:shadow-lg transition-all duration-200 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 ${
          isLoading
            ? "opacity-50 pointer-events-none"
            : isSelected
            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            : ""
        }`}
      >
        <div className="relative flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-700 dark:to-gray-800 rounded-xl shadow-sm flex items-center justify-center overflow-hidden">
          <img
            src={imageSrc}
            alt={symbol}
            className="w-10 h-10 rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/tokenLogo.png";
            }}
            loading="lazy"
          />
        </div>
        <div className="ml-4 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {symbol}
            </h3>
            {isSelected && (
              <span className="flex-shrink-0 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                Selected
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs font-mono">
            <span className="flex items-center text-gray-600 dark:text-gray-400 font-medium">
              ${displayNumber(Number(tokenInfo.priceUSD) || 0)}
            </span>
            <span className="text-gray-500 dark:text-gray-500">
              L: {formateNumberInUnit(Number(tokenInfo.liquidity) || 0, 2)}
            </span>
            <span className="text-gray-500 dark:text-gray-500">
              MC: {formateNumberInUnit(Number(tokenInfo.marketCap) || 0, 2)}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 flex gap-2 items-center ml-2">
          {showBookmark && (
            <>
              {!isAlreadyAdded ? (
                <button
                  onClick={handleAddToken}
                  className="p-2 text-blue-500 hover:text-white hover:bg-blue-500 rounded-lg transition-colors"
                  title="Add to Watchlist"
                >
                  <IoBookmarkOutline className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleRemoveToken}
                  className="p-2 text-blue-500 hover:text-white hover:bg-blue-500 rounded-lg transition-colors"
                  title="Remove from Watchlist"
                >
                  <IoBookmark className="w-5 h-5" />
                </button>
              )}
            </>
          )}
          <button
            onClick={() => onSelect(tokenInfo.token.address)}
            className="px-3 py-2 text-sm border border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
          >
            <span className="hidden sm:inline">Trade</span>
            <BsArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  }
);

TokenRow.displayName = "TokenRow";

// --- Memoized Token List (to prevent re-renders of the whole list when header/footer change) ---
const TokenList = memo(
  ({
    tokens,
    selectedToken,
    chainId,
    isConnected,
    defaultTokenSet,
    userAddedTokens,
    onSelect,
    onAdd,
  }: {
    tokens: TokenInfo[];
    selectedToken: string;
    chainId: number;
    isConnected: boolean;
    defaultTokenSet: Set<string>;
    userAddedTokens: string[];
    onSelect: (address: string) => void;
    onAdd: (address: string, add: boolean) => Promise<any>;
  }) => {
    const userAddedSet = useMemo(
      () => new Set(userAddedTokens.map((t) => t.toLowerCase())),
      [userAddedTokens]
    );

    return (
      <div className="space-y-2 px-4 pb-4">
        {tokens
          .filter((t) => t.token.networkId === chainId)
          .map((tokenInfo) => {
            const tokenKey = `${tokenInfo.token.address.toLowerCase()}:${chainId}`;
            const showBookmark = isConnected && !defaultTokenSet.has(tokenKey);
            const isAdded = userAddedSet.has(tokenKey);
            const isSelected =
              selectedToken.toLowerCase() === tokenInfo.token.address.toLowerCase();

            return (
              <TokenRow
                key={tokenInfo.token.address}
                tokenInfo={tokenInfo}
                isSelected={isSelected}
                isAlreadyAdded={isAdded}
                showBookmark={showBookmark}
                onSelect={onSelect}
                onAdd={onAdd}
              />
            );
          })}
      </div>
    );
  }
);

TokenList.displayName = "TokenList";

// --- Main Component ---
const TokenSelection = ({
  isOpen,
  onClose,
  selectedToken,
  setSelectedToken,
}: TokenSelectionParams) => {
  const { chainId, user, isConnected } = useStore(
    useShallow((state: any) => ({
      chainId: state.network,
      user: state.user,
      isConnected: state.isConnected,
    }))
  );

  const { addToken } = useUserAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm); // smoother UI while typing
  const [filteredTokens, setFilteredTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoized sets
  const defaultTokenSet = useMemo(() => {
    const defaults = userDeafultTokens.map((t: string) => t.toLowerCase());
    const collateral = Object.keys(CollateralTokens[chainId] || {}).map(
      (t) => `${t.toLowerCase()}:${chainId}`
    );
    return new Set([...defaults, ...collateral]);
  }, [chainId]);

  const userAddedTokens = useMemo(() => {
    if (!isConnected || !user?.assetes) return [];
    return user.assetes
      .filter((token: string) => {
        const parts = token.split(":");
        return parts.length > 1 && parts[1] === String(chainId);
      })
      .map((token: string) => token);
  }, [isConnected, user, chainId]);

  // Fetch token info
  const fetchTokenInfo = useCallback(async () => {
    if (!chainId || !isOpen) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const variables: any = {
        filters: { network: [chainId] },
        limit: 100,
        offset: 0,
        rankings: [{ attribute: "volume24", direction: "DESC" }],
      };

      if (deferredSearch) {
        variables.phrase = deferredSearch;
      } else if (userAddedTokens.length > 0) {
        variables.tokens = userAddedTokens;
      }

      const tokenInfos = await fetchCodexFilterTokens({ variables });

      if (!abortControllerRef.current?.signal.aborted) {
        setFilteredTokens(tokenInfos || []);
      }
    } catch (err: any) {
      if (
        err.name !== "AbortError" &&
        !abortControllerRef.current?.signal.aborted
      ) {
        setError("Unable to load tokens.");
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [chainId, isOpen, deferredSearch, userAddedTokens]);

  useEffect(() => {
    if (isOpen) {
      fetchTokenInfo();
    }
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchTokenInfo, isOpen]);

  // Clean up on close
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setSearchTerm("");
        setFilteredTokens([]);
        setLoading(false);
        setError(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleTokenSelect = useCallback(
    (tokenAddress: string) => {
      setSelectedToken(tokenAddress);
      onClose();
    },
    [setSelectedToken, onClose]
  );

  const handleAddToken = useCallback(
    async (tokenAddress: string, add: boolean) => {
      if (!chainId) return;
      return await addToken({ tokenAddress, chainId, add });
    },
    [addToken, chainId]
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Finding tokens...
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col justify-center items-center h-64 space-y-4 px-6 text-center">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full">
            <FiInfo className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
          <button
            onClick={fetchTokenInfo}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      );
    }

    if (filteredTokens.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center h-64 space-y-3 px-6 text-center">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full">
            <FiSearch className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {deferredSearch
              ? `No tokens found for "${deferredSearch}"`
              : "No tokens available."}
          </p>
        </div>
      );
    }

    return (
      <TokenList
        tokens={filteredTokens}
        selectedToken={selectedToken}
        chainId={chainId}
        isConnected={isConnected}
        defaultTokenSet={defaultTokenSet}
        userAddedTokens={userAddedTokens}
        onSelect={handleTokenSelect}
        onAdd={handleAddToken}
      />
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 w-full h-full bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="w-full max-w-lg h-[80vh] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <BiCoinStack className="text-blue-500" />
              Select Token
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 pb-0">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search name, symbol, or address"
                className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* List Area */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 py-4">
            {renderContent()}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <Link
              href="/screener"
              className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
            >
              <FiPlus className="w-5 h-5" />
              Token Explorer
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TokenSelection;