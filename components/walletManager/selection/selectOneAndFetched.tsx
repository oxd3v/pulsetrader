import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
// Types
import { ORDER_TYPE, OrderTokenType } from "@/type/order";
import { WalletConfig } from "@/type/common";
// UI Components
import { HiWallet } from "react-icons/hi2";
import {
  FiX,
  FiCheck,
  FiCopy,
  FiAlertCircle,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import { FaLock, FaGasPump, FaCoins } from "react-icons/fa";
import { MdOutlineRefresh } from "react-icons/md";
import { TbGridDots } from "react-icons/tb";
import toast from "react-hot-toast";
import InfoTooltip from "@/components/tradeBox/TradeBoxCommon/BoxTooltip";

// Internal components
import {
  formateAmountWithFixedDecimals,
  safeParseUnits,
} from "@/utility/handy";
import { Tokens } from "@/constants/common/tokens";

// Balance operations
import {
  getWalletBalance,
  getWalletTokenBalance,
} from "@/lib/blockchain/balance";
import { spotNetworkFee } from "@/lib/blockchain/gas";
import {
  getOrderCosts,
  calculateExistingLockedFunds,
} from "@/lib/fund/fundHelper";
import { ZeroAddress } from "ethers";

import { mockWallets } from "@/constants/common/mock";
import { chains } from "@/constants/common/chain";

// Define missing types
type Order = ORDER_TYPE & {
  sl: number;
  _id?: string;
  wallet?: WalletConfig;
};

// Refactored Interface: Separated static fetched data from dynamic estimates
interface WalletData {
  config: WalletConfig;
  totalActiveOrders: number;
  lockedFundBalance: bigint; // From EXISTING orders
  totalCollateralPending: bigint; // From EXISTING orders
  balance: bigint;
  tokenBalance: bigint;
}

interface WalletEstimates {
  estAmount: bigint; // From NEW orders
  estCost: bigint; // From NEW orders
}

interface WalletSelectorProps {
  category: string;
  availableWallets: WalletConfig[];
  orders: Order[];
  gridsByWallet: Record<number, WalletConfig>;
  setGridsByWallet: (gridsByWallet: Record<number, WalletConfig>) => void;
  areWalletsReady: boolean;
  setWalletsReady: (ready: boolean) => void;
  chainId: number;
  collateralToken: OrderTokenType;
  selectedStrategy: any;
  estOrders: Order[];
  user: any;
}

// ============================================
// OPTIMIZED WALLET CARD COMPONENT
// ============================================

interface WalletCardProps {
  wallet: WalletConfig;                       // Always available
  walletData?: WalletData;                     // May be undefined if not loaded
  isLoading?: boolean;                          // True when fetching this wallet
  isSelected: boolean;
  onSelect?: (wallet: WalletConfig) => void | Promise<void>;
  onRemove: (wallet: WalletConfig) => void;
  collateralToken: OrderTokenType;
  estOrders: Order[];
  selectedGrids: number[];
  selectGrid?: (wallet: WalletConfig, order: Order) => void;
  chainId: number;
  estimates?: WalletEstimates;                  // Passed only for selected wallets
}

const WalletCard = React.memo(
  ({
    wallet,
    walletData,
    isLoading,
    isSelected,
    onSelect,
    onRemove,
    collateralToken,
    estOrders,
    selectedGrids,
    selectGrid,
    chainId,
    estimates = { estAmount: BigInt(0), estCost: BigInt(0) },
  }: WalletCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Derived state for validation (only if data is loaded)
    const {
      availableBalance,
      availableTokens,
      hasInsufficientBalance,
      hasInsufficientTokens,
    } = useMemo(() => {
      if (!walletData) {
        return {
          availableBalance: BigInt(0),
          availableTokens: BigInt(0),
          hasInsufficientBalance: false,
          hasInsufficientTokens: false,
        };
      }
      const availableBalance =
        walletData.balance - walletData.lockedFundBalance;
      const availableTokens =
        walletData.tokenBalance - walletData.totalCollateralPending;

      const hasInsufficientBalance =
        availableBalance < (estimates.estCost || BigInt(0));
      const hasInsufficientTokens =
        availableTokens < (estimates.estAmount || BigInt(0));

      return {
        availableBalance,
        availableTokens,
        hasInsufficientBalance,
        hasInsufficientTokens,
      };
    }, [walletData, estimates]);

    const handleSelectWallet = useCallback(async () => {
      if (onSelect) await onSelect(wallet);
    }, [onSelect, wallet]);

    const handleRemoveWallet = useCallback(() => {
      onRemove(wallet);
    }, [onRemove, wallet]);

    const handleCopy = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(wallet.address);
        toast.success("Address copied!");
      },
      [wallet.address],
    );

    const handleToggleExpand = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded((prev) => !prev);
    }, []);

    // Memoize native token info
    const nativeToken: any = useMemo(() => {
      return (
        Object.values(Tokens[chainId]).find(
          (token: any) => token.address === ZeroAddress,
        ) || Tokens[chainId][ZeroAddress]
      );
    }, [chainId]);

    const formatBalance = useCallback((balance: bigint, decimals: number) => {
      return formateAmountWithFixedDecimals(balance, decimals, 4);
    }, []);

    // Loading skeleton
    if (isLoading) {
      return (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
            </div>
          </div>
        </div>
      );
    }

    // Minimal view when data not yet loaded (available wallet list)
    if (!walletData) {
      return (
        <div
          className={`rounded-lg border transition-all ${
            isSelected
              ? "border-blue-500 bg-blue-50/30 dark:bg-blue-900/20"
              : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
          }`}
        >
          <div
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={!isSelected ? handleSelectWallet : undefined}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={`p-1.5 rounded ${
                  isSelected
                    ? "bg-blue-100 dark:bg-blue-900"
                    : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                <HiWallet
                  className={`w-4 h-4 ${
                    isSelected
                      ? "text-blue-600 dark:text-blue-300"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <FiCopy className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {!isSelected && (
              <button
                onClick={handleSelectWallet}
                className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
              >
                <FiCheck className="w-4 h-4 text-blue-500" />
              </button>
            )}
          </div>
        </div>
      );
    }

    // Full view with data
    return (
      <div
        className={`rounded-lg border transition-all ${
          isSelected
            ? "border-blue-500 bg-blue-50/30 dark:bg-blue-900/20"
            : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
        } ${
          (hasInsufficientBalance || hasInsufficientTokens) && isSelected
            ? "border-red-300 dark:border-red-500"
            : ""
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-3 cursor-pointer ${
            !isSelected && "hover:bg-gray-50 dark:hover:bg-gray-800"
          }`}
          onClick={!isSelected ? handleSelectWallet : undefined}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`p-1.5 rounded ${
                isSelected
                  ? "bg-blue-100 dark:bg-blue-900"
                  : "bg-gray-100 dark:bg-gray-800"
              }`}
            >
              <HiWallet
                className={`w-4 h-4 ${
                  isSelected
                    ? "text-blue-600 dark:text-blue-300"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <FiCopy className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              {walletData.totalActiveOrders > 0 && (
                <span className="inline-block px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 mt-1">
                  {walletData.totalActiveOrders} active
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSelected ? (
              <>
                <button
                  onClick={handleRemoveWallet}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                >
                  <FiX className="w-4 h-4 text-red-500" />
                </button>
                <button
                  onClick={handleToggleExpand}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {isExpanded ? (
                    <FiChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <FiChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={handleSelectWallet}
                className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
              >
                <FiCheck className="w-4 h-4 text-blue-500" />
              </button>
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isSelected && isExpanded && (
          <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            {/* Balance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {/* Native Token Balance */}
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <img
                      src={nativeToken.imageUrl}
                      className="w-5 h-5 rounded-full"
                      alt={nativeToken.symbol}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {nativeToken.symbol}
                    </span>
                  </div>
                  <FaGasPump className="w-4 h-4 text-gray-400" />
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Total Balance
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatBalance(walletData.balance, nativeToken.decimals)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <FaLock className="w-3 h-3 text-red-400" />
                      Locked Balance
                    </div>
                    <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {formatBalance(
                        walletData.lockedFundBalance,
                        nativeToken.decimals,
                      )}
                    </div>
                  </div>

                  <div
                    className={`p-2 rounded ${
                      hasInsufficientBalance
                        ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                        : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Est. Gas (New)
                      </span>
                      <InfoTooltip
                        id="Est_networkFee"
                        content={`Calculate network tx fee with buffer.`}
                      />
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatBalance(estimates.estCost, nativeToken.decimals)}
                    </div>
                    {hasInsufficientBalance && (
                      <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                        <FiAlertCircle className="w-3 h-3" />
                        <span>Insufficient for gas</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Collateral Token Balance */}
              {collateralToken.address !== ZeroAddress && (
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={collateralToken.imageUrl}
                        className="w-5 h-5 rounded-full"
                        alt={collateralToken.symbol}
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {collateralToken.symbol}
                      </span>
                    </div>
                    <FaCoins className="w-4 h-4 text-gray-400" />
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Total Balance
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatBalance(
                          walletData.tokenBalance,
                          collateralToken.decimals,
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                        <FaLock className="w-3 h-3 text-red-400" />
                        Locked Balance
                      </div>
                      <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {formatBalance(
                          walletData.totalCollateralPending,
                          collateralToken.decimals,
                        )}
                      </div>
                    </div>

                    <div
                      className={`p-2 rounded ${
                        hasInsufficientTokens
                          ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                          : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          Est. Amount (New)
                        </span>
                        <InfoTooltip
                          id="Est_collateralAmount"
                          content={`Calculate collateral amount with trade fee.`}
                        />
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatBalance(
                          estimates.estAmount,
                          collateralToken.decimals,
                        )}
                      </div>
                      {hasInsufficientTokens && (
                        <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                          <FiAlertCircle className="w-3 h-3" />
                          <span>Insufficient tokens</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Grid Selection */}
            {estOrders.length > 0 && selectedGrids.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TbGridDots className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Selected Grids
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {selectedGrids.length}/{estOrders.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {estOrders.map((order, index) => (
                    <button
                      key={order._id || index}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectGrid && !selectedGrids.includes(order.sl)) {
                          selectGrid(wallet, order);
                        }
                      }}
                      className={`
                        px-2 py-1 text-xs rounded-lg transition-all
                        ${
                          selectedGrids.includes(order.sl)
                            ? "bg-blue-500 text-white shadow-sm"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }
                      `}
                    >
                      Grid #{order.sl}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Warning indicator when collapsed */}
        {isSelected &&
          !isExpanded &&
          (hasInsufficientBalance || hasInsufficientTokens) && (
            <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-2">
              <div className="flex items-center gap-2 text-xs text-red-500">
                <FiAlertCircle className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  Insufficient {hasInsufficientBalance ? "gas" : ""}
                  {hasInsufficientBalance && hasInsufficientTokens ? " and " : ""}
                  {hasInsufficientTokens ? "tokens" : ""}
                </span>
              </div>
            </div>
          )}
      </div>
    );
  },
);

WalletCard.displayName = "WalletCard";

// ============================================
// OPTIMIZED WALLET SELECTOR COMPONENT
// ============================================

const WalletSelector = ({
  category,
  availableWallets,
  orders,
  gridsByWallet,
  setGridsByWallet,
  areWalletsReady,
  setWalletsReady,
  chainId,
  collateralToken,
  selectedStrategy,
  estOrders,
  user,
}: WalletSelectorProps) => {
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [selectedWallets, setSelectedWallets] = useState<WalletConfig[]>([]);

  // Store fetched data (balances, locks) per wallet
  const [walletDataMap, setWalletDataMap] = useState<Record<string, WalletData>>({});
  const [loadingWallets, setLoadingWallets] = useState<Set<string>>(new Set());

  const [gasFee, setGasFee] = useState<bigint>(BigInt(0));
  const abortControllerRef = useRef<AbortController | null>(null);

  // Single wallet strategies check
  const isSingleWalletStrategy = useMemo(() => {
    const singleWalletStrategies = ["limit", "scalp", "algo"];
    return singleWalletStrategies.includes(selectedStrategy?.id);
  }, [selectedStrategy?.id]);

  // Filter available wallets based on chain ID and normalize ID
  const filteredAvailableWallets = useMemo(() => {
    return availableWallets
      ?.filter((wallet) => {
        const network = (wallet as any).network;
        if (chainId === chains.Solana) {
          return network === "SVM";
        }
        return network === "EVM" || !network;
      })
      .map((w: any) => ({
        ...w,
        _id: w._id,
      }));
  }, [availableWallets, chainId]);

  // Fetch Gas Fee
  useEffect(() => {
    const fetchGasFee = async () => {
      try {
        const fee = await spotNetworkFee(chainId);
        setGasFee(fee);
      } catch (error) {
        setGasFee(BigInt(0));
      }
    };
    fetchGasFee();
  }, [chainId]);

  // Pre-group orders by wallet
  const ordersByWallet = useMemo(() => {
    const map = new Map<string, ORDER_TYPE[]>();
    orders.forEach((order) => {
      if (order.wallet) {
        const walletId = order.wallet.toString();
        if (!map.has(walletId)) map.set(walletId, []);
        map.get(walletId)!.push(order);
      }
    });
    return map;
  }, [orders]);

  // Per-wallet data fetcher - now returns the data
const fetchSingleWalletData = useCallback(
  async (wallet: WalletConfig): Promise<WalletData | undefined> => {
    const address = wallet.address.toLowerCase();
    // Avoid duplicate fetches
    if (walletDataMap[address] || loadingWallets.has(wallet._id)) {
      return walletDataMap[address];
    }

    setLoadingWallets((prev) => new Set(prev).add(wallet._id));

    try {
      const walletOrders = ordersByWallet.get(wallet._id) || [];

      const lockedFunds = calculateExistingLockedFunds(
        walletOrders,
        wallet._id,
        collateralToken.address,
        gasFee,
        user,
      );

      const [balance, tokenBalance] = await Promise.all([
        getWalletBalance({ walletAddress: wallet.address, chainId }),
        collateralToken.address !== ZeroAddress
          ? getWalletTokenBalance({
              walletAddress: wallet.address,
              tokenAddress: collateralToken.address,
              chainId,
            })
          : Promise.resolve(BigInt(0)),
      ]);

      const newData: WalletData = {
        config: wallet,
        ...lockedFunds,
        balance:
          typeof balance === "string"
            ? safeParseUnits(balance, 18)
            : BigInt(balance),
        tokenBalance:
          typeof tokenBalance === "string"
            ? safeParseUnits(tokenBalance, collateralToken.decimals)
            : BigInt(tokenBalance),
      };

      // Update state for caching
      setWalletDataMap((prev) => ({
        ...prev,
        [address]: newData,
      }));

      return newData;
    } catch (error) {
      toast.error(`Failed to load data for ${wallet.address.slice(0, 6)}...`);
      return undefined;
    } finally {
      setLoadingWallets((prev) => {
        const next = new Set(prev);
        next.delete(wallet._id);
        return next;
      });
    }
  },
  [walletDataMap, ordersByWallet, collateralToken, gasFee, chainId, user],
);

  // Centralized Estimation Logic (Memoized)
  const estimatesByWallet = useMemo(() => {
    const estimates: Record<string, WalletEstimates> = {};

    // Initialize zero estimates for all known wallets
    Object.keys(walletDataMap).forEach((address) => {
      estimates[address] = { estAmount: BigInt(0), estCost: BigInt(0) };
    });

    // Iterate through assigned grids and sum up costs
    Object.entries(gridsByWallet).forEach(([gridSl, walletConfig]) => {
      const order = estOrders.find((o) => o.sl === Number(gridSl));
      if (order && walletConfig && walletConfig.address) {
        const address = walletConfig.address.toLowerCase();
        if (!estimates[address])
          estimates[address] = { estAmount: BigInt(0), estCost: BigInt(0) };

        const costs = getOrderCosts({
          order,
          collateralTokenAddress: collateralToken.address,
          gasFee,
          user,
        });

        if (collateralToken.address !== ZeroAddress) {
          estimates[address].estAmount += costs.orderAmount;
          estimates[address].estCost += costs.orderGasFee;
        } else {
          estimates[address].estCost += costs.orderGasFee + costs.orderAmount;
        }
      }
    });

    return estimates;
  }, [gridsByWallet, estOrders, walletDataMap, collateralToken.address, gasFee, user]);

  // Readiness Check
  useEffect(() => {
    if (!selectedWallets.length || !estOrders.length) {
      setWalletsReady(false);
      return;
    }

    const isReady = selectedWallets.every((wallet) => {
      const address = wallet.address.toLowerCase();
      const data = walletDataMap[address];
      if (!data) return false; // data not yet loaded

      const estimate = estimatesByWallet[address];
      if (!estimate) return false;

      const availableNative = data.balance - data.lockedFundBalance;
      const availableTokens = data.tokenBalance - data.totalCollateralPending;

      return availableNative >= estimate.estCost && availableTokens >= estimate.estAmount;
    });

    setWalletsReady(isReady);
  }, [selectedWallets, walletDataMap, estimatesByWallet, estOrders.length, setWalletsReady]);

  // Distribute orders to wallets
  const distributeOrders = useCallback(
    (wallets: WalletConfig[]) => {
      if (!wallets.length || !estOrders.length) return;

      const newGridsByWallet: Record<number, WalletConfig> = {};

      if (isSingleWalletStrategy && wallets.length > 0) {
        estOrders.forEach((order) => {
          newGridsByWallet[order.sl] = wallets[0];
        });
      } else {
        estOrders.forEach((order, index) => {
          const walletIndex = index % wallets.length;
          newGridsByWallet[order.sl] = wallets[walletIndex];
        });
      }

      setGridsByWallet(newGridsByWallet);
    },
    [estOrders, isSingleWalletStrategy, setGridsByWallet],
  );

  // Handle wallet selection
const handleSelectWallet = useCallback(
  async (wallet: WalletConfig) => {
    const address = wallet.address.toLowerCase();
    let data:any = walletDataMap[address];

    // If no data, fetch it first and use the returned data
    if (!data) {
      data = await fetchSingleWalletData(wallet);
    }

    if (!data) {
      toast.error("Failed to load wallet data");
      return;
    }

    // Validate single-wallet strategy limit
    if (isSingleWalletStrategy && selectedWallets.length >= 1) {
      toast.error("Only one wallet can be selected for this strategy");
      return;
    }

    // Check if we already have enough wallets
    if (estOrders.length <= selectedWallets.length) {
      toast.error("Already have enough wallets for the number of orders");
      return;
    }

    // Check sufficiency
    const availableNative = data.balance - data.lockedFundBalance;
    const availableTokens = data.tokenBalance - data.totalCollateralPending;
    const estimate = estimatesByWallet[address] || { estCost: BigInt(0), estAmount: BigInt(0) };

    if (availableNative < estimate.estCost || availableTokens < estimate.estAmount) {
      toast.error("Insufficient funds in this wallet");
      return;
    }

    // Add to selected
    const newSelected = [...selectedWallets, wallet];
    setSelectedWallets(newSelected);
    distributeOrders(newSelected);
  },
  [
    walletDataMap,
    fetchSingleWalletData,
    isSingleWalletStrategy,
    selectedWallets.length,
    estOrders.length,
    estimatesByWallet,
    distributeOrders,
  ],
);

  const handleRemoveWallet = useCallback(
    (wallet: WalletConfig) => {
      const newSelectedWallets = selectedWallets.filter(
        (w) => w._id !== wallet._id,
      );
      setSelectedWallets(newSelectedWallets);

      const newGridsByWallet = { ...gridsByWallet };
      Object.keys(newGridsByWallet).forEach((key) => {
        if (newGridsByWallet[Number(key)]?._id === wallet._id) {
          delete newGridsByWallet[Number(key)];
        }
      });
      setGridsByWallet(newGridsByWallet);
      distributeOrders(newSelectedWallets);
    },
    [selectedWallets, gridsByWallet, distributeOrders, setGridsByWallet],
  );

  const handleGridForWallet = useCallback(
    (wallet: WalletConfig, order: Order) => {
      if (selectedWallets.length <= 1) return;
      if (gridsByWallet[order.sl]?._id === wallet._id) return;

      setGridsByWallet({
        ...gridsByWallet,
        [order.sl]: wallet,
      });
    },
    [gridsByWallet, selectedWallets.length, setGridsByWallet],
  );

  const refreshSelectedWallets = useCallback(async () => {
  for (const wallet of selectedWallets) {
    await fetchSingleWalletData(wallet);
  }
}, [selectedWallets, fetchSingleWalletData]);

  // Available wallets list (includes wallets without data)
  const availableWalletsList = useMemo(() => {
    return filteredAvailableWallets
      .filter((wallet) => !selectedWallets.some((sw) => sw._id === wallet._id))
      .map((wallet) => ({
        wallet,
        data: walletDataMap[wallet.address.toLowerCase()],
      }));
  }, [filteredAvailableWallets, selectedWallets, walletDataMap]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Select Wallets
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {selectedWallets.length > 0
              ? `${selectedWallets.length} wallet${selectedWallets.length > 1 ? "s" : ""} selected`
              : `Choose wallets${isSingleWalletStrategy ? " (Single wallet only)" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedWallets.length > 0 && areWalletsReady && (
            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Ready
            </span>
          )}
          <button
            onClick={refreshSelectedWallets}
            disabled={loadingWallets.size > 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <MdOutlineRefresh
              className={`w-3 h-3 ${loadingWallets.size > 0 ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Selected Wallets Section */}
      {selectedWallets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Selected ({selectedWallets.length})
            </h4>
            <button
              onClick={() => {
                if (selectedWallets.length > 0) {
                  setSelectedWallets([]);
                  setGridsByWallet({});
                  toast.success("All wallets deselected");
                }
              }}
              className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2">
            {selectedWallets.map((wallet) => {
              const address = wallet.address.toLowerCase();
              const data = walletDataMap[address];
              const estimates = estimatesByWallet[address] || {
                estCost: BigInt(0),
                estAmount: BigInt(0),
              };

              // Calculate which grids belong to this wallet
              const walletGrids = Object.entries(gridsByWallet)
                .filter(([_, w]) => w._id === wallet._id)
                .map(([sl]) => Number(sl));

              return (
                <WalletCard
                  key={wallet._id}
                  wallet={wallet}
                  walletData={data}
                  isLoading={loadingWallets.has(wallet._id)}
                  isSelected={true}
                  onRemove={handleRemoveWallet}
                  collateralToken={collateralToken}
                  estOrders={estOrders}
                  selectedGrids={walletGrids}
                  selectGrid={handleGridForWallet}
                  chainId={chainId}
                  estimates={estimates}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Add Wallets Toggle */}
      <button
        onClick={() => setShowWalletSelector(!showWalletSelector)}
        className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed transition-all text-sm ${
          showWalletSelector
            ? "border-red-300 bg-red-50/30 dark:bg-red-900/10 text-red-600 dark:text-red-400"
            : "border-blue-300 hover:border-blue-400 bg-blue-50/30 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        }`}
      >
        {showWalletSelector ? (
          <>
            <FiX className="w-4 h-4" />
            Done Selecting
          </>
        ) : (
          <>
            <HiWallet className="w-4 h-4" />
            Add Wallets
            {availableWalletsList.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                {availableWalletsList.length} available
              </span>
            )}
          </>
        )}
      </button>

      {/* Available Wallets List */}
      {showWalletSelector && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Available Wallets
            </h4>
            <span className="text-xs text-gray-500">Click to select</span>
          </div>

          <div className="space-y-2">
            {availableWalletsList.map(({ wallet, data }) => (
              <WalletCard
                key={wallet._id}
                wallet={wallet}
                walletData={data}
                isLoading={loadingWallets.has(wallet._id)}
                isSelected={false}
                onSelect={handleSelectWallet}
                onRemove={handleRemoveWallet}
                collateralToken={collateralToken}
                estOrders={estOrders}
                selectedGrids={[]}
                chainId={chainId}
              />
            ))}
            {availableWalletsList.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-4">
                No available wallets
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletSelector;