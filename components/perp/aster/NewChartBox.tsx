"use client";
import { useEffect, useState, useMemo } from "react";
import { FiChevronUp } from "react-icons/fi";
import { LuChartCandlestick } from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";

// Components
import TvChartContainer from "@/components/tradingView/perp/aster/chart";
import OrderBook from "./OrderBook";
import AssetSelect from "./assetSelect";

interface ChartBoxProps {
  tokenSymbol: string; // e.g., "BTC", "ETH"
  handleTokenSelect?: () => void;
  onSymbolChange?: (symbol: string) => void;
}

export default function ChartBox({
  tokenSymbol,
  handleTokenSelect,
  onSymbolChange,
}: ChartBoxProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showAssetSelect, setShowAssetSelect] = useState(false);

  // Use a hydration-safe way to set initial state based on window
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1026) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    // Set initial state
    if (window.innerWidth < 1026) {
      setIsCollapsed(true);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  //   const handleSelectSymbol = (symbol: string) => {
  //     // Extract base asset from symbol (e.g., "BTCUSDT" -> "BTC")
  //     const baseAsset = symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '');

  //     // Call the callback if provided
  //     if (onSymbolChange) {
  //       onSymbolChange(baseAsset);
  //     }

  //     // Also call the original token select handler
  //     handleTokenSelect();
  //   };

  const memoizedOrderBook = useMemo(
    () => <OrderBook symbol={tokenSymbol} />,
    [tokenSymbol],
  );

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-2xl font-mono shadow-sm p-1 lg:p-2 border border-gray-100 dark:border-gray-800">
        {/* Header Section - Clickable to open AssetSelect */}
        <div
          className="flex justify-between items-center p-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
          onClick={() => setShowAssetSelect(true)}
        >
          <div className="flex-1 group">
            <div className="flex items-center gap-2">
              <h2 className="text-lg lg:text-xl 2xl:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded">
                  {tokenSymbol || "SYMBOL"}
                </span>
                <span className="text-sm lg:text-md text-yellow-300">
                  |Perp
                </span>
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                Click to change
              </span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            className="ml-4 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title={isCollapsed ? "Expand chart" : "Collapse chart"}
          >
            {isCollapsed ? (
              <LuChartCandlestick className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <FiChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* Chart and Order Book Section */}
        <div
          className={`overflow-hidden transition-all duration-300 border-t border-gray-300 dark:border-gray-800 ${
            isCollapsed
              ? "h-0 border-none"
              : "h-[400px] lg:h-[500px] 2xl:h-[500px]"
          }`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 h-full p-2">
            {/* Chart Section - Takes 3 columns on large screens */}
            <div className="lg:col-span-3 h-full rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
              {tokenSymbol ? (
                <TvChartContainer symbol={tokenSymbol} />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
                  <span className="text-gray-500 dark:text-gray-400">
                    Select a symbol to view chart
                  </span>
                </div>
              )}
            </div>

            {/* Order Book Section - Takes 1 column on large screens */}
            <div className="hidden lg:block h-full">
              {tokenSymbol ? <div className="w-full h-full ">{memoizedOrderBook}</div> : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center h-full">
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                Select a symbol to view order book
              </span>
            </div>
          )}
            </div>
          </div>

          {/* Mobile Order Book - Full width below chart on small screens */}
          {/* {tokenSymbol && (
            <div className="lg:hidden border-t border-gray-300 dark:border-gray-800 mt-2 pt-2 px-2 pb-2 max-h-60 overflow-y-auto">
              <OrderBook
                trades={trades}
                orderBook={orderBook}
                loading={loading}
                symbol={asterdexSymbol}
              />
            </div>
          )} */}
        </div>
      </div>

      {/* Asset Select Modal */}
      {/* <AssetSelect
        isOpen={showAssetSelect}
        onClose={() => setShowAssetSelect(false)}
        onSelectSymbol={()=>console.log('called')}
        currentSymbol={tokenSymbol}
      /> */}
    </>
  );
}
