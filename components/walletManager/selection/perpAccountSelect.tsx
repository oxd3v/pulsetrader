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
import PerpAccountDeposit from "@/components/walletManager/modal/perpAccountDeposit";
import Service from "@/service/api-service";
import { handleServerErrorToast } from "@/lib/utils";

// Balance operations
import {
  getWalletBalance,
  getWalletTokenBalance,
} from "@/lib/blockchain/balance";
import { getNetworkfee } from "@/lib/blockchain/gas";
import {
  getOrderCosts,
  calculateExistingLockedFunds,
  calculateWalletTokenAllocation
} from "@/utility/orderUtility";
import { ZeroAddress } from "ethers";

import {
  SINGLE_PERPETUAL_STRATEGY,
  SINGLE_SPOT_STRATEGY_,
} from "@/constants/common/order";
import { chains } from "@/constants/common/chain";

// Define missing types
type Order = ORDER_TYPE & {
  sl: number;
  _id?: string;
  wallet?: WalletConfig;
};

// Interface: Separated static fetched data from dynamic estimates
interface WalletData {
  config: WalletConfig;
  totalActiveOrders: number;
  lockedFundBalance: bigint; // From EXISTING orders
  totalCollateralPending: bigint; // From EXISTING orders
  balance: bigint; // Native balance for gas
  tokenBalance: bigint; // Perp DEX collateral balance
  feeTokenPending: Record<string, bigint>;
  feeTokenBalances: Record<string, bigint>;
}

interface WalletEstimates {
  estAmount: bigint; // From NEW orders
  estCost: bigint; // From NEW orders
  estFeeAmount: bigint; // From NEW orders
  estFeeByToken: Record<string, bigint>;
}

interface WalletSelectorProps {
  protocol: string;
  category: string;
  availableWallets: WalletConfig[];
  orders: Order[];
  gridsByWallet: Record<number, WalletConfig>;
  setGridsByWallet: (gridsByWallet: Record<number, WalletConfig>) => void;
  areWalletsReady: boolean;
  setWalletsReady: (ready: boolean) => void;
  chainId: number;
  collateralToken: OrderTokenType;
  feeToken?: OrderTokenType | null;
  selectedStrategy: any;
  estOrders: Order[];
  user: any;
  perpBalancesByWallet?: Record<string, string | number | bigint>;
  onPerpTradeGateChange?: (canSubmitPerpAccount: boolean) => void;
}

const normalizeProtocolKey = (protocol?: string) => {
  return (protocol ?? "").toLowerCase();
};

const isPrimitiveBalance = (value: unknown) => {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint"
  );
};

const resolvePerpBalanceRaw = (
  wallet: WalletConfig,
  protocol: string,
  overrides?: Record<string, string | number | bigint>,
) => {
  if (overrides) {
    const byId = overrides[wallet._id];
    if (byId !== undefined && byId !== null) return byId;
    const addressKey = wallet.address?.toLowerCase?.() ?? wallet.address;
    const byAddress = overrides[addressKey] ?? overrides[wallet.address];
    if (byAddress !== undefined && byAddress !== null) return byAddress;
  }

  const walletAny = wallet as any;
  const key = normalizeProtocolKey(protocol);
  const candidates = [
    walletAny?.perpBalances?.[key],
    walletAny?.perpBalance?.[key],
    walletAny?.perpAccount?.[key]?.balance,
    walletAny?.perpAccount?.[key]?.equity,
    walletAny?.perp?.[key]?.balance,
    walletAny?.perp?.[key]?.equity,
    walletAny?.dexBalances?.[key],
    walletAny?.dexBalance?.[key],
    walletAny?.perpBalance,
    walletAny?.perpBalances,
    walletAny?.dexBalance,
    walletAny?.dexBalances,
    walletAny?.perpAccountBalance,
    walletAny?.perpAccountEquity,
    walletAny?.perpMargin,
  ];

  return candidates.find((candidate) => isPrimitiveBalance(candidate));
};

const toBigIntBalance = (value: unknown, decimals: number): bigint => {
  if (value === null || value === undefined) return BigInt(0);
  if (typeof value === "bigint") return value;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return BigInt(0);
    try {
      return safeParseUnits(String(value), decimals);
    } catch {
      return BigInt(0);
    }
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return BigInt(0);
    if (trimmed.includes(".")) {
      try {
        return safeParseUnits(trimmed, decimals);
      } catch {
        return BigInt(0);
      }
    }
    if (/^-?\d+$/.test(trimmed)) {
      try {
        return BigInt(trimmed);
      } catch {
        return BigInt(0);
      }
    }
    try {
      return safeParseUnits(trimmed, decimals);
    } catch {
      return BigInt(0);
    }
  }

  return BigInt(0);
};

const createEmptyWalletEstimate = (): WalletEstimates => ({
  estAmount: BigInt(0),
  estCost: BigInt(0),
  estFeeAmount: BigInt(0),
  estFeeByToken: {},
});

// UPDATED: Now fetches live DEX account balance directly via Service, identical to PortfolioMain.tsx logic.
const getPerpAccountBalance = async ({
  wallet,
  protocol,
  collateralToken,
  overrides,
}: {
  wallet: WalletConfig;
  protocol: string;
  collateralToken: OrderTokenType;
  overrides?: Record<string, string | number | bigint>;
}) => {
  const dexKey = normalizeProtocolKey(protocol);

  // 1. First, attempt to fetch the live balance from the DEX API
  try {
    const res: any = await Service.getPerpBalance({ mainWalletId: wallet._id, dex: dexKey });

    const raw = res?.data?.balance ?? res?.balance ?? res;

    if (raw !== undefined && raw !== null) {
      // Normalize raw to string number and parse units just like in PortfolioMain
      return safeParseUnits(String(Number(raw)), collateralToken.decimals);
    }
  } catch (err) {
    // console.warn(`Live perp balance fetch failed for ${dexKey}, falling back to static config.`, err);
  }

  // 2. Fallback to static resolution if live fetch fails or is unavailable
  const rawBalance = resolvePerpBalanceRaw(wallet, protocol, overrides);
  return toBigIntBalance(rawBalance, collateralToken.decimals);
};

// ============================================
// OPTIMIZED WALLET CARD COMPONENT
// ============================================

interface WalletCardProps {
  wallet: WalletConfig;
  walletData?: WalletData;
  isLoading?: boolean;
  isSelected: boolean;
  onSelect?: (wallet: WalletConfig) => void | Promise<void>;
  onRemove: (wallet: WalletConfig) => void;
  onDeposit?: (wallet: WalletConfig) => void;
  onApproveAgent?: (wallet: WalletConfig) => void | Promise<void>;
  protocol: string;
  collateralToken: OrderTokenType;
  feeToken?: OrderTokenType | null;
  estOrders: Order[];
  selectedGrids: number[];
  selectGrid?: (wallet: WalletConfig, order: Order) => void;
  chainId: number;
  estimates?: WalletEstimates;
}

