import React,{ useEffect, useState, useCallback, useMemo, useRef } from "react";
// Types
import { ORDER_TYPE, OrderTokenType } from "@/type/order";
import { WalletConfig } from "@/type/common";
// UI Components (kept same)
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

export const mockWallets: any = [
  {
    _id: "aifygfdfc ",
    address: "0xc4C392c5DDBa4cf987cBD584EFcFA69036D65ade",
  },
  {
    _id: "wi7vygyuy7ty5y",
    address: "0x1ecD5b2f696E50D74F7Ce64740dA5a73fe1C8013",
  },
  {
    _id: "oaurhvrhgiu",
    address: "0xfe7AB0137C85c9f05d03d69a35865277EA64DEba",
  },
];

// Define missing types
type Order = ORDER_TYPE & {
  sl: number;
  _id?: string;
  wallet?: WalletConfig;
};

interface WalletConfigSelectorObject extends WalletConfig {
  totalActiveOrders: number;
  lockedFundBalance: bigint;
  totalCollateralPending: bigint;
  estAmount: bigint;
  estCost: bigint;
  balance: bigint;
  tokenBalance: bigint;
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

// Memoize this helper to prevent recreation
const getLockedFundAndCollateralTokenByWallet = ({order, collateralTokenAddress, gasFee}:{order: ORDER_TYPE, collateralTokenAddress: string, gasFee: bigint}) => {
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

// Memoized calculation of wallet estimates
const calculateWalletEstimates = (
  estOrders: ORDER_TYPE[],
  selectedGrids: number[],
  collateralTokenAddress: string,
  gasFee: bigint
) => {
  let estAmount = BigInt(0);
  let estCost = BigInt(0);
  
  selectedGrids.forEach((gridSl) => {
    const order = estOrders.find(o => o.sl === gridSl);
    console.log('walletcard', order)
    if (order) {
      const orderEst = getLockedFundAndCollateralTokenByWallet({order, collateralTokenAddress, gasFee});
      console.log(orderEst)
      if (collateralTokenAddress !== ZeroAddress) {
        estAmount += orderEst.orderAmount;
        estCost += orderEst.orderGasFee;
      } else {
        estCost += orderEst.orderGasFee + orderEst.orderAmount;
      }
    }
  });
  
  return { estAmount, estCost };
};

// Memoized calculation of wallet locked funds
const calculateWalletLockedFunds = (
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
      const orderLockAmount = getLockedFundAndCollateralTokenByWallet({
        order, 
        collateralTokenAddress, 
        gasFee
    });
      
      if (collateralTokenAddress !== ZeroAddress) {
        lockedFundBalance += orderLockAmount.orderGasFee;
        totalCollateralPending += orderLockAmount.orderAmount;
      } else {
        lockedFundBalance += orderLockAmount.orderGasFee + orderLockAmount.orderAmount;
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
  walletConfig: WalletConfigSelectorObject;
  isSelected: boolean;
  onSelect?: (wallet: WalletConfig) => void;
  onRemove: (wallet: WalletConfig) => void;
  collateralToken: OrderTokenType;
  estOrders: Order[];
  gridsByWallet: Record<number, WalletConfig>;
  setWalletConfig: React.Dispatch<
    React.SetStateAction<Record<string, WalletConfigSelectorObject>>
  >;
  selectGrid?: (wallet: WalletConfigSelectorObject, order: Order) => void;
  gasFee: bigint;
  chainId: number;
  category: string;
}

const WalletCard = React.memo(({
  walletConfig,
  isSelected,
  onSelect,
  onRemove,
  collateralToken,
  estOrders,
  gridsByWallet,
  setWalletConfig,
  selectGrid,
  gasFee,
  chainId,
  category,
}: WalletCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const prevGridsByWalletRef = useRef<Record<number, WalletConfig>>({});
  const prevGasFeeRef = useRef<bigint | null>(null);

  // Memoize selected grids calculation
  const selectedGrids = useMemo(() => {
    return Object.entries(gridsByWallet)
      .filter(([_, wallet]) => walletConfig._id === wallet._id)
      .map(([gridSl]) => Number(gridSl));
  }, [gridsByWallet, walletConfig._id]);

  // Memoize wallet estimates
  const walletEstimates = useMemo(() => {
    if (!isSelected || estOrders.length === 0 || selectedGrids.length === 0) {
      return { estAmount: BigInt(0), estCost: BigInt(0) };
    }
    
    const estimates = calculateWalletEstimates(
      estOrders,
      selectedGrids,
      collateralToken.address,
      gasFee
    );
    
    // console.log('Wallet estimates for', walletConfig.address.slice(0, 6), ':', {
    //   selectedGrids,
    //   estAmount: estimates.estAmount.toString(),
    //   estCost: estimates.estCost.toString()
    // });
    
    return estimates;
  }, [isSelected, estOrders, selectedGrids, collateralToken.address, gasFee, walletConfig.address]);

  // Update wallet config only when estimates change
  useEffect(() => {
    if (!isSelected || 
        (walletConfig.estAmount === walletEstimates.estAmount && 
         walletConfig.estCost === walletEstimates.estCost)) {
      return;
    }



    setWalletConfig((prev) => ({
      ...prev,
      [walletConfig.address.toLowerCase()]: {
        ...prev[walletConfig.address.toLowerCase()],
        estAmount: walletEstimates.estAmount,
        estCost: walletEstimates.estCost,
      },
    }));
  }, [isSelected, walletEstimates, walletConfig.address, setWalletConfig]);

  const handleSelectWallet = useCallback(() => {
    onSelect?.(walletConfig);
  }, [onSelect, walletConfig]);

  const handleRemoveWallet = useCallback(() => {
    onRemove(walletConfig);
  }, [onRemove, walletConfig]);

  // Memoize balance calculations
  const { availableBalance, availableTokens, hasInsufficientBalance, hasInsufficientTokens } = useMemo(() => {
    const availableBalance = walletConfig.balance - walletConfig.lockedFundBalance;
    const availableTokens = walletConfig.tokenBalance - walletConfig.totalCollateralPending;
    const hasInsufficientBalance = availableBalance < (walletConfig.estCost || BigInt(0));
    const hasInsufficientTokens = availableTokens < (walletConfig.estAmount || BigInt(0));
    
    return { availableBalance, availableTokens, hasInsufficientBalance, hasInsufficientTokens };
  }, [walletConfig.balance, walletConfig.lockedFundBalance, walletConfig.tokenBalance, 
      walletConfig.totalCollateralPending, walletConfig.estCost, walletConfig.estAmount]);

  // Memoize native token
  const nativeToken = useMemo(() => {
    return Object.values(Tokens[chainId]).find(
      (token) =>
        token.address === ZeroAddress ||
        token.symbol === "ETH" ||
        token.symbol === "SOL"
    ) || Tokens[chainId][ZeroAddress];
  }, [chainId]);

  // Memoize format function
  const formatBalance = useCallback((balance: bigint, decimals: number) => {
    return formateAmountWithFixedDecimals(balance, decimals, 4);
  }, []);

  // JSX remains the same but with optimized handlers
  return (
     <div className={`rounded-lg border transition-all ${isSelected ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'} ${(hasInsufficientBalance || hasInsufficientTokens) && isSelected ? 'border-red-300 dark:border-red-500' : ''}`}>
      {/* Header - Always visible */}
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
                {walletConfig.address.slice(0, 6)}...{walletConfig.address.slice(-4)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(walletConfig.address);
                  toast.success("Address copied!");
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <FiCopy className="w-3 h-3 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            {walletConfig.totalActiveOrders > 0 && (
              <span className="inline-block px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 mt-1">
                {walletConfig.totalActiveOrders} active
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
                onSelect && onSelect(walletConfig);
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
                    {formatBalance(walletConfig.balance || BigInt(0), nativeToken.decimals)}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <FaLock className="w-3 h-3 text-red-400" />
                    Locked Balance
                  </div>
                  <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {formatBalance(walletConfig.lockedFundBalance || BigInt(0), nativeToken.decimals)}
                  </div>
                </div>
                
                <div className={`p-2 rounded ${hasInsufficientBalance ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Est. Gas</span>
                    <FaGasPump className={`w-3 h-3 ${hasInsufficientBalance ? 'text-red-500' : 'text-blue-500'}`} />
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {walletConfig.estCost 
                      ? formatBalance(walletConfig.estCost, nativeToken.decimals)
                      : "0.00"}
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

            {/* Collateral Token Balance - Only show if not native token */}
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
                      {formatBalance(walletConfig.tokenBalance || BigInt(0), collateralToken.decimals)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <FaLock className="w-3 h-3 text-red-400" />
                      Locked Balance
                    </div>
                    <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {formatBalance(walletConfig.totalCollateralPending || BigInt(0), collateralToken.decimals)}
                    </div>
                  </div>
                  
                  <div className={`p-2 rounded ${hasInsufficientTokens ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Est. Amount</span>
                      <FaLock className={`w-3 h-3 ${hasInsufficientTokens ? 'text-red-500' : 'text-blue-500'}`} />
                    </div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {walletConfig.estAmount 
                        ? formatBalance(walletConfig.estAmount, collateralToken.decimals)
                        : "0.00"}
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
                        selectGrid(walletConfig, order);
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
  const [walletConfig, setWalletConfig] = useState<
    Record<string, WalletConfigSelectorObject>
  >({});
  const [gasFee, setGasFee] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Single wallet strategies
  const isSingleWalletStrategy = useMemo(() => {
    const singleWalletStrategies = ["limit", "scalp", "algo"];
    return singleWalletStrategies.includes(selectedStrategy?.id);
  }, [selectedStrategy?.id]);

  // Fetch gas fee once
  useEffect(() => {
    const fetchGasFee = async () => {
      try {
        const fee = await getGasFee(chainId);
        setGasFee(fee);
      } catch (error) {
        console.error("Error fetching gas fee:", error);
        setGasFee(BigInt(0));
      }
    };
    
    fetchGasFee();
  }, [chainId]);

  // Initialize wallet configs
  const initializeWalletConfigs = useCallback(async () => {
    if (!availableWallets.length || loadingRef.current) return;
    
    loadingRef.current = true;
    setIsLoading(true);
    
    // Create abort controller for cleanup
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      const newWalletConfig: Record<string, WalletConfigSelectorObject> = {};
      
      // Process wallets in batches to avoid overwhelming the network
      const batchSize = 3;
      for (let i = 0; i < availableWallets.length; i += batchSize) {
        const batch = availableWallets.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (wallet) => {
          if (abortControllerRef.current?.signal.aborted) return null;
          
          // Calculate locked funds
          const lockedFunds = calculateWalletLockedFunds(
            orders,
            wallet._id,
            collateralToken.address,
            gasFee
          );
          
          // Fetch balances in parallel
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
            config: {
              ...wallet,
              ...lockedFunds,
              estAmount: BigInt(0),
              estCost: BigInt(0),
              balance: typeof balance === "string"
                ? safeParseUnits(balance, 18)
                : BigInt(balance),
              tokenBalance: typeof tokenBalance === "string"
                ? safeParseUnits(tokenBalance, collateralToken.decimals)
                : BigInt(tokenBalance),
            }
          };
        });
        
        const batchResults = await Promise.all(batchPromises);
        
        // Update config with batch results
        batchResults.forEach(result => {
          if (result) {
            newWalletConfig[result.address] = result.config;
          }
        });
        
        // Update state incrementally for better UX
        if (Object.keys(newWalletConfig).length > 0) {
          setWalletConfig(prev => ({ ...prev, ...newWalletConfig }));
        }
      }
    } catch (error:any) {
      if (error.name !== 'AbortError') {
        console.error("Error initializing wallet configs:", error);
        toast.error("Failed to fetch wallet balances");
      }
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [availableWallets, orders, collateralToken, gasFee, chainId]);

  // Refresh wallet balances
  const refreshTotalWalletBalance = useCallback(async () => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    setIsLoading(true);
    
    try {
      const balanceUpdates: Array<{
        address: string;
        balance: bigint;
        tokenBalance: bigint;
      }> = [];
      
      // Process in smaller batches
      const batchSize = 2;
      for (let i = 0; i < selectedWallets.length; i += batchSize) {
        const batch = selectedWallets.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (wallet) => {
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
            balance: typeof balance === "string"
              ? safeParseUnits(balance, 18)
              : BigInt(balance),
            tokenBalance: typeof tokenBalance === "string"
              ? safeParseUnits(tokenBalance, collateralToken.decimals)
              : BigInt(tokenBalance),
          };
        });
        
        const batchResults = await Promise.all(batchPromises);
        balanceUpdates.push(...batchResults);
      }
      
      // Batch update wallet config
      setWalletConfig(prev => {
        const updated = { ...prev };
        balanceUpdates.forEach(({ address, balance, tokenBalance }) => {
          if (updated[address]) {
            updated[address] = {
              ...updated[address],
              balance,
              tokenBalance,
            };
          }
        });
        return updated;
      });
      
      toast.success("Balances refreshed");
    } catch (error) {
      console.error("Error refreshing balances:", error);
      toast.error("Failed to refresh balances");
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [selectedWallets, chainId, collateralToken]);

  // Handle grid selection for wallet
  const handleGridForWallet = useCallback(
    (wallet: WalletConfigSelectorObject, order: Order) => {
      if (selectedWallets.length <= 1) return;
      
      // Check if grid is already assigned to this wallet
      const isAssigned = gridsByWallet[order.sl]?._id === wallet._id;
      if (isAssigned) return;
      
      // Optimistically update
      const newGridsByWallet = {
        ...gridsByWallet,
        [order.sl]: wallet,
      };
      setGridsByWallet(newGridsByWallet);
    },
    [gridsByWallet, selectedWallets.length, setGridsByWallet]
  );

  // Distribute orders across selected wallets
  const distributeOrders = useCallback(
    (wallets: WalletConfig[]) => {
      if (!wallets.length || !estOrders.length) return;
      
      const newGridsByWallet: Record<number, WalletConfig> = {};
      
      if (isSingleWalletStrategy && wallets.length > 0) {
        // Single wallet: assign all to first wallet
        estOrders.forEach((order) => {
          newGridsByWallet[order.sl] = wallets[0];
        });
      } else {
        // Multi-wallet: distribute evenly
        estOrders.forEach((order, index) => {
          const walletIndex = index % wallets.length;
          newGridsByWallet[order.sl] = wallets[walletIndex];
        });
      }
      
      setGridsByWallet(newGridsByWallet);
    },
    [estOrders, isSingleWalletStrategy, setGridsByWallet]
  );

  // Handle wallet selection
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

  // Handle wallet removal
  const handleRemoveWallet = useCallback(
    (wallet: WalletConfig) => {
      const newSelectedWallets = selectedWallets.filter(
        (w) => w._id !== wallet._id
      );
      setSelectedWallets(newSelectedWallets);
      
      // Remove grids assigned to this wallet
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

  // Check wallet readiness
  const checkWalletsReady = useCallback(() => {
    if (!selectedWallets.length || !estOrders.length) {
      setWalletsReady(false);
      return;
    }
    
    const isReady = selectedWallets.every((wallet) => {
      const config = walletConfig[wallet.address.toLowerCase()];
      if (!config) return false;
      
      const availableBalance = config.balance - config.lockedFundBalance;
      const availableTokens = config.tokenBalance - config.totalCollateralPending;
      
      const hasEnoughNative = availableBalance >= (config.estCost || BigInt(0));
      
      let hasEnoughTokens = true;
      if (collateralToken.address !== ZeroAddress) {
        hasEnoughTokens = availableTokens >= (config.estAmount || BigInt(0));
      }
      
      return hasEnoughNative && hasEnoughTokens;
    });
    
    setWalletsReady(isReady);
  }, [selectedWallets, walletConfig, estOrders.length, collateralToken.address, setWalletsReady]);

  // Initialize wallet configs on mount and when dependencies change
  useEffect(() => {
    if (availableWallets.length && estOrders.length) {
      initializeWalletConfigs();
    }
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [availableWallets, estOrders.length, initializeWalletConfigs]);

  // Update wallet readiness when dependencies change
  useEffect(() => {
    checkWalletsReady();
  }, [selectedWallets, walletConfig, estOrders, checkWalletsReady]);

  // Memoize available wallets list
  const availableWalletsList = useMemo(() => {
    return availableWallets
      .filter((wallet) => !selectedWallets.some((sw) => sw._id === wallet._id))
      .map((wallet) => walletConfig[wallet.address.toLowerCase()])
      .filter(Boolean);
  }, [availableWallets, selectedWallets, walletConfig]);

  // JSX remains the same
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
            onClick={refreshTotalWalletBalance}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
          >
            <MdOutlineRefresh
              className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Selected Wallets Section */}
      {selectedWallets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                Selected ({selectedWallets.length})
              </h4>
            </div>
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
              const config = walletConfig[wallet.address.toLowerCase()];
              return config ? (
                <WalletCard
                  key={wallet._id}
                  walletConfig={config}
                  isSelected={true}
                  onRemove={handleRemoveWallet}
                  collateralToken={collateralToken}
                  estOrders={estOrders}
                  gridsByWallet={gridsByWallet}
                  setWalletConfig={setWalletConfig}
                  selectGrid={handleGridForWallet}
                  gasFee={gasFee}
                  chainId={chainId}
                  category={category}
                />
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Add Wallets Toggle */}
      <button
        onClick={() => setShowWalletSelector(!showWalletSelector)}
        className={`
          w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed transition-all text-sm
          ${showWalletSelector
            ? "border-red-300 bg-red-50/30 dark:bg-red-900/10 text-red-600 dark:text-red-400"
            : "border-blue-300 hover:border-blue-400 bg-blue-50/30 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          }
        `}
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
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Available Wallets
            </h4>
            <span className="text-xs text-gray-500">Click to select</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-2">
              {availableWalletsList.map((wallet) => (
                <WalletCard
                  key={wallet._id}
                  walletConfig={wallet}
                  isSelected={false}
                  onSelect={handleSelectWallet}
                  onRemove={handleRemoveWallet}
                  collateralToken={collateralToken}
                  estOrders={estOrders}
                  gridsByWallet={gridsByWallet}
                  setWalletConfig={setWalletConfig}
                  gasFee={gasFee}
                  chainId={chainId}
                  category={category}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {showWalletSelector &&
        availableWalletsList.length === 0 &&
        !isLoading && (
          <div className="text-center py-4 px-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <HiWallet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              All wallets selected
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              You've selected all available wallets for this order.
            </p>
          </div>
        )}
    </div>
  );
};

export default WalletSelector;