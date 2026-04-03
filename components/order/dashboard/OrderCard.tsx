import { useState, useCallback, useMemo } from "react";
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

import { motion } from "framer-motion";
import toast from "react-hot-toast";
import OrderAction from "@/components/order/dashboard/OrderAction";
import LogicSummary from "@/components/order/common/LogicDisplay";
import { ORDER_TYPE } from "@/type/order";
import {
  formatCustomizeTime,
  formateAmountWithFixedDecimals,
  safeFormatNumber,
} from "@/utility/handy";
import { displayNumber } from "@/utility/displayPrice";
import {
  BASIS_POINT_DIVISOR,
  PRECISION_DECIMALS,
} from "@/constants/common/utils";
import { formatUnits } from "ethers";

// Constant status icons
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
  isGmxPosition?: boolean;
  orderGmxPositionData: Record<string, any>;
  indexTokenInfo?: any;
}

const OrderCard = ({ order, orderGmxPositionData }: OrderCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Memoize combined order with GMX data to prevent unnecessary re-renders of OrderAction
  const orderWithPosition = useMemo(
    () => ({ ...order, ...(order._id ? orderGmxPositionData[order._id] : {}) }),
    [order, orderGmxPositionData],
  );

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

  const renderOrderSize = useCallback(() => {
    if (!order?.orderType) return "—";
    const isCollateral = !(
      order.orderType === "BUY" && order.category === "spot"
    );
    const orderData = order.category === "spot" ? order.spot : order.perp;
    const orderAsset = orderData?.orderAsset;
    const amount = orderData?.amount;
    if (!orderAsset || !amount) return "—";

    const token = isCollateral
      ? orderAsset.collateralToken
      : (orderAsset as any).orderToken;
    const size = isCollateral
      ? amount.orderSize
      : (amount as any).tokenAmount;
    if (!size || !token) return "—";
    return (
      <>
        {displayNumber(Number(formatUnits(BigInt(size), token.decimals)))}
        <span className="text-xs text-gray-500 ml-1">{token.symbol}</span>
      </>
    );
  }, [order]);

  const formatUSD = useCallback((value: string | bigint) => {
    if (!value) return "$0.00";
    const num = Number(
      safeFormatNumber(value.toString(), PRECISION_DECIMALS, 6),
    );
    return <p className="flex gap-1">${displayNumber(num)}</p>;
  }, []);

  const totalCost = useMemo(() => {
    if (order.category === "spot" && order.spot?.amount?.orderSizeUsd) {
      return order.spot.amount.orderSizeUsd;
    }
    if (order.category === "perpetual" && order.perp?.amount?.marginSizeUsd) {
      return order.perp.amount.marginSizeUsd;
    }
    return "0";
  }, [
    order.category,
    order.spot?.amount?.orderSizeUsd,
    order.perp?.amount?.marginSizeUsd,
  ]);

  const entryPrice = order.additional?.entryPrice;
  const exitPrice = order.additional?.exitPrice;
  const message = order.message;

  if (!order) return null;

  const orderData = order.category === "spot" ? order.spot : order.perp;
  const amountObj = orderData?.amount || { orderSize: "0", tokenAmount: "0" };
  const orderAssetObj = orderData?.orderAsset || {
    collateralToken: { decimals: 18, symbol: "UNK" }
  };

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
                <span>
                  {order.category === "spot" && order.spot?.orderAsset?.orderToken
                    ? `${order.spot.orderAsset.orderToken.symbol} |`
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
            </div>
          </div>
          <OrderAction order={orderWithPosition} />
        </div>

        {isExpanded && (
          <>
            {/* Main expanded grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 items-center gap-4 mb-3">
              {/* Entry / Cost */}
              <div>
                <span className="text-xs text-gray-500">Entry Criteria</span>
                {order.entry.isTechnicalEntry == true ? (
                  <div className="overflow-x-auto pb-1 scrollbar-thin">
                    <LogicSummary node={order.entry.technicalLogic!} />
                  </div>
                ) : order.entry.priceLogic?.threshold ? (
                  <div className="flex gap-1 items-center">
                    $
                    {displayNumber(
                      Number(
                        safeFormatNumber(
                          order.entry.priceLogic.threshold.toString(),
                          PRECISION_DECIMALS,
                          6,
                        ),
                      ),
                    )}
                  </div>
                ) : (
                  "_"
                )}
              </div>
              {/* <div>
                <span className="text-xs text-gray-500">Type</span>
                <div className="flex flex-col">
                  <span
                    className={`text-xs font-bold ${
                      order.orderType === "BUY"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {order.orderType}
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase">
                    {order.strategy}
                  </span>
                </div>
              </div> */}

              {/* Size */}
              <div>
                <span className="text-xs text-gray-500">Order Size</span>
                <div className="text-sm font-medium flex items-center gap-1">
                  {displayNumber(
                    Number(
                      safeFormatNumber(
                        amountObj.orderSize?.toString() || "0",
                        orderAssetObj.collateralToken?.decimals || 18,
                        4,
                      ),
                    ),
                  )}
                  <p>{orderAssetObj.collateralToken?.symbol || "UNK"}</p>
                </div>
              </div>

              {/* TP/SL */}
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
                        <div className="flex gap-1">
                          <span className="text-xs text-green-500 flex items-center gap-1">
                            TP
                          </span>
                          <div className="text-sm font-medium">
                            {formatUSD(order.exit.takeProfit.takeProfitPrice)}
                          </div>
                        </div>
                      ) : (
                        <div className="flex ga-1">
                          <span className="text-xs text-gray-500">TP</span>
                          <div className="text-sm font-medium text-green-600">
                            {formateAmountWithFixedDecimals(
                              order.exit.takeProfit.takeProfitPercentage,
                              2,
                              2,
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
                              {formatUSD(order.exit.stopLoss.stopLossPrice)}
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

              {/* Wallet */}
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

              {/* Timestamp */}
              <div className="text-xs text-gray-500 font-mono">
                {formatCustomizeTime(order.createdAt)}
              </div>
            </div>

            {/* Extra details row (cost, amount, prices, message) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <FiDollarSign className="w-3 h-3" /> Amount
                </span>
                <div className="text-sm font-medium flex items-center gap-1">
                  {displayNumber(
                    Number(
                      safeFormatNumber(
                        (amountObj as any).tokenAmount?.toString() || "0",
                        (orderAssetObj as any).orderToken?.decimals || orderAssetObj.collateralToken?.decimals || 18,
                        4,
                      ),
                    ),
                  )}
                  <p>{(orderAssetObj as any).orderToken?.symbol || orderAssetObj.collateralToken?.symbol || "UNK"}</p>
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

              {entryPrice && (
                <div>
                  <span className="text-xs text-gray-500">Entry at</span>
                  <div className="text-sm font-medium flex items-center gap-1">
                    {formatUSD(entryPrice)}
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

              {message && (
                <div className="col-span-full flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg">
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

export default OrderCard;