const WalletCard = React.memo(
  ({
    wallet,
    walletData,
    isLoading,
    isSelected,
    onSelect,
    onRemove,
    onDeposit,
    onApproveAgent,
    protocol,
    collateralToken,
    feeToken,
    estOrders,
    selectedGrids,
    selectGrid,
    chainId,
    estimates = createEmptyWalletEstimate(),
  }: WalletCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const dexKey = normalizeProtocolKey(protocol);
    const isAgentApproved =
      (wallet as WalletConfig & { isApproved?: Record<string, boolean> })
        .isApproved?.[dexKey] === true;

    // Derived state for validation (only if data is loaded)
    const {
      hasInsufficientBalance,
      hasInsufficientTokens,
      hasInsufficientFeeToken,
      selectedFeeTokenBalance,
      selectedFeeTokenLocked,
      showFeeTokenCard,
    } = useMemo(() => {
      if (!walletData) {
        return {
          hasInsufficientBalance: false,
          hasInsufficientTokens: false,
          hasInsufficientFeeToken: false,
          selectedFeeTokenBalance: BigInt(0),
          selectedFeeTokenLocked: BigInt(0),
          showFeeTokenCard: false,
        };
      }
      const availableBalance =
        walletData.balance - walletData.lockedFundBalance;
      const availableTokens =
        walletData.tokenBalance - walletData.totalCollateralPending;
      const feeTokenAddress = feeToken?.address?.toLowerCase();
      const showFeeTokenCard =
        Boolean(feeTokenAddress) &&
        feeTokenAddress !== ZeroAddress.toLowerCase();
      const selectedFeeTokenBalance =
        (feeTokenAddress && walletData.feeTokenBalances[feeTokenAddress]) || BigInt(0);
      const selectedFeeTokenLocked =
        (feeTokenAddress && walletData.feeTokenPending[feeTokenAddress]) || BigInt(0);

      const hasInsufficientBalance =
        availableBalance < (estimates.estCost || BigInt(0));
      const hasInsufficientTokens =
        availableTokens < (estimates.estAmount || BigInt(0));
      const hasInsufficientFeeToken =
        showFeeTokenCard &&
        selectedFeeTokenBalance - selectedFeeTokenLocked <
        (estimates.estFeeAmount || BigInt(0));

      return {
        hasInsufficientBalance,
        hasInsufficientTokens,
        hasInsufficientFeeToken,
        selectedFeeTokenBalance,
        selectedFeeTokenLocked,
        showFeeTokenCard,
      };
    }, [walletData, estimates, feeToken]);

    const handleSelectWallet = useCallback(async () => {
      if (onSelect) await onSelect(wallet);
    }, [onSelect, wallet]);

    const handleRemoveWallet = useCallback(() => {
      onRemove(wallet);
    }, [onRemove, wallet]);

    const handleDeposit = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onDeposit?.(wallet);
      },
      [onDeposit, wallet],
    );

    const handleApproveAgent = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        void onApproveAgent?.(wallet);
      },
      [onApproveAgent, wallet],
    );

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
        Object.values(Tokens[chainId] || {}).find(
          (token: any) => token.address === ZeroAddress,
        ) ||
        (Tokens[chainId]
          ? Tokens[chainId][ZeroAddress]
          : { symbol: "ETH", decimals: 18, imageUrl: "" })
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
          className={`group relative rounded-xl border backdrop-blur-sm transition-all duration-300 overflow-hidden ${isSelected
            ? "border-blue-500/60 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-900/20 dark:to-indigo-900/10 shadow-sm shadow-blue-500/10"
            : "border-gray-200/80 dark:border-gray-700/80 bg-white/50 dark:bg-gray-800/50 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5"
            }`}
        >
          <div
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={!isSelected ? handleSelectWallet : undefined}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={`p-1.5 rounded ${isSelected
                  ? "bg-blue-100 dark:bg-blue-900"
                  : "bg-gray-100 dark:bg-gray-800"
                  }`}
              >
                <HiWallet
                  className={`w-4 h-4 ${isSelected
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

            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={handleDeposit}
                className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors"
              >
                Deposit
              </button>
              {!isAgentApproved && onApproveAgent && (
                <button
                  onClick={handleApproveAgent}
                  className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
                >
                  Approve Agent
                </button>
              )}
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
        </div>
      );
    }

    // Full view with data
    return (
      <div
        className={`group relative rounded-xl border backdrop-blur-sm transition-all duration-300 overflow-hidden ${isSelected
          ? "border-blue-500/60 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-blue-900/20 dark:to-indigo-900/10 shadow-sm shadow-blue-500/10"
          : "border-gray-200/80 dark:border-gray-700/80 bg-white/50 dark:bg-gray-800/50 hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/5 hover:-translate-y-0.5"
          } ${(hasInsufficientBalance ||
            hasInsufficientTokens ||
            hasInsufficientFeeToken) &&
            isSelected
            ? "border-red-400/60 dark:border-red-500/60 bg-gradient-to-br from-red-50/50 to-orange-50/30 dark:from-red-900/20 dark:to-orange-900/10 shadow-red-500/10"
            : ""
          }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-3 cursor-pointer ${!isSelected && "hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          onClick={!isSelected ? handleSelectWallet : undefined}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`p-1.5 rounded ${isSelected
                ? "bg-blue-100 dark:bg-blue-900"
                : "bg-gray-100 dark:bg-gray-800"
                }`}
            >
              <HiWallet
                className={`w-4 h-4 ${isSelected
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
              <div className="hidden 4xl:block flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] mt-1.5">
                <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <FaCoins className="w-3 h-3" />
                  <span>
                    Balance: {formatBalance(walletData.tokenBalance, collateralToken.decimals)} {collateralToken.symbol}
                  </span>
                </div>
                {walletData.totalCollateralPending > BigInt(0) && (
                  <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
                    <FaLock className="w-3 h-3" />
                    <span>
                      Locked: {formatBalance(walletData.totalCollateralPending, collateralToken.decimals)} {collateralToken.symbol}
                    </span>
                  </div>
                )}
                {estimates.estAmount > BigInt(0) && (
                  <div className="flex items-center gap-1 text-blue-500 dark:text-blue-400">
                    <TbGridDots className="w-3 h-3" />
                    <span>
                      Est. Margin: {formatBalance(estimates.estAmount, collateralToken.decimals)} {collateralToken.symbol}
                    </span>
                  </div>
                )}
                {feeToken && estimates.estFeeAmount > BigInt(0) && (
                  <div className="flex items-center gap-1 text-purple-500 dark:text-purple-400">
                    <TbGridDots className="w-3 h-3" />
                    <span>
                      Est. Fee: {formatBalance(estimates.estFeeAmount, feeToken.decimals)} {feeToken.symbol}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={handleDeposit}
              className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors"
            >
              Deposit
            </button>
            {!isAgentApproved && onApproveAgent && (
              <button
                onClick={handleApproveAgent}
                className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
              >
                Approve Agent
              </button>
            )}
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
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3 mb-3">
              {/* Perp DEX Collateral Balance */}
              <div className="p-3.5 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm backdrop-blur-md transition-all hover:shadow-md group/card">
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
                  <div className="flex gap-2">
                    {hasInsufficientBalance && (
                      <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 px-1.5 py-0.5 bg-red-50 dark:bg-red-900/30 rounded">
                        <FiAlertCircle /> NO GAS
                      </span>
                    )}
                    <FaCoins className="w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Account Balance
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
                    className={`p-2.5 rounded-lg transition-all ${hasInsufficientTokens
                      ? "bg-red-50/80 dark:bg-red-900/20 border border-red-200/80 dark:border-red-800/80"
                      : "bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/80 dark:border-blue-800/80"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Est. Margin (New)
                      </span>
                      <InfoTooltip
                        id="Est_collateralAmount"
                        content={`Estimated collateral required from perp account.`}
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
                        <span>Insufficient collateral</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {showFeeTokenCard && feeToken && (
                <div className="p-3.5 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-gray-200/80 dark:border-gray-700/80 shadow-sm backdrop-blur-md transition-all hover:shadow-md group/card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={feeToken.imageUrl}
                        className="w-5 h-5 rounded-full"
                        alt={feeToken.symbol}
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {feeToken.symbol}
                      </span>
                    </div>
                    <FaCoins className="w-4 h-4 text-gray-400" />
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Wallet Balance
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatBalance(
                          selectedFeeTokenBalance,
                          feeToken.decimals,
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
                          selectedFeeTokenLocked,
                          feeToken.decimals,
                        )}
                      </div>
                    </div>

                    {estimates.estFeeAmount > BigInt(0) && (
                      <div
                        className={`p-2.5 rounded-lg transition-all ${hasInsufficientFeeToken
                          ? "bg-red-50/80 dark:bg-red-900/20 border border-red-200/80 dark:border-red-800/80"
                          : "bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/80 dark:border-blue-800/80"
                          }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Est. Fee Token
                          </span>
                          <InfoTooltip
                            id="Est_feeTokenAmount"
                            content="Reserved Pulse fee amount for pending and active perp orders."
                          />
                        </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatBalance(
                            estimates.estFeeAmount,
                            feeToken.decimals,
                          )}
                        </div>
                        {hasInsufficientFeeToken && (
                          <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                            <FiAlertCircle className="w-3 h-3" />
                            <span>Insufficient fee token</span>
                          </div>
                        )}
                      </div>
                    )}
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
                        px-2 py-1 text-xs rounded-lg transition-all font-medium border
                        ${selectedGrids.includes(order.sl)
                          ? "bg-blue-500 text-white shadow-md shadow-blue-500/20 border-blue-500"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-sm"
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
          (hasInsufficientBalance ||
            hasInsufficientTokens ||
            hasInsufficientFeeToken) && (
            <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-2">
              <div className="flex items-center gap-2 text-xs text-red-500">
                <FiAlertCircle className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">
                  Insufficient {hasInsufficientBalance ? "gas" : ""}
                  {hasInsufficientBalance && hasInsufficientTokens
                    ? " and "
                    : ""}
                  {hasInsufficientTokens ? "collateral" : ""}
                  {(hasInsufficientBalance || hasInsufficientTokens) &&
                    hasInsufficientFeeToken
                    ? " and "
                    : ""}
                  {hasInsufficientFeeToken ? "fee token" : ""}
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
  protocol,
  category,
  availableWallets,
  orders,
  gridsByWallet,
  setGridsByWallet,
  areWalletsReady,
  setWalletsReady,
  chainId,
  collateralToken,
  feeToken,
  selectedStrategy,
  estOrders,
  user,
  perpBalancesByWallet,
  onPerpTradeGateChange,
}: WalletSelectorProps) => {
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const [selectedWallets, setSelectedWallets] = useState<WalletConfig[]>([]);
  const [depositWallet, setDepositWallet] = useState<WalletConfig | null>(null);
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  // Store fetched data (balances, locks) per wallet
  const [walletDataMap, setWalletDataMap] = useState<
    Record<string, WalletData>
  >({});
  const [loadingWallets, setLoadingWallets] = useState<Set<string>>(new Set());

  const [gasFee, setGasFee] = useState<bigint>(BigInt(0));
  const isMounted = useRef(true);
  const fetchGenByAddressRef = useRef<Record<string, number>>({});
  const selectedFeeTokenAddress = feeToken?.address?.toLowerCase();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleOpenDeposit = useCallback((wallet: WalletConfig) => {
    setDepositWallet(wallet);
    setIsDepositOpen(true);
  }, []);

  const handleCloseDeposit = useCallback(() => {
    setIsDepositOpen(false);
    setDepositWallet(null);
  }, []);

  // Single wallet strategies check
  const isSingleWalletStrategy = useMemo(() => {
    const singleWalletStrategies = category == 'perpetual' ? SINGLE_PERPETUAL_STRATEGY : SINGLE_SPOT_STRATEGY_;
    return singleWalletStrategies.includes(selectedStrategy?.id);
  }, [category, selectedStrategy?.id]);

  // Filter available wallets based on chain ID (non-agent wallets only)
  const filteredAvailableWallets = useMemo(() => {
    return availableWallets
      ?.filter((wallet) => {
        const walletAny = wallet as any;
        const network = walletAny.network;
        let chainMatch = false;

        if (chainId === chains.Solana) {
          chainMatch = network === "SVM";
        } else {
          chainMatch = network === "EVM" || !network;
        }

        // Must not be an agent wallet itself
        const isNotAgent = !walletAny.isAgentWallet;
        return chainMatch && isNotAgent;
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
        const fee = await getNetworkfee(chainId, protocol, category);
        setGasFee(fee);
      } catch (error) {
        setGasFee(BigInt(0));
      }
    };
    fetchGasFee();
  }, [category, chainId, protocol]);

  // Pre-group orders by wallet
  const ordersByWallet = useMemo(() => {
    const map = new Map<string, ORDER_TYPE[]>();
    orders.forEach((order) => {
      if (order.wallet._id) {
        const walletId = order.wallet._id.toString();
        if (!map.has(walletId)) map.set(walletId, []);
        map.get(walletId)!.push(order);
      }
    });
    return map;
  }, [orders]);

  // Per-wallet data fetcher
  // Removed global abort controller to prevent race conditions during multiple selections
  const fetchSingleWalletData = useCallback(
    async (
      wallet: WalletConfig,
      force = false,
    ): Promise<WalletData | undefined> => {
      const address = wallet.address.toLowerCase();
      const myGen =
        (fetchGenByAddressRef.current[address] =
          (fetchGenByAddressRef.current[address] ?? 0) + 1);

      // If not forced and data already exists, return cached data
      if (!force && walletDataMap[address]) {
        return walletDataMap[address];
      }

      setLoadingWallets((prev) => new Set(prev).add(wallet._id));

      // Timeout promise for 15s
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Fetch timeout")), 15000),
      );

      try {
        const walletOrders = ordersByWallet.get(wallet._id) || [];
        const walletLockedFunds = calculateExistingLockedFunds(
          walletOrders,
          wallet._id,
          collateralToken.address,
          gasFee,
          user,
          false,
        );
        const trackedFeeTokens = new Map<
          string,
          { address: string; decimals: number }
        >();

        const addTrackedFeeToken = (
          tokenAddress?: string,
          tokenDecimals?: number,
        ) => {
          if (!tokenAddress || tokenDecimals == null) return;

          const normalizedAddress = tokenAddress.toLowerCase();
          if (normalizedAddress === ZeroAddress.toLowerCase()) {
            return;
          }

          trackedFeeTokens.set(normalizedAddress, {
            address: tokenAddress,
            decimals: tokenDecimals,
          });
        };

        addTrackedFeeToken(feeToken?.address, feeToken?.decimals);
        walletOrders.forEach((order) => {
          addTrackedFeeToken(order.feeToken?.address, order.feeToken?.decimals);
        });

        const fetchPromise = Promise.all([
          getWalletBalance({ walletAddress: wallet.address, chainId }),
          getPerpAccountBalance({
            wallet,
            protocol,
            collateralToken,
            overrides: perpBalancesByWallet,
          }),
          Promise.all(
            Array.from(trackedFeeTokens.entries()).map(
              async ([normalizedAddress, tokenConfig]) => [
                normalizedAddress,
                await getWalletTokenBalance({
                  walletAddress: wallet.address,
                  tokenAddress: tokenConfig.address,
                  chainId,
                }),
                tokenConfig.decimals,
              ],
            ),
          ),
        ]);

        const [balance, tokenBalance, trackedFeeTokenBalances] = (await Promise.race([
          fetchPromise,
          timeoutPromise,
        ])) as [any, any, Array<[string, any, number]>];

        if (!isMounted.current) return undefined;
        if (fetchGenByAddressRef.current[address] !== myGen) return undefined;

        const feeTokenBalances = trackedFeeTokenBalances.reduce<
          Record<string, bigint>
        >((acc, [normalizedAddress, trackedBalance, decimals]) => {
          acc[normalizedAddress] = toBigIntBalance(trackedBalance, decimals);
          return acc;
        }, {});

        // --- NEW EXACT FEE ALLOCATION CALCULATION ---
        const exactFeeTokenPending: Record<string, bigint> = {};
        Array.from(trackedFeeTokens.keys()).forEach((address) => {
          exactFeeTokenPending[address] = calculateWalletTokenAllocation({
            orders: walletOrders,
            walletId: wallet._id,
            tokenAddress: address
          });
        });

        const newData: WalletData = {
          config: wallet,
          totalActiveOrders: walletLockedFunds.totalActiveOrders,
          lockedFundBalance: walletLockedFunds.lockedFundBalance,
          totalCollateralPending: walletLockedFunds.dexCollateralPending[normalizeProtocolKey(protocol)] || BigInt(0), // Margin stays derived from DEX
          feeTokenPending: exactFeeTokenPending, // Uses precise order allocation
          balance:
            typeof balance === "string"
              ? safeParseUnits(balance, 18)
              : BigInt(balance),
          tokenBalance:
            typeof tokenBalance === "bigint"
              ? tokenBalance
              : BigInt(tokenBalance),
          feeTokenBalances,
        };

        if (fetchGenByAddressRef.current[address] !== myGen) return undefined;

        // Update state
        setWalletDataMap((prev) => ({
          ...prev,
          [address]: newData,
        }));

        return newData;
      } catch (error) {
        if (isMounted.current) {
          //console.error("Wallet data fetch error:", error);
          // Only toast if it was a real user interaction error, not just a background check
          if (force)
            toast.error(
              `Failed to load data for ${wallet.address.slice(0, 6)}...`,
            );
        }
        return undefined;
      } finally {
        if (isMounted.current) {
          setLoadingWallets((prev) => {
            const next = new Set(prev);
            next.delete(wallet._id);
            return next;
          });
        }
      }
    },
    [
      ordersByWallet,
      collateralToken,
      gasFee,
      chainId,
      user,
      walletDataMap,
      protocol,
      perpBalancesByWallet,
      feeToken,
    ],
  );

  const handleApproveAgentForWallet = useCallback(
    async (wallet: WalletConfig) => {
      try {
        const res: any = await Service.approveAgent({
          mainWalletId: wallet._id,
          dex: normalizeProtocolKey(protocol),
        });
        if (res?.success || res?.data?.success) {
          toast.success("Agent approved");
          await fetchSingleWalletData(wallet, true);
        } else {
          const msg = res?.data?.message || res?.message || "SERVER_ERROR";
          handleServerErrorToast({
            err: { response: { data: { message: msg } } },
          });
        }
      } catch (err: any) {
        handleServerErrorToast({ err });
      }
    },
    [protocol, fetchSingleWalletData],
  );

  const handleExecuteDeposit = useCallback(async (params: any) => {
    try {
      const res: any = await Service.perpDeposit({
        walletId: params.wallet._id,
        tokenAddress: params.collateralToken.address,
        amount: params.amountInBaseUnits,
        chainId: params.chainId,
        dex: params.protocol || protocol,
      });
      if (!res?.success && !res?.data?.success) {
        throw new Error(res?.message || "Deposit failed");
      }
      toast.success("Deposit successful");
      // Refresh the wallet balance
      fetchSingleWalletData(params.wallet, true);
    } catch (err: any) {
      toast.error(err.message || "Failed to execute deposit");
      throw err; // throw so the modal stops loading state
    }
  }, [fetchSingleWalletData, protocol]);

  // Centralized Estimation Logic (Memoized)
  const estimatesByWallet = useMemo(() => {
    const estimates: Record<string, WalletEstimates> = {};

    // Initialize zero estimates for all known wallets (selected or loaded)
    Object.keys(walletDataMap).forEach((address) => {
      estimates[address] = createEmptyWalletEstimate();
    });

    // Also ensure selected wallets have an entry even if data not loaded yet
    selectedWallets.forEach((w) => {
      const addr = w.address.toLowerCase();
      if (!estimates[addr]) estimates[addr] = createEmptyWalletEstimate();
    });

    // Iterate through assigned grids and sum up costs
    Object.entries(gridsByWallet).forEach(([gridSl, walletConfig]) => {
      const order = estOrders.find((o) => o.sl === Number(gridSl));
      if (order && walletConfig && walletConfig.address) {
        const address = walletConfig.address.toLowerCase();

        // Ensure entry exists
        if (!estimates[address]) estimates[address] = createEmptyWalletEstimate();

        const costs = getOrderCosts({
          order,
          collateralTokenAddress: collateralToken.address,
          gasFee,
          user,
          treatCollateralTokenAsWalletBalance: false,
        });

        if (collateralToken.address !== ZeroAddress) {
          estimates[address].estAmount += costs.dexOrderAmount;
          estimates[address].estCost += costs.orderGasFee;
        } else {
          estimates[address].estCost += costs.orderGasFee + costs.dexOrderAmount;
        }

        if (costs.feeTokenAmount > BigInt(0) && costs.feeTokenAddress) {
          estimates[address].estFeeByToken[costs.feeTokenAddress] =
            (estimates[address].estFeeByToken[costs.feeTokenAddress] || BigInt(0)) +
            costs.feeTokenAmount;

          if (selectedFeeTokenAddress === costs.feeTokenAddress) {
            estimates[address].estFeeAmount += costs.feeTokenAmount;
          }
        }
      }
    });

    return estimates;
  }, [
    gridsByWallet,
    estOrders,
    walletDataMap,
    selectedWallets,
    collateralToken.address,
    gasFee,
    user,
    selectedFeeTokenAddress,
  ]);

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
      if (!estimate) return false; // Should theoretically exist if selected

      const availableNative = data.balance - data.lockedFundBalance;
      const availableTokens = data.tokenBalance - data.totalCollateralPending;
      const hasFeeTokenLiquidity = Object.entries(
        estimate.estFeeByToken || {},
      ).every(([tokenAddress, feeAmount]) => {
        const availableFeeToken =
          (data.feeTokenBalances[tokenAddress] || BigInt(0)) -
          (data.feeTokenPending[tokenAddress] || BigInt(0));

        return availableFeeToken >= feeAmount;
      });

      return (
        availableNative >= estimate.estCost &&
        availableTokens >= estimate.estAmount &&
        hasFeeTokenLiquidity
      );
    });

    setWalletsReady(isReady);
  }, [
    selectedWallets,
    walletDataMap,
    estimatesByWallet,
    estOrders.length,
    setWalletsReady,
  ]);

  useEffect(() => {
    if (!onPerpTradeGateChange) return;
    const assigned = Object.values(gridsByWallet).filter(
      Boolean,
    ) as WalletConfig[];
    if (assigned.length === 0) {
      onPerpTradeGateChange(false);
      return;
    }
    const uniq = Array.from(new Map(assigned.map((w) => [w._id, w])).values());
    const dexKey = normalizeProtocolKey(protocol);
    const ok = uniq.every((w) => {
      const approved =
        (w as WalletConfig & { isApproved?: Record<string, boolean> })
          .isApproved?.[dexKey] === true;
      const addr = w.address.toLowerCase();
      const data = walletDataMap[addr];
      if (!data) return false;
      return approved && data.tokenBalance > BigInt(0);
    });
    onPerpTradeGateChange(ok);
  }, [gridsByWallet, walletDataMap, protocol, onPerpTradeGateChange]);

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

      // If already loading, show a toast and return early to prevent double clicks
      if (loadingWallets.has(wallet._id)) {
        toast.loading("Wallet data is being fetched...", {
          id: "wallet-loading",
        });
        return;
      }

      let data: WalletData | undefined = walletDataMap[address];

      // If no data, fetch it first.
      // IMPORTANT: Use the return value 'newData' for logic, not the state.
      if (!data) {
        // Show loading indicator in UI immediately via setLoadingWallets inside fetcher
        data = await fetchSingleWalletData(wallet);
      }

      // If data is STILL missing after await, it meant fetch failed (error caught inside fetcher)
      if (!data) {
        toast.error("Failed to load wallet data. Please try again.");
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

      // Update state
      const newSelected = [...selectedWallets, wallet];
      setSelectedWallets(newSelected);
      distributeOrders(newSelected);
    },
    [
      walletDataMap,
      loadingWallets,
      fetchSingleWalletData,
      isSingleWalletStrategy,
      selectedWallets,
      estOrders.length,
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
    // Refresh sequentially or parallel based on preference. Parallel is faster.
    await Promise.all(
      selectedWallets.map((w) => fetchSingleWalletData(w, true)),
    );
    toast.success("Wallets refreshed");
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

  const selectedWalletIssueCount = useMemo(() => {
    return selectedWallets.reduce((count, wallet) => {
      const address = wallet.address.toLowerCase();
      const data = walletDataMap[address];
      const estimate = estimatesByWallet[address];

      if (!data || !estimate) return count + 1;

      const availableNative = data.balance - data.lockedFundBalance;
      const availableCollateral = data.tokenBalance - data.totalCollateralPending;
      const feeBlocked = Object.entries(estimate.estFeeByToken || {}).some(
        ([tokenAddress, feeAmount]) =>
          (data.feeTokenBalances[tokenAddress] || BigInt(0)) -
          (data.feeTokenPending[tokenAddress] || BigInt(0)) <
          feeAmount,
      );

      if (
        availableNative < estimate.estCost ||
        availableCollateral < estimate.estAmount ||
        feeBlocked
      ) {
        return count + 1;
      }

      return count;
    }, 0);
  }, [selectedWallets, walletDataMap, estimatesByWallet]);



  const depositBalance = useMemo(() => {
    if (!depositWallet) return undefined;
    return walletDataMap[depositWallet.address.toLowerCase()]?.tokenBalance;
  }, [depositWallet, walletDataMap]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Select Perp Accounts
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {selectedWallets.length > 0
              ? `${selectedWallets.length} account${selectedWallets.length > 1 ? "s" : ""} selected`
              : `Choose perp accounts${isSingleWalletStrategy ? " (Single account only)" : ""}`}
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
            disabled={loadingWallets.size > 0 || selectedWallets.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MdOutlineRefresh
              className={`w-3 h-3 ${loadingWallets.size > 0 ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* No eligible wallets notification */}
      {filteredAvailableWallets.length === 0 && selectedWallets.length === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
          <FiAlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              No perp accounts available
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              To trade perpetuals, deposit at least 10 USDC and approve an agent wallet in the Perp tab of your Wallet Manager.
            </p>
          </div>
        </div>
      )}

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

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
            {selectedWallets.map((wallet) => {
              const address = wallet.address.toLowerCase();
              const data = walletDataMap[address];

              const estimates = estimatesByWallet[address] || {
                estCost: BigInt(0),
                estAmount: BigInt(0),
                estFeeAmount: BigInt(0),
                estFeeByToken: {},
              };

              // Calculate which grids belong to this wallet
              const walletGrids = Object.entries(gridsByWallet)
                .filter(([, w]) => w._id === wallet._id)
                .map(([sl]) => Number(sl));

              return (
                <WalletCard
                  key={wallet._id}
                  wallet={wallet}
                  walletData={data}
                  isLoading={loadingWallets.has(wallet._id)}
                  isSelected={true}
                  onRemove={handleRemoveWallet}
                  onDeposit={handleOpenDeposit}
                  onApproveAgent={handleApproveAgentForWallet}
                  protocol={protocol}
                  collateralToken={collateralToken}
                  feeToken={feeToken}
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
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed transition-all duration-300 text-sm font-semibold shadow-sm hover:shadow-md ${showWalletSelector
          ? "border-red-300/60 bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/40"
          : "border-blue-300/80 hover:border-blue-400/80 bg-blue-50/40 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/40 hover:-translate-y-0.5"
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

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
            {availableWalletsList.map(({ wallet, data }) => (
              <WalletCard
                key={wallet._id}
                wallet={wallet}
                walletData={data}
                isLoading={loadingWallets.has(wallet._id)}
                isSelected={false}
                onSelect={handleSelectWallet}
                onRemove={handleRemoveWallet}
                onDeposit={handleOpenDeposit}
                onApproveAgent={handleApproveAgentForWallet}
                protocol={protocol}
                collateralToken={collateralToken}
                feeToken={feeToken}
                estOrders={estOrders}
                selectedGrids={[]}
                chainId={chainId}
              />
            ))}
            {availableWalletsList.length === 0 && (
              <div className="text-center py-6 px-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 mb-3">
                  <FiAlertCircle className="w-6 h-6 text-amber-500" />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  No wallets ready for perp trading
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                  To start trading perpetuals on {protocol}, you need to:
                </p>
                <ol className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-left max-w-xs mx-auto space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">1.</span>
                    <span>Deposit at least 10 USDC to your perp account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold">2.</span>
                    <span>Approve an agent wallet for {protocol}</span>
                  </li>
                </ol>
                <p className="text-[10px] text-gray-400 mt-3">
                  Go to the Perp tab in your Wallet Manager to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {isDepositOpen && depositWallet && (
        <PerpAccountDeposit
          isOpen={isDepositOpen}
          onClose={handleCloseDeposit}
          wallet={depositWallet}
          chainId={chainId}
          protocol={protocol}
          collateralToken={collateralToken}
          perpBalance={depositBalance}
          onDeposit={handleExecuteDeposit}
        />
      )}
    </div>
  );
};

export default WalletSelector;