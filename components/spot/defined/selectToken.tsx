"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  memo,
} from "react";
import Link from "next/link";
// constants
import { chainConfig } from "@/constants/common/chain";
import { userDeafultTokens } from "@/constants/common/tokens";

// lib
import { fetchCodexFilterTokens } from "@/lib/oracle/codex";
import { displayNumber } from "@/utility/displayPrice";
import { formateNumberInUnit } from "@/utility/handy";
// animations
import { motion, AnimatePresence } from "framer-motion";

// icons
import { FiSearch, FiX, FiPlus, FiInfo, FiBookmark } from "react-icons/fi";
import { BiCoinStack } from "react-icons/bi";
import { BsArrowUpRight } from "react-icons/bs";

// store
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import { useUserAuth } from "@/hooks/useAuth";

// --- Types ---
interface TokenSelectionParams {
  isOpen: boolean;
  onClose: () => void;
  selectedToken: string;
  setSelectedToken: (token: string) => void;
  addToken: ({ chainId, token }: { chainId: number; token: string }) => void;
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

// --- Sub-Component: TokenRow (Optimized for Rendering) ---
const TokenRow = memo(
  ({
    tokenInfo,
    isSelected,
    isAlreadyAdded,
    onSelect,
    onAdd,
  }: {
    tokenInfo: TokenInfo;
    isSelected: boolean;
    isAlreadyAdded: boolean;
    onSelect: (address: string) => void;
    onAdd:  (address: string) => void;
  }) => {
    const [isLoading,setIsLoading] = useState(false)
    const { priceUSD, liquidity, marketCap } = tokenInfo;
    const imageSrc = tokenInfo.token.info?.imageSmallUrl || "/tokenLogo.png";
    const symbol =
      tokenInfo.token.info?.symbol || tokenInfo.token.symbol || "Unknown";

    const handleAddToken = async ()=>{
      setIsLoading(true);
      try{
        let res:any = await onAdd(tokenInfo.token.address)
        if(res.success){
          isAlreadyAdded = true;
          onSelect(tokenInfo.token.address);
        }
      }catch(err){

      }finally{
        setIsLoading(false)
      }
      
    }

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full flex items-center p-3 xl:p-4 rounded-xl hover:bg-white dark:hover:bg-gray-800 hover:shadow-lg transition-all duration-200 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 ${
          isLoading ? "opacity-50 pointer-events-none" :isSelected
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
              ${displayNumber(Number(priceUSD) || 0)}
            </span>
            <span className="text-gray-500 dark:text-gray-500">
              L: {formateNumberInUnit(Number(liquidity) || 0, 2)}
            </span>
            <span className="text-gray-500 dark:text-gray-500">
              MC: {formateNumberInUnit(Number(marketCap) || 0, 2)}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0 flex gap-2 items-center ml-2">
          {!isAlreadyAdded ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddToken();
              }}
              className="p-2 text-blue-500 hover:text-white hover:bg-blue-500 rounded-lg transition-colors"
              title="Add to Watchlist"
            >
              <FiPlus className="w-5 h-5" />
            </button>
          ) : (<button
              
              className="p-2 text-blue-500 hover:text-white hover:bg-blue-500 rounded-lg transition-colors"
              title="Add to Watchlist"
            >
              <FiBookmark className="w-5 h-5" />
            </button>)}
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
  },
);

TokenRow.displayName = "TokenRow";

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
    })),
  );

  const { addToken } = useUserAuth()

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filteredTokens, setFilteredTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. Memoize already added tokens (User Watchlist)
  // Fix: Ensure we fallback to chain defaults correctly if available
  const alreadyAddedTokens = useMemo(() => {
    let userTokensByNetwork = [];
    console.log(user.assetes)
    if (isConnected && user?.assetes?.length > 0) {
      userTokensByNetwork = user.assetes
        .filter((token: string) => {
          const parts = token.split(":");
          // Safety check if token string is malformed
          return parts.length > 1 && parts[1] === String(chainId);
        })
        .map((token: string) => token);
    }

    const defaultTokens = userDeafultTokens
      .filter((token: string) => {
        const parts = token.split(":");
        // Safety check if token string is malformed
        return parts.length > 1 && parts[1] === String(chainId);
      })
      .map((token: string) => token);

    return Array.from(new Set([...defaultTokens, ...userTokensByNetwork]));
  }, [isConnected, user, chainId]);

  // 2. Debounce Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 400); // Increased slightly to reduce API spam

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 3. Fetch Logic
  const fetchTokenInfo = useCallback(async () => {
    if (!chainId || !isOpen) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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

      if (debouncedSearchTerm) {
        // Case A: Search Active
        variables.phrase = debouncedSearchTerm;
      } else if (alreadyAddedTokens.length > 0) {
        // Case B: No Search, Show Watchlist/Defaults
        // NOTE: If you want to show Top 100 AND Watchlist, you might need two queries or logic change.
        // Current logic: Show specifically the user's tokens if they exist.
        // If list is small, maybe we fallback to top tokens?
        variables.tokens = alreadyAddedTokens;
      }
      // Case C: No Search, No Watchlist -> Variables remains default (Top 100 by Volume)

      const tokenInfos = await fetchCodexFilterTokens({ variables });

      // Check if aborted before setting state
      if (!abortControllerRef.current?.signal.aborted) {
        if (tokenInfos) {
          setFilteredTokens(tokenInfos);
        } else {
          setFilteredTokens([]); // Graceful fallback
        }
      }
    } catch (err: any) {
      if (
        err.name !== "AbortError" &&
        !abortControllerRef.current?.signal.aborted
      ) {
        console.error("Token fetch error:", err);
        setError("Unable to load tokens.");
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [chainId, isOpen, debouncedSearchTerm, alreadyAddedTokens]);

  // 4. Trigger Fetch
  useEffect(() => {
    if (isOpen) {
      fetchTokenInfo();
    }

    // Cleanup on unmount or close
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchTokenInfo, isOpen]);

  // 5. Cleanup State on Close
  useEffect(() => {
    if (!isOpen) {
      // Small delay to allow exit animation to finish before clearing data (optional)
      const t = setTimeout(() => {
        setSearchTerm("");
        setDebouncedSearchTerm("");
        setFilteredTokens([]);
        setLoading(false);
        setError(null);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Handlers
  const handleTokenSelect = useCallback(
    (tokenAddress: string) => {
      setSelectedToken(tokenAddress);
      onClose();
    },
    [setSelectedToken, onClose],
  );

  const handleAddToken = useCallback(
    async (tokenAddress: string) => {
      if (chainId) {
        await addToken({tokenAddress, chainId});
      }
    },
    [addToken, chainId],
  );

  // Render Helpers
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
            {debouncedSearchTerm
              ? `No tokens found for "${debouncedSearchTerm}"`
              : "No tokens available."}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-2 px-4 pb-4">
        {filteredTokens
          .filter((t: any) => t.token.networkId == chainId)
          .map((tokenInfo) => (
            <TokenRow
              key={tokenInfo.token.address}
              tokenInfo={tokenInfo}
              isSelected={
                selectedToken.toLowerCase() ===
                tokenInfo.token.address.toLowerCase()
              }
              isAlreadyAdded={alreadyAddedTokens.map(t=>t.toLowerCase()).includes(`${tokenInfo.token.address.toLowerCase()}:${chainId}`)}
              onSelect={handleTokenSelect}
              onAdd={handleAddToken}
            />
          ))}
      </div>
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
