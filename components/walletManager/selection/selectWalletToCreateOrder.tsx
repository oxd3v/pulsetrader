import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
import { FaLock, FaGasPump } from "react-icons/fa";
import { MdOutlineRefresh } from "react-icons/md";
import { TbGridDots } from "react-icons/tb";
import toast from "react-hot-toast";

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
import { getGasFee } from "@/lib/blockchain/gas";
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
  estCost: bigint;   // From NEW orders
}

interface WalletSelectorProps {
  category: string;
  availableWallets?: WalletConfig[];
  orders: Order[];
  gridsByWallet: Record<number, WalletConfig>;
  setGridsByWallet: (gridsByWallet: Record<number, WalletConfig>) => void;
  areWalletsReady: boolean;
  setWalletsReady: (ready: boolean) => void;
  chainId: number;
  collateralToken: OrderTokenType;
  selectedStrategy: any;
  estOrders: Order[];
}

// Helper to calculate costs for a single order
const getOrderCosts = ({
  order,
  collateralTokenAddress,
  gasFee
}: {
  order: ORDER_TYPE;
  collateralTokenAddress: string;
  gasFee: bigint;
}) => {
  const isCollateralMatch = collateralTokenAddress.toLowerCase() ===
    order.orderAsset.collateralToken.address.toLowerCase();
  const isOrderTokenMatch = collateralTokenAddress.toLowerCase() ===
    order.orderAsset.orderToken.address.toLowerCase();

  let orderAmount = BigInt(0);
  let orderGasFee = BigInt(0);

  if (isCollateralMatch && order.orderType === 'BUY') {
    orderAmount += BigInt(order.amount.orderSize);
    orderGasFee += (gasFee * BigInt(2));
  }
  if (isOrderTokenMatch && order.orderType === 'SELL') {
    orderAmount += BigInt(order.amount.tokenAmount);
    orderGasFee = gasFee;
  }

  return { orderAmount, orderGasFee };
};

// Memoized calculation of wallet locked funds (Existing Orders)
const calculateExistingLockedFunds = (
  orders: ORDER_TYPE[],
  walletId: string,
  collateralTokenAddress: string,
  gasFee: bigint
) => {
  let totalActiveOrders = 0;
  let lockedFundBalance = BigInt(0);
  let totalCollateralPending = BigInt(0);

  orders.forEach((order) => {
    if (order.wallet?._id === walletId && order.isActive) {
      const costs = getOrderCosts({
        order,
        collateralTokenAddress,
        gasFee
      });

      if (collateralTokenAddress !== ZeroAddress) {
        lockedFundBalance += costs.orderGasFee;
        totalCollateralPending += costs.orderAmount;
      } else {
        lockedFundBalance += costs.orderGasFee + costs.orderAmount;
      }
      totalActiveOrders++;
    }
  });

  return { totalActiveOrders, lockedFundBalance, totalCollateralPending };
};

// ============================================
// OPTIMIZED WALLET CARD COMPONENT
// ============================================

interface WalletCardProps {
  walletData: WalletData;
  estimates: WalletEstimates; // Received as prop, not calculated internally
  isSelected: boolean;
  onSelect?: (wallet: WalletConfig) => void;
  onRemove: (wallet: WalletConfig) => void;
  collateralToken: OrderTokenType;
  estOrders: Order[];
  selectedGrids: number[]; // Received as prop
  selectGrid?: (wallet: WalletConfig, order: Order) => void;
  chainId: number;
}

