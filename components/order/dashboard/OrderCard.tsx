import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { TbSettingsExclamation } from "react-icons/tb";
import {
  FiClock,
  FiCheckCircle,
  FiCopy,
  FiX,
  FiActivity,
  FiInfo,
  FiDollarSign,
  FiCreditCard,
} from "react-icons/fi";
import { IoIosArrowDropdown, IoIosArrowDropright } from "react-icons/io";
import { motion } from "framer-motion";
import { formatUnits } from "ethers";
import toast from "react-hot-toast";

import ToolTip from "@/components/tradeBox/TradeBoxCommon/BoxTooltip"
import OrderAction from "@/components/order/dashboard/OrderAction";
import LogicSummary from "@/components/order/common/LogicDisplay";
import type { ORDER_TYPE } from "@/type/order";
import type { MarketSnapshotRef } from "@/type/market";
import {
  formatCustomizeTime,
  formateAmountWithFixedDecimals,
  safeFormatNumber,
  safeParseUnits,
} from "@/utility/handy";
import { displayNumber } from "@/utility/displayPrice";
import { PRECISION, PRECISION_DECIMALS } from "@/constants/common/utils";
import { calculatePnl } from "@/utility/orderUtility";

const STATUS_ICONS = {
  PENDING: <FiClock className="w-4 h-4 text-yellow-500" />,
  PROCESSING: <TbSettingsExclamation className="w-4 h-4 text-yellow-500" />,
  OPENED: <FiActivity className="w-4 h-4 text-blue-500 dark:text-white" />,
  COMPLETED: <FiCheckCircle className="w-4 h-4 text-green-500" />,
  CLOSED: <FiCheckCircle className="w-4 h-4 text-green-500" />,
  REVERTED: <FiX className="w-4 h-4 text-red-500" />,
  CANCELLED: <FiX className="w-4 h-4 text-red-500" />,
} as const;

interface OrderCardProps {
  order: ORDER_TYPE;
  marketSnapshotRef?: MarketSnapshotRef;
}

