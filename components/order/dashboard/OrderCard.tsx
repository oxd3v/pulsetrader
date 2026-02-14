//next configuration
import { useState, useCallback, useMemo, useEffect } from "react";

//ui
import { TbSettingsExclamation } from "react-icons/tb";
import { FiClock, FiCheckCircle, FiCopy, FiX, FiActivity } from "react-icons/fi";
import { TiWaves } from "react-icons/ti";
import { motion } from "framer-motion";
import toast from "react-hot-toast";


//components
import OrderAction from "@/components/order/dashboard/OrderAction";
import LogicSummary from "@/components/order/common/LogicDisplay";

//utility
import { ORDER_TYPE } from "@/type/order";
import { formatCustomizeTime, formateAmountWithFixedDecimals } from "@/utility/handy";
import { displayNumber } from "@/utility/displayPrice";
import { PRECISION_DECIMALS } from "@/constants/common/utils";
import { formatUnits, parseUnits, ZeroAddress } from "ethers";


interface OrderCardProps {
  order: ORDER_TYPE;
  isGmxPosition?: boolean;
  orderGmxPositionData: Record<string, any>;
  indexTokenInfo?: any;
}



const STATUS_ICONS = {
  PENDING: <FiClock className="w-4 h-4 text-yellow-500" />,
  PROCESSING: <TbSettingsExclamation className="w-4 h-4 text-yellow-500" />,
  OPENED: <TiWaves className="w-4 h-4 text-blue-500" />,
  CLOSED: <FiCheckCircle className="w-4 h-4 text-green-500" />,
  REVERTED: <FiX className="w-4 h-4 text-red-500" />,
} as const;


const OrderCard = ({ order, orderGmxPositionData }: OrderCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = useCallback(
    (status: string) =>
      STATUS_ICONS[status as keyof typeof STATUS_ICONS] ||
      STATUS_ICONS["PENDING"],
    []
  );

  const copyWalletAddress = useCallback(() => {
    if (!order?.wallet?.address) return;
    navigator.clipboard.writeText(order.wallet.address);
    toast.success("Wallet address copied");
  }, [order?.wallet?.address]);

  const positionData = useMemo(
    () => (order?._id ? orderGmxPositionData[order._id] || {} : {}),
    [orderGmxPositionData, order?._id]
  );

  const renderOrderSize = useCallback(() => {
    if (!order?.orderType) return "—";
    let isCollateral = true;
    if (order.orderType === "BUY" && order.category == "spot") {
      isCollateral = true;
    } else {
      isCollateral = false;
    }
    const token = isCollateral
      ? order.orderAsset.collateralToken
      : order.orderAsset.orderToken;
    const size = isCollateral
      ? order.amount.orderSize
      : order.amount.tokenAmount;

    if (!size || !token) return "—";

    return (
      <>
        {displayNumber(Number(formatUnits(BigInt(size), token.decimals)))}
        <span className="text-xs text-gray-500">{token.symbol}</span>
      </>
    );
  }, [order]);

  const renderPriceField = (
    label: string,
    value: any,
    options: { prefix?: string; suffix?: string; color?: string } = {}
  ) => (
    <div>
      <span className="text-xs text-gray-500">{label}</span>
      <div className={`text-sm font-medium ${options.color || ""}`}>
        {value ? (
          <div className="flex items-center">
            {options.prefix}{" "}
            {displayNumber(
              Number(formatUnits(BigInt(value), PRECISION_DECIMALS))
            )}{" "}
            {options.suffix}
          </div>
        ) : (
          "—"
        )}
      </div>
    </div>
  );

  const copyOrderId = useCallback(() => {
    if (!order?._id) return;
    navigator.clipboard.writeText(order._id);
    toast.success("Order ID copied");
  }, [order?._id]);

  if (!order) return null;

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
              {getStatusIcon(order.orderStatus)}
              <div
                className={`flex gap-1 items-center font-semibold ${
                  order.category.split(":")[0] == "perpetual"
                    ? "text-blue-500"
                    : order.category.split(":")[0] == "spot"
                    ? "text-yellow-500"
                    : "text-gray-800 dark:text-gray-200"
                }`}
              >
                <span>
                  {order.orderAsset.orderToken != undefined
                    ? `${order.orderAsset.orderToken.symbol} |`
                    : ""}
                </span>
                <span>{order._id?.slice(-6)}</span>
                <button
                  onClick={copyOrderId}
                  className="text-blue-500 hover:text-blue-600"
                >
                  <FiCopy className="text-xs" />
                </button>
              </div>
            </div>
          </div>
          <OrderAction order={{ ...order, ...positionData }} />
        </div>

        {isExpanded && (
          <div className="grid grid-cols-2 lg:grid-cols-4 items-center gap-4 mb-3">
            {/* Order Price/Cost Information */}
            {order.orderType === "BUY" && order.entry.isTechnicalEntry == true ? (
              <div>
                <span className="text-xs text-gray-500">Entry Criteria</span>
                 <div className="overflow-x-auto pb-1 scrollbar-thin">
                          <LogicSummary node={order.entry.technicalLogic!} />
                        </div>
              </div>
            ) : (
              <div>
                {renderPriceField(
                  order.orderType === "BUY" ? "Limit Price" : "Cost",
                  order.orderType === "BUY"
                    ? order.entry.priceLogic?.threshold
                    : (
                        BigInt(order?.executionFee.feeInUsd) +
                        BigInt(order.executionFee.payInUsd)
                      ).toString(),
                  order.orderType === "BUY"
                    ? { prefix: "$" }
                    : { suffix: "USD" }
                )}
              </div>
            )}

            {/* Order Size Display */}

            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {order.entry.isTechnicalEntry == true  ? (
                      <div className="flex flex-col gap-1 max-w-[240px]">
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-500">
                          <FiActivity /> Technical Entry
                        </span>
                        <div className="overflow-x-auto pb-1 scrollbar-thin">
                          <LogicSummary node={order.entry.technicalLogic!} />
                        </div>
                      </div>
                    ) : (
                          renderPriceField(
                            "ENTRY PRICE",
                            order.entry.priceLogic?.threshold || 0,
                            { color: "text-green-600" },
                          )
                        )}
                  </td>

            <div>
              <span className="text-xs text-gray-500">Size</span>
              <div className="text-sm font-medium flex items-center gap-1">
                {renderOrderSize()}
              </div>
            </div>

            {/* Take Profit Field */}
            {order.exit.isTechnicalExit == true ? (
                      <div className="flex flex-col gap-1 max-w-[240px]">
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-500">
                          <FiActivity /> Technical Exit
                        </span>
                        <div className="overflow-x-auto pb-1 scrollbar-thin">
                          <LogicSummary node={order.exit.technicalLogic!} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {order.exit.takeProfit.takeProfitPrice != '0' ? (
                          renderPriceField(
                            "TP",
                            order.exit.takeProfit.takeProfitPrice,
                            { color: "text-green-600" },
                          )
                        ) : (
                          <div className="text-xs text-green-600 flex gap-1">
                            TP: {(formateAmountWithFixedDecimals(order.exit.takeProfit.takeProfitPercentage, 2, 2))}%
                          </div>
                        )}

                        {order.exit.stopLoss.isActive &&
                          (order.exit.stopLoss.stopLossPrice != '0' ? (
                            renderPriceField(
                              "SL",
                              order.exit.stopLoss.stopLossPrice,
                              { color: "text-red-600" },
                            )
                          ) : (
                            <div className="text-xs text-red-600 flex gap-1">
                              SL: {(formateAmountWithFixedDecimals(order.exit.stopLoss.stopLossPercentage, 2, 2))}%
                            </div>
                          ))}
                      </div>
                    )}
            

            {/* Wallet Address Display */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>
                {order.wallet?.address?.slice(0, 6)}...
                {order.wallet?.address?.slice(-4)}
              </span>
              <button
                onClick={copyWalletAddress}
                className="text-blue-500 hover:text-blue-600"
                aria-label="Copy wallet address"
              >
                <FiCopy className="w-4 h-4" />
              </button>
            </div>

            {/* Timestamp Display */}
            <div className="text-xs text-gray-500 font-mono">
              {formatCustomizeTime(order.createdAt)}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default OrderCard;
