import { ZeroAddress } from "ethers";
import { ORDER_TYPE, OrderTokenType } from "@/type/order";
import {
  ORDER_FEE_COLLECTION_GAS_FEE,
  ORDER_TRADE_FEE,
  ORDER_TRADE_FEE_EXEMPT_STATUS,
} from "@/constants/common/order";
import {
  BASIS_POINT_DIVISOR_BIGINT,
  PRECISION_DECIMALS,
} from "@/constants/common/utils";
import { safeParseUnits } from "@/utility/handy";

// ============================================================================
// ORDER MATH & GRID CALCULATIONS
// ============================================================================

export function getGridMultiplierNthValue({
  initialValue,
  multiplier,
  n,
}: {
  initialValue: bigint;
  multiplier: number;
  n: number;
}) {
  if (n === 1) return initialValue;

  const multiplierBase = BigInt(Math.round(multiplier * 100));
  const divisor = BigInt(100);

  const power = BigInt(n - 1);
  const numerator = multiplierBase ** power;
  const denominator = divisor ** power;

  return (initialValue * numerator) / denominator;
}

export function getGridNthPrice({
  entryPrice,
  gridDistance,
  gridMultiplier,
  n,
  decrement = true,
}: {
  entryPrice: bigint;
  gridDistance: number;
  gridMultiplier: number;
  n: number;
  decrement: boolean;
}) {
  const bigX = BigInt(Math.round(gridDistance));
  const bigY = BigInt(Math.round(gridMultiplier));
  const bigN = BigInt(n);

  if (n === 1) return entryPrice;

  const rotationFactor = bigY ** (bigN - BigInt(1)) - BigInt(1);
  const totalDropPercent = bigX * rotationFactor;

  const percentagePrice = (entryPrice * totalDropPercent) / BigInt(100);
  const Price = decrement
    ? entryPrice - percentagePrice
    : entryPrice + percentagePrice;

  return Price;
}

export function calculateEstLiquidationPrice(
  entryPriceUsd: number,
  leverage: number,
  isLong: boolean,
  maintenanceMarginRateBps: number,
  assetTickSize: number = 0.01 // Optional: round to asset precision
): number | null {
  if (entryPriceUsd <= 0 || leverage <= 0) return null;

  const mm = maintenanceMarginRateBps / 10000;
  const im = 1 / leverage;

  let liqPrice: number;

  if (isLong) {
    // We add a tiny 0.1% buffer to be safer than the protocol
    liqPrice = entryPriceUsd * (1 - im + mm);
  } else {
    liqPrice = entryPriceUsd * (1 + im - mm);
  }

  if (liqPrice <= 0 && isLong) return 0;

  // Clean up JavaScript floating point math
  const multiplier = 1 / assetTickSize;
  return Math.round(liqPrice * multiplier) / multiplier;
}

export type OpenOrderPnLResult = {
  rawPnl: number;
  realDexPnl: number;
  netUnrealizedPnl: number;
};

/**
 * Prices and quantity in compatible USD / coin units; fees and margin in USD.
 */
export function calculateOpenOrderPnL(
  entryPriceUsd: number,
  markPriceUsd: number,
  quantity: number,
  isLong: boolean,
  accumulatedFeesUsd: number,
  initialMarginUsd: number,
): OpenOrderPnLResult {
  const dir = isLong ? 1 : -1;
  const rawPnl = (markPriceUsd - entryPriceUsd) * quantity * dir;
  const realDexPnl = rawPnl - accumulatedFeesUsd;
  const netUnrealizedPnl = realDexPnl - initialMarginUsd;
  return { rawPnl, realDexPnl, netUnrealizedPnl };
}

// ============================================================================
// ORDER ADAPTER & NORMALIZATION
// ============================================================================

export const getOrderProtocol = (order: ORDER_TYPE) => {
  return order?.protocol || order?.perp?.protocol;
};

export const getOrderIndexTokenAddress = (order: ORDER_TYPE) => {
  return (
    order?.indexTokenAddress ||
    order?.spot?.orderAsset?.orderToken?.address ||
    (order?.perp?.orderAsset as any)?.persedSymbolInfo?.address ||
    (order?.perp?.orderAsset as any)?.perpSymbolInfo?.address ||
    (order?.perp?.orderAsset as any)?.symbol ||
    ""
  );
};

export const isActiveClientOrder = (order: ORDER_TYPE) => {
  if (order?.isActive === false) return false;

  return ["PENDING", "OPENED", "PROCESSING"].includes(order?.orderStatus || "");
};

export const getOrderPerpetual = (order: ORDER_TYPE) => {
  return order?.perp;
};

export const ORDER_TRADE_FEE_BIGINT = BigInt(ORDER_TRADE_FEE)

// ============================================================================
// STABLE TOKEN / COLLATERAL GUARDS
// ============================================================================

/**
 * Returns true when the token is explicitly flagged as stable.
 * A missing or falsy `isStable` field is treated as non-stable so that
 * tokens without metadata never silently pass the guard.
 */
export const isStableToken = (token: OrderTokenType | null | undefined): boolean => {
  return token?.isStable === true;
};

/**
 * Validates that `token` is a stable token that may be used as collateral.
 * Returns false (instead of throwing) so callers can branch cleanly.
 *
 * Rules:
 *  - token must be present
 *  - token.isStable must be strictly true
 */
export const validateCollateralIsStable = (token: OrderTokenType | null | undefined): boolean => {
  if (!token) return false;
  return isStableToken(token);
};

// ============================================================================
// ORDER FEE UTILITIES
// ============================================================================

export const isTradeFeeExemptStatus = (status?: string | null) => {
  if (!status) return false;
  return ORDER_TRADE_FEE_EXEMPT_STATUS.includes(status.toLowerCase());
};

export const shouldRenderFeeTokenSelector = (status?: string | null) => {
  return !status || !isTradeFeeExemptStatus(status);
};

export const getDefaultFeeToken = <T extends OrderTokenType>(tokens: T[] = []) => {
  if (!tokens.length) return null;

  return (
    tokens.find((token: any) => token?.isStable) ||
    tokens.find((token) => token.address !== ZeroAddress) ||
    tokens[0]
  );
};


export const getOrderFeeCollectionCount = (order: Partial<ORDER_TYPE>) => {
  if (order.category === "perpetual" || order.category === "futures") {
    return order.orderStatus === "OPENED" ? 1 : 2;
  }
  if (order.category === "spot") {
    return order.orderType === "SELL" ? 1 : 2;
  }
  return 1;
};

export const getOrderExecutionGasCount = (order: Partial<ORDER_TYPE>) => {
  if (order.category !== "spot") return 0;
  return order.orderType === "SELL" ? 1 : 2;
};

export const getFeeCollectionGasFee = (chainId: number) => {
  return ORDER_FEE_COLLECTION_GAS_FEE[chainId] || BigInt(0);
};

// ============================================================================
// FUND HELPERS
// ============================================================================

export const getTradeFee = (userStatus: string) => {
  if (!isTradeFeeExemptStatus(userStatus)) {
    return BigInt(ORDER_TRADE_FEE);
  } else {
    return BigInt(0);
  }
};

export const calculateWalletTokenAllocation = ({
  orders,
  walletId,
  tokenAddress,
}: { orders: ORDER_TYPE[], walletId: string, tokenAddress: string }) => {
  if (orders.length == 0) return BigInt(0);
  let totalAllocation = BigInt(0);
  orders.forEach((order) => {
    if (
      order.wallet._id === walletId &&
      isActiveClientOrder(order)
    ) {
      if (order.category == 'spot') {
        if (order.orderType == 'BUY' && order.orderStatus != 'PROCESSING' && order.spot?.orderAsset?.collateralToken?.address?.toLowerCase() == tokenAddress.toLowerCase()) {
          totalAllocation += BigInt(order.spot?.amount?.orderSize || 0);
        }
        if (order.orderType == 'SELL' && order.orderStatus != 'PROCESSING' && order.spot?.orderAsset?.orderToken?.address?.toLowerCase() == tokenAddress.toLowerCase()) {
          totalAllocation += BigInt(order.spot?.amount?.tokenAmount || 0);
        }
      }

      // Track fee token allocations for ALL order categories (spot + perpetual).
      //
      // Previously only perpetual orders were tracked here, which caused the
      // available-balance calculation for spot wallets to be systematically
      // over-estimated: existing spot fee reservations were invisible, making
      // it possible to place an order that the wallet cannot actually fund.
      //
      // NOTE: for a spot BUY order where feeToken == collateralToken the
      // order-size amount is already counted above, and the fee amount is an
      // *additional* reservation from the same pool, so both must be summed.
      if (!isTradeFeeExemptStatus(order.user?.status)) {
        if (order.feeToken?.address &&
          order.feeToken.address.toLowerCase() == tokenAddress.toLowerCase()) {
          totalAllocation += BigInt(order.feeToken?.amount || 0);
        }
      }
    }
  })
  return totalAllocation;
}

// ============================================================================
// WALLET LOCKS / COSTS (used by wallet selectors)
// ============================================================================

export type OrderCosts = {
  // For perp flows (uses DEX collateral account)
  dexOrderAmount: bigint;
  // For spot flows (uses wallet balance)
  walletOrderAmount: bigint;
  // Native token gas required for execution
  orderGasFee: bigint;
  // Optional fee token reservation
  feeTokenAmount: bigint;
  feeTokenAddress?: string;
};

const toBigIntSafe = (value: unknown): bigint => {
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
    if (typeof value === "string" && value.trim() !== "") return BigInt(value);
  } catch {
    // ignore
  }
  return BigInt(0);
};

/**
 * Conservative cost breakdown used by wallet selectors to validate balances.
 * It intentionally prefers "safe defaults" over exact protocol math so UI
 * doesn't crash if some fields are missing.
 */
export const getOrderCosts = ({
  order,
  collateralTokenAddress,
  gasFee,
  user,
  treatCollateralTokenAsWalletBalance,
}: {
  order: ORDER_TYPE;
  collateralTokenAddress: string;
  gasFee: bigint;
  user: any;
  treatCollateralTokenAsWalletBalance: boolean;
}): OrderCosts => {
  const feeTokenAddress = order?.feeToken?.address?.toLowerCase?.();

  const orderGasFee = gasFee || BigInt(0);

  const collateralLower = (collateralTokenAddress || ZeroAddress).toLowerCase();
  const isNativeCollateral = collateralLower === ZeroAddress.toLowerCase();

  let walletOrderAmount = BigInt(0);
  let dexOrderAmount = BigInt(0);

  if (order?.category === "spot") {
    // Spot BUY reserves collateral amount; Spot SELL reserves tokenAmount.
    if (order.orderType === "BUY") {
      walletOrderAmount = toBigIntSafe(order?.spot?.amount?.orderSize);
    } else {
      walletOrderAmount = toBigIntSafe(order?.spot?.amount?.tokenAmount);
    }
  } else {
    // Perp reserves orderSize (margin in base units) or quantity.
    dexOrderAmount =
      toBigIntSafe(order?.perp?.amount?.orderSize) ||
      toBigIntSafe(order?.perp?.quantity) ||
      BigInt(0);
  }

  // ---------------------------------------------------------------------------
  // Fee token amount resolution
  //
  // Perp orders have feeToken.amount set at build time (useOrder.ts).
  // Spot estimated orders do NOT — they carry only the feeToken descriptor
  // (address, symbol, decimals) with no amount field.
  //
  // When feeToken.amount is missing or zero we derive it from the order's own
  // collateral/token amount using the platform trade-fee rate.  This mirrors
  // exactly what the perp builder does and ensures the wallet-selector card
  // and readiness check always show a meaningful fee estimate for spot orders.
  // ---------------------------------------------------------------------------
  let feeTokenAmount = toBigIntSafe(order?.feeToken?.amount);

  if (feeTokenAmount === BigInt(0) && feeTokenAddress) {
    // Pick the raw order size in the appropriate token units.
    const rawOrderAmount =
      order?.category === "spot"
        ? order.orderType === "BUY"
          ? toBigIntSafe(order?.spot?.amount?.orderSize)
          : toBigIntSafe(order?.spot?.amount?.tokenAmount)
        : toBigIntSafe(order?.perp?.amount?.orderSize) ||
        toBigIntSafe(order?.perp?.quantity);

    if (rawOrderAmount > BigInt(0)) {
      feeTokenAmount =
        (rawOrderAmount * ORDER_TRADE_FEE_BIGINT) / BASIS_POINT_DIVISOR_BIGINT;
    }
  }

  // Some flows treat collateral as wallet balance even for non-spot (legacy behavior).
  if (
    treatCollateralTokenAsWalletBalance &&
    dexOrderAmount > BigInt(0) &&
    walletOrderAmount === BigInt(0)
  ) {
    walletOrderAmount = dexOrderAmount;
    dexOrderAmount = BigInt(0);
  }

  // If collateral is native, it is paid from the same pool as gas in wallet selectors.
  if (
    isNativeCollateral &&
    walletOrderAmount === BigInt(0) &&
    dexOrderAmount > BigInt(0)
  ) {
    walletOrderAmount = dexOrderAmount;
    dexOrderAmount = BigInt(0);
  }

  // If user is fee-exempt in the app's rules, ignore fee token reservation.
  const isFeeExempt =
    typeof user?.status === "string" &&
    ORDER_TRADE_FEE_EXEMPT_STATUS.includes(user.status.toLowerCase());

  return {
    dexOrderAmount,
    walletOrderAmount,
    orderGasFee,
    feeTokenAmount: isFeeExempt ? BigInt(0) : feeTokenAmount,
    feeTokenAddress: isFeeExempt ? undefined : feeTokenAddress,
  };
};

export const calculateExistingLockedFunds = (
  orders: ORDER_TYPE[],
  walletId: string,
  collateralTokenAddress: string,
  gasFee: bigint,
  user: any,
  treatCollateralTokenAsWalletBalance: boolean,
) => {
  const lockedFundBalanceByWallet = new Map<string, bigint>();
  const walletCollateralPendingByWallet = new Map<string, bigint>();
  const dexCollateralPendingByWallet = new Map<string, Record<string, bigint>>();
  const feeTokenPendingByWallet = new Map<string, Record<string, bigint>>();
  const activeCountByWallet = new Map<string, number>();

  const ensureFeeTokenMap = (wid: string) => {
    const existing = feeTokenPendingByWallet.get(wid);
    if (existing) return existing;
    const created: Record<string, bigint> = {};
    feeTokenPendingByWallet.set(wid, created);
    return created;
  };

  const ensureDexMap = (wid: string) => {
    const existing = dexCollateralPendingByWallet.get(wid);
    if (existing) return existing;
    const created: Record<string, bigint> = {};
    dexCollateralPendingByWallet.set(wid, created);
    return created;
  };

  (orders || []).forEach((order) => {
    const wid = String(order?.wallet?._id ?? order?.wallet ?? "");
    if (!wid || wid !== String(walletId)) return;
    if (!isActiveClientOrder(order)) return;

    activeCountByWallet.set(wid, (activeCountByWallet.get(wid) || 0) + 1);

    const costs = getOrderCosts({
      order,
      collateralTokenAddress,
      gasFee,
      user: order?.user ?? user,
      treatCollateralTokenAsWalletBalance,
    });

    lockedFundBalanceByWallet.set(
      wid,
      (lockedFundBalanceByWallet.get(wid) || BigInt(0)) +
      (costs.orderGasFee || BigInt(0)),
    );

    if (costs.walletOrderAmount > BigInt(0)) {
      walletCollateralPendingByWallet.set(
        wid,
        (walletCollateralPendingByWallet.get(wid) || BigInt(0)) +
        costs.walletOrderAmount,
      );
    }

    if (costs.dexOrderAmount > BigInt(0)) {
      const protocolKey = (getOrderProtocol(order) || "").toLowerCase();
      const dexMap = ensureDexMap(wid);
      dexMap[protocolKey] = (dexMap[protocolKey] || BigInt(0)) + costs.dexOrderAmount;
    }

    if (costs.feeTokenAmount > BigInt(0) && costs.feeTokenAddress) {
      const addr = costs.feeTokenAddress.toLowerCase();
      const feeMap = ensureFeeTokenMap(wid);
      feeMap[addr] = (feeMap[addr] || BigInt(0)) + costs.feeTokenAmount;
    }
  });

  const wid = String(walletId);
  return {
    totalActiveOrders: activeCountByWallet.get(wid) || 0,
    lockedFundBalance: lockedFundBalanceByWallet.get(wid) || BigInt(0),
    walletCollateralPending: walletCollateralPendingByWallet.get(wid) || BigInt(0),
    dexCollateralPending: dexCollateralPendingByWallet.get(wid) || {},
    feeTokenPending: feeTokenPendingByWallet.get(wid) || {},
  };
};

// ============================================================================
// CLIENT NORMALIZATION
// ============================================================================

/**
 * Normalizes orders coming from API responses into a stable client shape.
 * This is intentionally minimal: it fills common missing fields and ensures
 * nested objects exist so components don't crash on undefined access.
 */
export const normalizeClientOrders = (orders: any[] = []): ORDER_TYPE[] => {
  return (orders || [])
    .filter(Boolean)
    .map((o: any) => {
      const order: any = { ...o };

      order.wallet = order.wallet ?? {};
      order.user = order.user ?? {};

      // Defaults
      order.isActive = order.isActive ?? true;
      order.isBusy = order.isBusy ?? false;
      order.priority = order.priority ?? 0;
      order.slippage = order.slippage ?? 0;
      order.executionSpeed = order.executionSpeed ?? "standard";

      // Ensure nested objects exist
      order.entry = order.entry ?? { isTechnicalEntry: false };
      order.exit = order.exit ?? {
        takeProfit: { profit: "0", takeProfitPercentage: 0, takeProfitPrice: "0" },
        stopLoss: { isActive: false, save: "0", stopLossPrice: "0", stopLossPercentage: 0 },
        isTechnicalExit: false,
      };

      // Normalize common ids
      if (order.wallet && order.wallet._id == null && order.walletId != null) {
        order.wallet._id = order.walletId;
      }

      // Fee token amount may arrive as number; keep as string for type compat
      if (order.feeToken && typeof order.feeToken.amount !== "string") {
        order.feeToken.amount = String(order.feeToken.amount ?? "0");
      }

      return order as ORDER_TYPE;
    });
};