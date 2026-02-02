import { ORDER_TYPE, OrderStatusType } from "@/type/order";

// UI
import {
  FiClock,
  FiCheckCircle,
  FiX,
  FiActivity,
  FiCopy,
} from "react-icons/fi";
import LogicSummary from "../common/LogicDisplay";

// Utility
import { displayNumber } from "@/utility/displayPrice";
import { handleCopy } from "@/lib/utils";

import OrderActions from "./OrderAction";
import { formateAmountWithFixedDecimals } from "@/utility/handy";

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
  const getStatusIcon = (status: OrderStatusType) => {
    switch (status) {
      case "PENDING":
        return <FiClock className="w-4 h-4 text-yellow-500" />;
      case "OPENED":
        return <FiActivity className="w-4 h-4 text-blue-500" />;
      case "COMPLETED":
        return <FiCheckCircle className="w-4 h-4 text-green-500" />;
      case "CANCELLED":
      case "REVERTED":
        return <FiX className="w-4 h-4 text-red-500" />;
      default:
        return <FiClock className="w-4 h-4 text-gray-500" />;
    }
  };

  const renderPriceField = (
    label: string,
    value: string | number,
    options: { prefix?: string; suffix?: string; color?: string } = {},
  ) => {
    return (
      <div className={`text-xs flex gap-1 ${options.color || ""}`}>
        <span className="text-gray-400 mr-1">{label}:</span>
        {options.prefix}
        {displayNumber(Number(value))}
        {options.suffix}
      </div>
    );
  };

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
            {orders.map((order, index) => {
              // Ensure we have a unique key. Fallback to index if _id is missing
              const rowKey = order._id || `order-${index}`;
              const hasTechEntry = order.entry.isTechnicalEntry;
              const hasTechExit = order.exit.isTechnicalExit;
              return (
                <tr
                  key={rowKey}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                >
                  {/* Asset / ID */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-200">
                        {order.orderAsset.orderToken?.symbol || "UNK"}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        #{order._id?.slice(-6)}
                        <FiCopy
                          className="cursor-pointer hover:text-blue-500"
                          onClick={() =>
                            handleCopy(order._id as string, "Order ID")
                          }
                        />
                      </div>
                    </div>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3 whitespace-nowrap">
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
                  </td>

                  {/* Entry */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {hasTechEntry ? (
                      <div className="flex flex-col gap-1 max-w-[240px]">
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-500">
                          <FiActivity /> Technical
                        </span>
                        <div className="overflow-x-auto pb-1 scrollbar-thin">
                          <LogicSummary node={order.entry.technicalLogic!} />
                        </div>
                      </div>
                    ) : (
                      `$${displayNumber(Number(order.entry.priceLogic?.threshold || 0))}`
                    )}
                  </td>

                  {/* TP / SL */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {hasTechExit ? (
                      <div className="flex flex-col gap-1 max-w-[240px]">
                        <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-blue-500">
                          <FiActivity /> Technical
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
                  </td>

                  {/* GMX PnL */}
                  {isGmxPosition && (
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {order._id && orderGmxPositionData[order._id]?.gmxPnl ? (
                        <span
                          className={`font-medium ${
                            Number(orderGmxPositionData[order._id].gmxPnl) >= 0
                              ? "text-green-500"
                              : "text-red-500"
                          }`}
                        >
                          $
                          {displayNumber(
                            Number(orderGmxPositionData[order._id].gmxPnl),
                          )}
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
                        onClick={() =>
                          handleCopy(order.wallet.address, "Wallet")
                        }
                      >
                        {order.wallet.address.slice(0, 4)}...
                        {order.wallet.address.slice(-4)}
                        <FiCopy className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(order.orderStatus)}
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {order.orderStatus.toLowerCase()}
                      </span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    {/* The Action component is now 'portal aware' so overflow:hidden on table won't hurt it */}
                    <OrderActions order={order} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
