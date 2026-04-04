import { ORDER_TYPE, OrderStatusType } from "@/type/order";
import { formatUnits } from "ethers";
import {
  FiClock,
  FiCheckCircle,
  FiX,
  FiActivity,
  FiCopy,
} from "react-icons/fi";
import LogicSummary from "../common/LogicDisplay";
import { displayNumber } from "@/utility/displayPrice";
import { handleCopy } from "@/lib/utils";
import OrderActions from "./OrderAction";
import {
  formateAmountWithFixedDecimals,
  safeFormatNumber,
} from "@/utility/handy";
import InfoTooltip from "@/components/tradeBox/TradeBoxCommon/BoxTooltip";
import { PRECISION_DECIMALS } from "@/constants/common/utils";
import { useMemo, memo } from "react";

// Constant status icons
const STATUS_ICONS: Record<OrderStatusType, React.ReactNode> = {
  PENDING: <FiClock className="w-4 h-4 text-yellow-500" />,
  PROCESSING: <FiActivity className="w-4 h-4 text-blue-500" />,
  OPENED: <FiActivity className="w-4 h-4 text-blue-500" />,
  COMPLETED: <FiCheckCircle className="w-4 h-4 text-green-500" />,
  CLOSED: <FiCheckCircle className="w-4 h-4 text-green-500" />,
  CANCELLED: <FiX className="w-4 h-4 text-red-500" />,
  REVERTED: <FiX className="w-4 h-4 text-red-500" />,
};

// Helper to render price fields (pure function)
const renderPriceField = (
  label: string,
  value: string | number,
  options: { prefix?: string; suffix?: string; color?: string } = {},
) => {
  const numericValue = Number(safeFormatNumber(value.toString(), PRECISION_DECIMALS, 4));
  return (
    <div className={`text-xs flex gap-1 ${options.color || ""}`}>
      <span className="text-gray-400 mr-1">{label}:</span>
      {options.prefix}
      {displayNumber(numericValue)}
      {options.suffix}
    </div>
  );
};

// Helper to format USD
const formatUSD = (value: string | bigint) => {
  if (!value) return "$0.00";
  const num = Number(safeFormatNumber(value.toString(), PRECISION_DECIMALS, 8));
  return <div className="flex gap-1">${displayNumber(num)}</div>;
};