const OrderCard = ({ order, marketSnapshotRef }: OrderCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [livePriceUsd, setLivePriceUsd] = useState(
    () => marketSnapshotRef?.current?.priceUsd || "0",
  );
  const [liveMarkPrice, setLiveMarkPrice] = useState(
    () => marketSnapshotRef?.current?.markPrice || 0,
  );

  const syncLiveMarketState = useCallback(() => {
    const nextPriceUsd = marketSnapshotRef?.current?.priceUsd || "0";
    const nextMarkPrice = marketSnapshotRef?.current?.markPrice || 0;

    setLivePriceUsd((previous) =>
      previous === nextPriceUsd ? previous : nextPriceUsd,
    );
    setLiveMarkPrice((previous) =>
      previous === nextMarkPrice ? previous : nextMarkPrice,
    );
  }, [marketSnapshotRef]);

  useEffect(() => {
    syncLiveMarketState();
  }, [syncLiveMarketState, order._id]);

  useEffect(() => {
    if (!marketSnapshotRef) {
      return undefined;
    }

    syncLiveMarketState();
    const intervalId = window.setInterval(syncLiveMarketState, 1000);

    return () => window.clearInterval(intervalId);
  }, [marketSnapshotRef, syncLiveMarketState]);

  const copyWalletAddress = useCallback(() => {
    if (!order?.wallet?.address) return;
    navigator.clipboard.writeText(order.wallet.address);
    toast.success("Wallet address copied");
  }, [order?.wallet?.address]);

  const copyOrderId = useCallback(() => {
    if (!order?._id) return;
    navigator.clipboard.writeText(order._id);
    toast.success("Order ID copied");
  }, [order?._id]);

  const formatUSD = useCallback((value: string | bigint) => {
    if (!value) return "$0.00";
    const num = Number(
      safeFormatNumber(value.toString(), PRECISION_DECIMALS, 6),
    );
    return <div className="flex gap-1">${displayNumber(num)}</div>;
  }, []);

  if (!order) return null;

  const isSpot = order.category === "spot";
  const orderData = isSpot ? order.spot : order.perp;
  const perpSymbolInfo =
    (order.perp?.orderAsset as any)?.perpSymbolInfo ||
    (order.perp?.orderAsset as any)?.parsedSymbolInfo;
  const amountToken = isSpot
    ? (orderData?.orderAsset as any)?.orderToken
    : perpSymbolInfo;
  const collateralToken = orderData?.orderAsset?.collateralToken;
  const entryPrice =
    order.perp?.entryPrice ||
    order.additional?.entryPrice ||
    order?.entry?.priceLogic?.threshold?.toString() ||
    "0";
  const exitPrice = order.additional?.exitPrice;
  const realizedPnl = order.additional?.realizedPnl || '0';
  const message = order.message;

  const totalCost = useMemo(() => {
    return BigInt(order.feeInUsd || 0) + BigInt(order.payInUsd || 0);
  }, [order.feeInUsd, order.payInUsd]);

  const formattedAmount = useMemo(() => {
    if (order.category === "spot") {
      return displayNumber(
        Number(
          formatUnits(
            BigInt((orderData?.amount as any)?.tokenAmount || 0),
            amountToken?.decimals || 18,
          ),
        ),
      );
    }

    return order.perp?.quantity || "0";
  }, [
    amountToken?.decimals,
    order.category,
    order.perp?.quantity,
    orderData?.amount,
  ]);

  const formattedSize = useMemo(() => {
    return displayNumber(
      Number(
        formatUnits(
          BigInt((orderData?.amount as any)?.orderSize || 0),
          collateralToken?.decimals || 18,
        ),
      ),
    );
  }, [collateralToken?.decimals, orderData?.amount]);

  const pnl = useMemo(() => {
    if (isSpot) {
      if (order.orderType !== "SELL") return BigInt(0);

      const tokenAmount = BigInt(order.spot?.amount?.tokenAmount || 0);
      if (tokenAmount === BigInt(0)) return BigInt(0);

      const currentPriceUsd = safeParseUnits(livePriceUsd || "0", PRECISION_DECIMALS);
      if (currentPriceUsd === BigInt(0)) return BigInt(0);

      // soldValue = currentPrice × tokenAmount (respecting token decimals via PRECISION)
      const soldValue = (currentPriceUsd * tokenAmount) / PRECISION;
      // Cost = what was paid + 2× fee (open fee already paid + estimated close fee)
      const payInUsd = BigInt(order.payInUsd || 0);
      const doubleFees = BigInt(order.feeInUsd || 0) * BigInt(2);
      return soldValue - payInUsd - doubleFees;
    }

    if (order.orderStatus !== "OPENED") return BigInt(0);

    const markPriceUsd = safeParseUnits(
      liveMarkPrice > 0 ? String(liveMarkPrice) : livePriceUsd || "0",
      PRECISION_DECIMALS,
    );
    const normalizedEntryPrice = BigInt(entryPrice || "0");
    if (markPriceUsd === BigInt(0) || normalizedEntryPrice === BigInt(0)) {
      return BigInt(0);
    }

    // Perp net unrealized PnL = raw position PnL − 2× fee (open already paid + estimated close)
    const rawPnl = calculatePnl({
      entryPrice: normalizedEntryPrice,
      markPrice: markPriceUsd,
      quantity: order.perp?.quantity || "0",
      isLong: order.perp?.isLong !== false,
    });



    const estimatedRoundTripFees = BigInt(order.feeInUsd || 0) * BigInt(2);
    return rawPnl - estimatedRoundTripFees;
  }, [
    entryPrice,
    isSpot,
    liveMarkPrice,
    livePriceUsd,
    order.feeInUsd,
    order.orderStatus,
    order.orderType,
    order.perp?.isLong,
    order.perp?.quantity,
    order.spot?.amount?.tokenAmount,
    totalCost,
  ]);

  const shouldShowPnl = useMemo(() => {
    if (isSpot) {
      return order.orderType === "SELL" && pnl !== BigInt(0);
    }

    return order.orderStatus === "OPENED" && pnl !== BigInt(0);
  }, [isSpot, order.orderStatus, order.orderType, pnl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="px-4 py-2 lg:p-4">
        <div className="flex items-center justify-between">
          <div
            className="grow flex flex-col justify-start items-start cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-1">
              {STATUS_ICONS[order.orderStatus] || STATUS_ICONS.PENDING}
              <div
                className={`flex gap-1 items-center font-semibold ${order.category.split(":")[0] === "perpetual"
                  ? "text-blue-500"
                  : order.category.split(":")[0] === "spot"
                    ? "text-yellow-500"
                    : "text-gray-800 dark:text-gray-200"
                  }`}
              >
                {order.category === "perpetual" && (
                  <span
                    className={`text-xs font-bold ${order.perp?.isLong === false
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                      }`}
                  >
                    {order.perp?.isLong ? "LONG" : "SHORT"}
                  </span>
                )}
                <span>
                  {order.category === "spot" && order.spot?.orderAsset?.orderToken
                    ? `${order.spot.orderAsset.orderToken.symbol} |`
                    : order.category === "perpetual" && order.perp?.orderAsset?.symbol
                      ? `${order.perp.orderAsset.symbol} |`
                      : ""}
                </span>
                <span>{order._id?.slice(-6)}</span>
                <button
                  onClick={copyOrderId}
                  className="text-blue-500 hover:text-blue-600"
                  title="Copy Order ID"
                >
                  <FiCopy className="text-xs" />
                </button>
              </div>
              {isExpanded ? <IoIosArrowDropright /> : <IoIosArrowDropdown />}
            </div>
          </div>
          <OrderAction order={order} />
        </div>

        {isExpanded && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 items-center gap-4 mb-3">
              <div>
                <span className="text-xs text-gray-500">Entry Criteria</span>
                {order?.entry?.isTechnicalEntry === true ? (
                  <div className="overflow-x-auto pb-1 scrollbar-thin">
                    <LogicSummary node={order?.entry?.technicalLogic!} />
                  </div>
                ) : order?.entry?.priceLogic?.threshold ? (
                  <div className="flex gap-1 items-center">
                    <LogicSummary
                      node={{
                        ...order?.entry?.priceLogic,
                        threshold: Number(
                          safeFormatNumber(
                            order?.entry?.priceLogic.threshold.toString(),
                            PRECISION_DECIMALS,
                            6,
                          ),
                        ),
                      }}
                    />
                  </div>
                ) : (
                  "_"
                )}
              </div>

              <div>
                <span className="text-xs text-gray-500">Order Size</span>
                <div className="text-sm font-medium flex items-center gap-1">
                  {formattedSize}
                  <p>{collateralToken?.symbol || "UNK"}</p>
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500">Exit Criteria</span>
                <div className="text-sm font-medium flex items-center gap-1">
                  {order.exit.isTechnicalExit ? (
                    <div className="flex flex-col gap-1 max-w-[240px]">
                      <div className="overflow-x-auto pb-1 scrollbar-thin">
                        <LogicSummary node={order.exit.technicalLogic!} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {order.exit.takeProfit.takeProfitPrice !== "0" ? (
                        <div className="flex gap-2 items-center">
                          <span className="text-xs font-bold text-yellow-500 flex items-center gap-1">
                            TP
                          </span>
                          <div className="flex gap-1 text-sm font-medium">
                            at:{" "}
                            <span className="text-green-500">
                              <LogicSummary
                                node={{
                                  id: 'Price',
                                  type: 'takeprofit',
                                  operator: order.exit.takeProfit.operator,
                                  threshold: Number(
                                    safeFormatNumber(
                                      order.exit.takeProfit.takeProfitPrice.toString(),
                                      PRECISION_DECIMALS,
                                      6,
                                    ),
                                  ),
                                }}
                              />
                            </span>{" "}
                            with{" "}
                            <span className="text-green-500">
                              {formatUSD(order.exit.takeProfit.profit)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-yellow-500 font-bold">
                            TP%
                          </span>
                          <div className="text-sm font-medium text-green-600">
                            {Math.floor(
                              order.exit.takeProfit.takeProfitPercentage / 100,
                            )}
                            %
                          </div>
                        </div>
                      )}
                      {order.exit.stopLoss.isActive &&
                        (order.exit.stopLoss.stopLossPrice !== "0" ? (
                          <div>
                            <span className="text-xs text-red-500 flex items-center gap-1">
                              SL
                            </span>
                            <div className="text-sm font-medium">
                              <LogicSummary
                                node={{
                                  id: 'Price',
                                  type: 'stoploss',
                                  operator: order.exit.stopLoss.operator,
                                  threshold: Number(
                                    safeFormatNumber(
                                      order.exit.stopLoss.stopLossPrice.toString(),
                                      PRECISION_DECIMALS,
                                      6,
                                    ),
                                  ),
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs text-gray-500">SL</span>
                            <div className="text-sm font-medium text-red-600">
                              {formateAmountWithFixedDecimals(
                                order.exit.stopLoss.stopLossPercentage,
                                2,
                                2,
                              )}
                              %
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span title={order.wallet?.address}>
                  {order.wallet?.address?.slice(0, 6)}...
                  {order.wallet?.address?.slice(-4)}
                </span>
                <button
                  onClick={copyWalletAddress}
                  className="text-blue-500 hover:text-blue-600"
                  title="Copy wallet address"
                >
                  <FiCopy className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-gray-500 font-mono">
                {formatCustomizeTime(order.createdAt)}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <FiDollarSign className="w-3 h-3" /> Amount
                </span>
                <div className="text-sm font-medium flex items-center gap-1">
                  {formattedAmount} {amountToken?.symbol || "UNK"}
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <FiCreditCard className="w-3 h-3" /> Total Cost
                </span>
                <div className="text-sm font-mono font-medium">
                  {formatUSD(totalCost)}
                </div>
              </div>

              {entryPrice && entryPrice !== "0" && (
                <div>
                  <span className="text-xs text-gray-500">Entry at</span>
                  <div className="text-sm font-medium flex items-center gap-1">
                    {formatUSD(entryPrice)}
                  </div>
                </div>
              )}

              {shouldShowPnl && (
                <div>
                  <span className="text-xs text-gray-500">
                    {isSpot ? "Est. P&L" : "Est. Net Unrealized P&L"}
                    <ToolTip id="est-pnl-tooltip" content={isSpot ? "Est. P&L" : "Estimated unrealized pnl excluding buffer fee(open & close). Fee calculate not including dex funding rate on close dex will apply some extra fee on top"} />
                  </span>
                  <div
                    className={`text-sm font-medium flex items-center gap-1 ${pnl > BigInt(0)
                      ? "text-green-500"
                      : pnl < BigInt(0)
                        ? "text-red-500"
                        : ""
                      }`}
                  >
                    {formatUSD(pnl)}
                  </div>
                </div>
              )}

              {exitPrice && (
                <div>
                  <span className="text-xs text-gray-500">Exit at</span>
                  <div className="text-sm font-medium flex items-center gap-1">
                    {formatUSD(exitPrice)}
                  </div>
                </div>
              )}

              {realizedPnl && (
                <div>
                  <span className="text-xs text-gray-500">Realized P&L</span>
                  <div className="text-sm font-medium flex items-center gap-1">
                    {formatUSD(realizedPnl)}
                  </div>
                </div>
              )}

              {order.category === "perpetual" && order.perp?.leverage && (
                <div>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    Leverage & DEX
                  </span>
                  <div className="text-sm font-medium flex items-center gap-1.5 uppercase">
                    <span
                      className={`text-[15px] font-bold ${order.perp.leverage > 100000
                        ? "text-orange-500"
                        : "text-blue-500"
                        }`}
                    >
                      {order.perp.leverage}x
                    </span>
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 rounded text-gray-500">
                      <img
                        src={
                          order.perp.protocol === "asterdex"
                            ? "https://static.asterindex.com/cloud-futures/static/images/aster/logo.svg"
                            : order.perp.protocol === "hyperliquid"
                              ? "./hyperliquidWhite.svg"
                              : "./gmx.svg"
                        }
                        alt="DEX"
                        className="w-15 h-10"
                      />
                    </span>
                  </div>
                </div>
              )}

              {message && (
                <div className="col-span-full flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg mt-2">
                  <FiInfo className="w-4 h-4 flex-shrink-0" />
                  <span>{message}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

const areEqualOrderCardProps = (
  previous: OrderCardProps,
  next: OrderCardProps,
) => {
  return (
    previous.order === next.order &&
    previous.marketSnapshotRef === next.marketSnapshotRef
  );
};

export default memo(OrderCard, areEqualOrderCardProps);