const WalletCard = React.memo(({
  walletData,
  estimates,
  isSelected,
  onSelect,
  onRemove,
  collateralToken,
  estOrders,
  selectedGrids,
  selectGrid,
  chainId,
}: WalletCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Derived state for validation
  const { availableBalance, availableTokens, hasInsufficientBalance, hasInsufficientTokens } = useMemo(() => {
    const availableBalance = walletData.balance - walletData.lockedFundBalance;
    const availableTokens = walletData.tokenBalance - walletData.totalCollateralPending;
    
    const hasInsufficientBalance = availableBalance < (estimates.estCost || BigInt(0));
    const hasInsufficientTokens = availableTokens < (estimates.estAmount || BigInt(0));

    return { availableBalance, availableTokens, hasInsufficientBalance, hasInsufficientTokens };
  }, [walletData, estimates]);

  const handleSelectWallet = useCallback(() => {
    onSelect?.(walletData.config);
  }, [onSelect, walletData.config]);

  const handleRemoveWallet = useCallback(() => {
    onRemove(walletData.config);
  }, [onRemove, walletData.config]);

  // Memoize native token info
  const nativeToken = useMemo(() => {
    return Object.values(Tokens[chainId]).find(
      (token) =>
        token.address === ZeroAddress ||
        token.symbol === "ETH" ||
        token.symbol === "SOL"
    ) || Tokens[chainId][ZeroAddress];
  }, [chainId]);

  const formatBalance = useCallback((balance: bigint, decimals: number) => {
    return formateAmountWithFixedDecimals(balance, decimals, 4);
  }, []);

  return (
    <div className={`rounded-lg border transition-all ${isSelected ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'} ${(hasInsufficientBalance || hasInsufficientTokens) && isSelected ? 'border-red-300 dark:border-red-500' : ''}`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between p-3 cursor-pointer ${!isSelected && "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
        onClick={!isSelected ? handleSelectWallet : undefined}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`p-1.5 rounded ${isSelected ? "bg-blue-100 dark:bg-blue-900" : "bg-gray-100 dark:bg-gray-800"}`}>
            <HiWallet className={`w-4 h-4 ${isSelected ? "text-blue-600 dark:text-blue-300" : "text-gray-600 dark:text-gray-300"}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {walletData.config.address.slice(0, 6)}...{walletData.config.address.slice(-4)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(walletData.config.address);
                  toast.success("Address copied!");
                }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveWallet();
                }}
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
              >
                <FiX className="w-4 h-4 text-red-500" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                {isExpanded ?
                  <FiChevronDown className="w-4 h-4 text-gray-500" /> :
                  <FiChevronRight className="w-4 h-4 text-gray-500" />
                }
              </button>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect && onSelect(walletData.config);
              }}
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
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Balance</div>
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
                    {formatBalance(walletData.lockedFundBalance, nativeToken.decimals)}
                  </div>
                </div>

                <div className={`p-2 rounded ${hasInsufficientBalance ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Est. Gas (New)</span>
                    <FaGasPump className={`w-3 h-3 ${hasInsufficientBalance ? 'text-red-500' : 'text-blue-500'}`} />
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
                  <FaLock className="w-4 h-4 text-gray-400" />
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Balance</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatBalance(walletData.tokenBalance, collateralToken.decimals)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <FaLock className="w-3 h-3 text-red-400" />
                      Locked Balance
                    </div>
                    <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {formatBalance(walletData.totalCollateralPending, collateralToken.decimals)}
                    </div>
                  </div>

                  <div className={`p-2 rounded ${hasInsufficientTokens ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Est. Amount (New)</span>
                      <FaLock className={`w-3 h-3 ${hasInsufficientTokens ? 'text-red-500' : 'text-blue-500'}`} />
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatBalance(estimates.estAmount, collateralToken.decimals)}
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
                        selectGrid(walletData.config, order);
                      }
                    }}
                    className={`
                      px-2 py-1 text-xs rounded-lg transition-all
                      ${selectedGrids.includes(order.sl)
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
      {isSelected && !isExpanded && (hasInsufficientBalance || hasInsufficientTokens) && (
        <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-2">
          <div className="flex items-center gap-2 text-xs text-red-500">
            <FiAlertCircle className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              Insufficient {hasInsufficientBalance ? 'gas' : ''}
              {hasInsufficientBalance && hasInsufficientTokens ? ' and ' : ''}
              {hasInsufficientTokens ? 'tokens' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

WalletCard.displayName = 'WalletCard';

// ============================================
// OPTIMIZED WALLET SELECTOR COMPONENT
// ============================================

const WalletSelector = ({
  category,
  availableWallets = mockWallets,
  orders,
  gridsByWallet,
  setGridsByWallet,
  areWalletsReady,
  setWalletsReady,
  chainId,
  collateralToken,
  selectedStrategy,
  estOrders,
}: WalletSelectorProps) => {
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [selectedWallets, setSelectedWallets] = useState<WalletConfig[]>([]);
  
  // Store fetched data (balances, locks) separately from UI estimates
  const [walletDataMap, setWalletDataMap] = useState<Record<string, WalletData>>({});
  
  const [gasFee, setGasFee] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Single wallet strategies check
  const isSingleWalletStrategy = useMemo(() => {
    const singleWalletStrategies = ["limit", "scalp", "algo"];
    return singleWalletStrategies.includes(selectedStrategy?.id);
  }, [selectedStrategy?.id]);



  // Filter available wallets based on chain ID and normalize ID
  const filteredAvailableWallets = useMemo(() => {
    return availableWallets.filter(wallet => {
      const network = (wallet as any).network;
      if (chainId === chains.Solana) {
        return network === 'SVM';
      }
      // Default to EVM for other chains or if network is not specified
      return network === 'EVM' || !network;
    }).map((w: any) => ({
      ...w,
      _id: w._id || w.id // Normalize ID: mock uses 'id' for SVM, '_id' for EVM
    }));
  }, [availableWallets, chainId]);

  // 1. Fetch Gas Fee
  useEffect(() => {
    const fetchGasFee = async () => {
      try {
        const fee = await getGasFee(chainId);
        setGasFee(fee);
      } catch (error) {
        //console.error("Error fetching gas fee:", error);
        setGasFee(BigInt(0));
      }
    };
    fetchGasFee();
  }, [chainId]);

  // 2. Fetch Wallet Data (Balances & Existing Locks)
  const initializeWalletData = useCallback(async () => {
    if (!filteredAvailableWallets.length || loadingRef.current) return;

    loadingRef.current = true;
    setIsLoading(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const newWalletData: Record<string, WalletData> = {};
      const batchSize = 3;
      
      for (let i = 0; i < filteredAvailableWallets.length; i += batchSize) {
        const batch = filteredAvailableWallets.slice(i, i + batchSize);
        const batchPromises = batch.map(async (wallet) => {
          if (abortControllerRef.current?.signal.aborted) return null;

          // Calculate locks from EXISTING orders
          const lockedFunds = calculateExistingLockedFunds(
            orders,
            wallet._id,
            collateralToken.address,
            gasFee
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

          return {
            address: wallet.address.toLowerCase(),
            data: {
              config: wallet,
              ...lockedFunds,
              balance: typeof balance === "string" ? safeParseUnits(balance, 18) : BigInt(balance),
              tokenBalance: typeof tokenBalance === "string" ? safeParseUnits(tokenBalance, collateralToken.decimals) : BigInt(tokenBalance),
            }
          };
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(result => {
          if (result) newWalletData[result.address] = result.data;
        });

        setWalletDataMap(prev => ({ ...prev, ...newWalletData }));
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        //console.error("Error initializing wallet data:", error);
        toast.error("Failed to fetch wallet balances");
      }
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [filteredAvailableWallets, orders, collateralToken, gasFee, chainId]);

  // Initial Fetch
  useEffect(() => {
    if (filteredAvailableWallets.length) {
      initializeWalletData();
    }
    return () => abortControllerRef.current?.abort();
  }, [filteredAvailableWallets, orders.length, initializeWalletData]); // Depend on orders length to refetch if existing orders change

  // 3. Centralized Estimation Logic (Memoized)
  // This calculates "estAmount" and "estCost" for every wallet based on `gridsByWallet`
  const estimatesByWallet = useMemo(() => {
    const estimates: Record<string, WalletEstimates> = {};

    // Initialize zero estimates for all known wallets
    Object.keys(walletDataMap).forEach(address => {
      estimates[address] = { estAmount: BigInt(0), estCost: BigInt(0) };
    });

    // Iterate through assigned grids and sum up costs
    Object.entries(gridsByWallet).forEach(([gridSl, walletConfig]) => {
      const order = estOrders.find(o => o.sl === Number(gridSl));
      if (order && walletConfig && walletConfig.address) {
        const address = walletConfig.address.toLowerCase();
        if (!estimates[address]) estimates[address] = { estAmount: BigInt(0), estCost: BigInt(0) };

        const costs = getOrderCosts({ order, collateralTokenAddress: collateralToken.address, gasFee });
        
        if (collateralToken.address !== ZeroAddress) {
          estimates[address].estAmount += costs.orderAmount;
          estimates[address].estCost += costs.orderGasFee;
        } else {
          estimates[address].estCost += (costs.orderGasFee + costs.orderAmount);
        }
      }
    });

    return estimates;
  }, [gridsByWallet, estOrders, walletDataMap, collateralToken.address, gasFee]);

  // 4. Centralized Readiness Check
  // Compares fetched balances (walletDataMap) vs calculated estimates (estimatesByWallet)
  useEffect(() => {
    if (!selectedWallets.length || !estOrders.length) {
      setWalletsReady(false);
      return;
    }

    const isReady = selectedWallets.every((wallet) => {
      const address = wallet.address.toLowerCase();
      const data = walletDataMap[address];
      const estimate = estimatesByWallet[address];

      if (!data || !estimate) return false;

      const availableNative = data.balance - data.lockedFundBalance;
      const availableTokens = data.tokenBalance - data.totalCollateralPending;

      const hasEnoughNative = availableNative >= estimate.estCost;
      const hasEnoughTokens = availableTokens >= estimate.estAmount;

      return hasEnoughNative && hasEnoughTokens;
    });

    setWalletsReady(isReady);
  }, [selectedWallets, walletDataMap, estimatesByWallet, estOrders.length, setWalletsReady]);


  // Distribution Logic (Assigned Grids)
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
    [estOrders, isSingleWalletStrategy, setGridsByWallet]
  );

  // Handlers
  const handleSelectWallet = useCallback(
    (wallet: WalletConfig) => {
      if (isSingleWalletStrategy && selectedWallets.length >= 1) {
        toast.error("Only one wallet can be selected for this strategy");
        return;
      }
      if (estOrders.length <= selectedWallets.length) {
        toast.error("Already have enough wallets for the number of orders");
        return;
      }
      const newSelectedWallets = [...selectedWallets, wallet];
      setSelectedWallets(newSelectedWallets);
      distributeOrders(newSelectedWallets);
    },
    [isSingleWalletStrategy, selectedWallets, estOrders.length, distributeOrders]
  );

  const handleRemoveWallet = useCallback(
    (wallet: WalletConfig) => {
      const newSelectedWallets = selectedWallets.filter((w) => w._id !== wallet._id);
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
    [selectedWallets, gridsByWallet, distributeOrders, setGridsByWallet]
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
    [gridsByWallet, selectedWallets.length, setGridsByWallet]
  );
  
  // Available Wallets derivation
  const availableWalletsList = useMemo(() => {
    return filteredAvailableWallets
      .filter((wallet) => !selectedWallets.some((sw) => sw._id === wallet._id))
      .map((wallet) => walletDataMap[wallet.address.toLowerCase()])
      .filter(Boolean);
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
              ? `${selectedWallets.length} wallet${selectedWallets.length > 1 ? 's' : ''} selected`
              : `Choose wallets${isSingleWalletStrategy ? ' (Single wallet only)' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedWallets.length > 0 && areWalletsReady && (
            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Ready
            </span>
          )}
          <button
            onClick={initializeWalletData}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <MdOutlineRefresh className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
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
              const estimates = estimatesByWallet[address] || { estCost: BigInt(0), estAmount: BigInt(0) };
              
              // Calculate which grids belong to this wallet
              const walletGrids = Object.entries(gridsByWallet)
                .filter(([_, w]) => w._id === wallet._id)
                .map(([sl]) => Number(sl));

              return data ? (
                <WalletCard
                  key={wallet._id}
                  walletData={data}
                  estimates={estimates}
                  isSelected={true}
                  onRemove={handleRemoveWallet}
                  collateralToken={collateralToken}
                  estOrders={estOrders}
                  selectedGrids={walletGrids}
                  selectGrid={handleGridForWallet}
                  chainId={chainId}
                />
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Add Wallets Toggle */}
      <button
        onClick={() => setShowWalletSelector(!showWalletSelector)}
        className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed transition-all text-sm ${showWalletSelector
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
      {showWalletSelector && availableWalletsList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">Available Wallets</h4>
            <span className="text-xs text-gray-500">Click to select</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {availableWalletsList.map((walletData) => (
                <WalletCard
                  key={walletData.config._id}
                  walletData={walletData}
                  estimates={{ estCost: BigInt(0), estAmount: BigInt(0) }}
                  isSelected={false}
                  onSelect={handleSelectWallet}
                  onRemove={handleRemoveWallet}
                  collateralToken={collateralToken}
                  estOrders={estOrders}
                  selectedGrids={[]}
                  chainId={chainId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletSelector;