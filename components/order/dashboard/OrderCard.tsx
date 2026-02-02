import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { TbSettingsExclamation } from "react-icons/tb";
import { FiClock, FiCheckCircle, FiCopy, FiX, FiActivity } from "react-icons/fi";
import { TiWaves } from "react-icons/ti";

// Constants & Utils
import { formatCustomizeTime } from "@/utility/handy";
import { displayNumber } from "@/utility/displayPrice";
import { formatUnits, parseUnits } from "ethers";

// Type
import { ORDER_TYPE, OrderStatusType } from "@/type/order";

// Components
import OrderAction from "./OrderAction";

interface OrderCardProps {
  order: ORDER_TYPE;
  isGmxPosition?: boolean;
  orderGmxPositionData: Record<string, any>;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING: <FiClock className="w-4 h-4 text-yellow-500" />,
  PROCESSING: <TbSettingsExclamation className="w-4 h-4 text-purple-500" />,
  OPENED: <TiWaves className="w-4 h-4 text-blue-500" />,
  COMPLETED: <FiCheckCircle className="w-4 h-4 text-green-500" />,
  CANCELLED: <FiX className="w-4 h-4 text-red-500" />,
  REVERTED: <FiX className="w-4 h-4 text-red-500" />,
};

const OrderCard = ({ order, orderGmxPositionData }: OrderCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = (status: OrderStatusType) => STATUS_ICONS[status] || STATUS_ICONS.PENDING;

  const positionData = useMemo(
    () => (order?._id ? orderGmxPositionData[order._id] || {} : {}),
    [orderGmxPositionData, order?._id]
  );

  const copyId = (text: string | undefined, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const formatPrice = (value: string | number | undefined, prefix = "$", suffix = "") => {
    if (value === undefined || value === null || value === "") return "—";
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if(isNaN(num)) return "—";
    // Adjust logic based on whether value is raw unit or formatted number
    // Assuming value here is already readable or we format it:
    return (
        <div className="flex items-center gap-0.5">
            <span className="text-gray-500 text-[10px]">{prefix}</span>
            <span>{displayNumber(num)}</span>
            <span className="text-gray-500 text-[10px]">{suffix}</span>
        </div>
    );
  };

  // Helper to safely render token amounts from potentially raw bigints
  const renderTokenAmount = (amount: string, decimals: number, symbol: string) => {
      if(!amount) return "—";
      try {
          const val = formatUnits(BigInt(amount), decimals);
          return `${displayNumber(Number(val))} ${symbol}`;
      } catch (e) {
          return "—";
      }
  };

  const isLong = order.orderType === "BUY" || (order.category === "perpetual" && order.additional?.entryPrice); 

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
    >
      <div className="p-3 sm:p-4">
        {/* Header Row */}
        <div className="flex items-center justify-between gap-4">
          <div 
            className="flex-grow flex items-center gap-3 cursor-pointer group"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className={`p-2 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors`}>
               {getStatusIcon(order.orderStatus)}
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {order.orderAsset.orderToken?.symbol || "UNK"}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    order.category === 'perpetual' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                    {order.category === 'perpetual' ? (order.orderType === 'BUY' ? 'Long' : 'Short') : order.category}
                </span>
                <span className="text-xs text-gray-500 font-mono">#{order._id?.slice(-4)}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatCustomizeTime(order.createdAt)} • {order.strategy}
              </div>
            </div>
          </div>

          <OrderAction order={{ ...order, ...positionData }} />
        </div>

        {/* Quick Stats Row (Always Visible) */}
        <div className="mt-3 grid grid-cols-3 gap-2 py-2 border-t border-gray-100 dark:border-gray-800">
             <div>
                 <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Size</span>
                 <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {order.amount.orderSizeUsd ? 
                        `$${displayNumber(Number(order.amount.orderSizeUsd))}` : 
                        renderTokenAmount(order.amount.orderSize, order.orderAsset.collateralToken?.decimals || 18, order.orderAsset.collateralToken?.symbol || "")
                    }
                 </div>
             </div>
             <div>
                 <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Entry</span>
                 <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {order.entry.isTechnicalEntry ? (
                        <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                            <FiActivity className="w-3 h-3"/> <span className="text-xs">Algo</span>
                        </div>
                    ) : (
                        formatPrice(order.entry.priceLogic?.threshold)
                    )}
                 </div>
             </div>
             <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">P&L (Est)</span>
                 <div className={`text-sm font-medium ${
                     Number(positionData.gmxPnl || 0) >= 0 ? "text-green-500" : "text-red-500"
                 }`}>
                    {positionData.gmxPnl ? `$${displayNumber(Number(positionData.gmxPnl))}` : "—"}
                 </div>
             </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="pt-2 border-t border-dashed border-gray-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-4"
          >
            {/* Take Profit */}
            <div className="p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                <div className="text-xs text-green-700 dark:text-green-400 mb-1 font-semibold">Take Profit</div>
                <div className="text-sm font-mono text-gray-800 dark:text-gray-200">
                    {order.exit.takeProfit.takeProfitPrice ? `$${displayNumber(Number(order.exit.takeProfit.takeProfitPrice))}` : "—"}
                </div>
                {order.exit.takeProfit.takeProfitPercentage > 0 && (
                    <div className="text-[10px] text-green-600">
                        (+{order.exit.takeProfit.takeProfitPercentage}%)
                    </div>
                )}
            </div>

            {/* Stop Loss */}
            <div className="p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                <div className="text-xs text-red-700 dark:text-red-400 mb-1 font-semibold">Stop Loss</div>
                <div className="text-sm font-mono text-gray-800 dark:text-gray-200">
                    {order.exit.stopLoss.stopLossPrice ? `$${displayNumber(Number(order.exit.stopLoss.stopLossPrice))}` : "—"}
                </div>
                {order.exit.stopLoss.stopLossPercentage > 0 && (
                     <div className="text-[10px] text-red-600">
                        (-{order.exit.stopLoss.stopLossPercentage}%)
                    </div>
                )}
            </div>

            {/* Fees */}
            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-xs text-gray-500 mb-1 font-semibold">Est. Fees</div>
                <div className="text-sm font-mono text-gray-800 dark:text-gray-200">
                    ${displayNumber(Number(order.executionFee?.feeInUsd || 0))}
                </div>
            </div>

            {/* Wallet */}
            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                 <div className="text-xs text-gray-500 mb-1 font-semibold">Wallet</div>
                 <div 
                    className="flex items-center gap-1 text-xs text-blue-500 cursor-pointer hover:underline"
                    onClick={() => copyId(order.wallet?.address, "Wallet Address")}
                >
                    {order.wallet?.address ? `${order.wallet.address.slice(0,6)}...${order.wallet.address.slice(-4)}` : "—"}
                    <FiCopy className="w-3 h-3" />
                 </div>
            </div>

            {/* Technical Logic Dump (If Algo) */}
            {order.entry.isTechnicalEntry && order.entry.technicalLogic && (
                <div className="col-span-2 sm:col-span-4 mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                    <div className="text-[10px] uppercase text-gray-500 font-bold mb-1">Entry Conditions</div>
                    <code className="text-[10px] text-gray-600 dark:text-gray-400 break-all">
                        {/* Simplify display for technical logic object */}
                        {JSON.stringify(order.entry.technicalLogic).slice(0, 100)}...
                    </code>
                </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default OrderCard;