// Memoized row component
const OrderTableRow = memo(
  ({
    order,
    isGmxPosition,
    orderGmxPositionData,
  }: {
    order: ORDER_TYPE;
    isGmxPosition: boolean;
    orderGmxPositionData: any;
  }) => {
    const hasTechEntry = order.entry.isTechnicalEntry;
    const hasTechExit = order.exit.isTechnicalExit;

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

    const isBuy = order.orderType === "BUY";
    const orderData = order.category === "spot" ? order.spot : order.perp;
    const amountToken = isBuy
      ? orderData?.orderAsset?.collateralToken
      : (orderData?.orderAsset as any)?.orderToken;
    const amountValue = isBuy ? (orderData?.amount as any)?.orderSize : (orderData?.amount as any)?.tokenAmount;
    const formattedAmount = useMemo(() => {
      if (!amountValue || !amountToken) return "0";
      return displayNumber(
        Number(formatUnits(BigInt(amountValue), amountToken.decimals)),
      );
    }, [amountValue, amountToken?.decimals]);

    const entryPrice = order.additional?.entryPrice;
    const exitPrice = order.additional?.exitPrice;
    const message = order.message;

    return (
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
        {/* Asset / ID */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex flex-col">
            <div className="flex gap-1 items-center font-medium text-sm text-gray-900 dark:text-gray-200">
              {
                order.category == 'perpetual' && <span className={`text-xs font-bold ${order.perp?.isLong == false ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {order.perp?.isLong ? 'LONG' : 'SHORT'}</span>
              }
              {order.category === "spot" ? order.spot?.orderAsset?.orderToken?.symbol : (order.perp?.orderAsset as any)?.symbol || "UNK"}
            </div>
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                #{order._id?.slice(-6)}
                <FiCopy
                  className="cursor-pointer hover:text-blue-500"
                  onClick={() => handleCopy(order._id as string, "Order ID")}
                />
              </div>
              {order.category === "perpetual" && order.perp?.leverage && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {order.perp?.leverage}x
                  <img src={order.perp.protocol === "asterdex" ? "https://static.asterindex.com/cloud-futures/static/images/aster/logo.svg" : order.perp.protocol === "hyperliquid" ? "./hyperliquidWhite.svg" : "./gmx.svg"} alt="AsterDex" className="w-10 h-4" />
                </div>
              )}
            </div>

          </div>
        </td>

        {/* Type */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex flex-col">
            <span
              className={`text-xs font-bold ${order.orderType === "BUY"
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
        </td>

        {/* Entry */}
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
          {hasTechEntry ? (
            <div className="flex flex-col gap-1 max-w-[240px]">
              <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-blue-500">
                <FiActivity /> Technical Entry
              </span>
              <div className="overflow-x-auto pb-1 scrollbar-thin">
                <LogicSummary node={order.entry.technicalLogic!} />
              </div>
            </div>
          ) : (
            renderPriceField(
              "PRICE ENTRY",
              order.entry.priceLogic?.threshold || 0,
              { color: "text-green-600" },
            )
          )}
        </td>

        {/* EXIT | TP / SL */}
        <td className="px-4 py-3 whitespace-nowrap">
          {hasTechExit ? (
            <div className="flex flex-col gap-1 max-w-[240px]">
              <span className="flex items-center gap-1 text-[9px] uppercase font-bold text-blue-500">
                <FiActivity /> Technical Exit
              </span>
              <div className="overflow-x-auto pb-1 scrollbar-thin">
                <LogicSummary node={order.exit.technicalLogic!} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {order.exit.takeProfit.takeProfitPrice !== "0" ? (
                renderPriceField("TP", order.exit.takeProfit.takeProfitPrice, {
                  color: "text-green-600",
                })
              ) : (
                <div className="text-xs text-green-600 flex gap-1">
                  TP:{" "}
                  {formateAmountWithFixedDecimals(
                    order.exit.takeProfit.takeProfitPercentage,
                    2,
                    2,
                  )}
                  %
                </div>
              )}
              {order.exit.stopLoss.isActive &&
                (order.exit.stopLoss.stopLossPrice !== "0" ? (
                  renderPriceField("SL", order.exit.stopLoss.stopLossPrice, {
                    color: "text-red-600",
                  })
                ) : (
                  <div className="text-xs text-red-600 flex gap-1">
                    SL:{" "}
                    {formateAmountWithFixedDecimals(
                      order.exit.stopLoss.stopLossPercentage,
                      2,
                      2,
                    )}
                    %
                  </div>
                ))}
            </div>
          )}
        </td>

        {/* Amount */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-1">
              <span className="flex gap-1 font-medium text-gray-700 dark:text-gray-300">
                {formattedAmount} {amountToken?.symbol || "UNK"}
              </span>
            </div>
          </div>
        </td>

        {/* Cost */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="flex gap-1 text-gray-900 dark:text-gray-100 font-mono">
            {formatUSD(totalCost)}
          </span>
        </td>

        {/* Trigger */}
        <td className="px-4 py-3 whitespace-nowrap">
          {(entryPrice || exitPrice) && (
            <div className="flex flex-wrap gap-1 mt-1">
              {entryPrice && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-medium">
                  Entry ${displayNumber(Number(safeFormatNumber(entryPrice, PRECISION_DECIMALS, 8)))}
                </span>
              )}
              {exitPrice && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-medium">
                  Exit ${displayNumber(Number(safeFormatNumber(exitPrice, PRECISION_DECIMALS, 2)))}
                </span>
              )}
            </div>
          )}
        </td>

        {/* GMX PnL */}
        {isGmxPosition && (
          <td className="px-4 py-3 whitespace-nowrap text-sm">
            {order._id && orderGmxPositionData[order._id]?.gmxPnl ? (
              <span
                className={`font-medium ${Number(orderGmxPositionData[order._id].gmxPnl) >= 0
                  ? "text-green-500"
                  : "text-red-500"
                  }`}
              >
                ${displayNumber(Number(orderGmxPositionData[order._id].gmxPnl))}
              </span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </td>
        )}

        {/* Wallet */}
        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
          {order.wallet?.address ? (
            <div
              className="flex items-center gap-1 group cursor-pointer"
              onClick={() => handleCopy(order.wallet.address, "Wallet")}
              title={order.wallet.address}
            >
              {order.wallet.address.slice(0, 4)}...{order.wallet.address.slice(-4)}
              <FiCopy className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ) : (
            "—"
          )}
        </td>

        {/* Status */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            {STATUS_ICONS[order.orderStatus] || STATUS_ICONS.PENDING}
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
              {order.orderStatus.toLowerCase()}
            </span>
            {message && (
              <InfoTooltip id={`${order._id}`} content={message} />
            )}
          </div>
        </td>

        {/* Action */}
        <td className="px-4 py-3 whitespace-nowrap text-right">
          <OrderActions order={order} />
        </td>
      </tr>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: re-render only if order data or GMX data changed
    return (
      prevProps.order === nextProps.order &&
      prevProps.isGmxPosition === nextProps.isGmxPosition &&
      prevProps.orderGmxPositionData === nextProps.orderGmxPositionData
    );
  },
);

OrderTableRow.displayName = "OrderTableRow";

interface OrderTableProps {
  orders: ORDER_TYPE[];
  isGmxPosition: boolean;
  orderGmxPositionData: any;
}

export default function OrderTable({
  orders,
  isGmxPosition,
  orderGmxPositionData,
}: OrderTableProps) {
  return (
    <div className="w-full h-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden flex flex-col">
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Asset / ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Entry
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                EXIT | TP / SL
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Trigger
              </th>
              {isGmxPosition && (
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  PnL (GMX)
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Wallet
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-950">
            {orders.map((order, index) => (
              <OrderTableRow
                key={order._id || `order-${index}`}
                order={order}
                isGmxPosition={isGmxPosition}
                orderGmxPositionData={orderGmxPositionData}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}