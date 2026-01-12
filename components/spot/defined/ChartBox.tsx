'use client'
import { useEffect, useState } from "react";
import { FiChevronUp, FiChevronDown } from "react-icons/fi"; // Added missing Down
import { LuChartCandlestick } from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";

//components
import TvChartContainer from "@/components/tradingView/spot/defined/chart";
import { formateNumberInUnit } from "@/utility/handy";
import { displayNumber } from "@/utility/displayPrice";

interface ChartBoxProps {
  tokenInfo: {
    name: string;
    symbol: string;
    quoteToken: string;
    chainId: number;
    pairAddress: string;
    createdAt: number;
    imageUrl: string;
    address: string;
    decimals: number;
  } | null;
  tokenState: any;
  handleTokenSelect: () => void;
}

export default function ChartBox({
  tokenInfo,
  tokenState,
  handleTokenSelect,
}: ChartBoxProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Use a hydration-safe way to set initial state based on window
  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 1026) setIsCollapsed(true);
        else setIsCollapsed(false);
    };
    
    // Set initial
    if(window.innerWidth < 1026) setIsCollapsed(true);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderPriceSection = () => {
    return (
      <div className="text-right">
        <AnimatePresence mode="wait">
          <motion.div
            key={`price-${tokenState?.priceUSD || 0}`}
            initial={{ opacity: 0.8, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0.8, y: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-end gap-2"
          >
            {!tokenState && !tokenInfo ? (
              <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
            ) : (
              <motion.span
                className="text-lg lg:text-lg 2xl:text-2xl font-bold text-gray-800 dark:text-gray-200"
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {displayNumber(Number(tokenState?.priceUSD || 0))}
              </motion.span>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl font-mono shadow-sm p-1 lg:p-2 border border-gray-100 dark:border-gray-800">
      <div className="flex justify-between items-center p-1">
        <div className="flex-1 cursor-pointer group" onClick={handleTokenSelect}>
          <div className="flex justify-between items-center transition-all duration-300">
            {tokenInfo ? (
              <div className="flex gap-1 items-center justify-center">
                <div className="transition-all duration-200 group-hover:translate-x-1">
                  <h2 className="text-lg 2xl:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <img
                      src={tokenInfo.imageUrl || "/tokenLogo.png"}
                      className="w-7 xl:w-8  h-7 xl:h-8 rounded-full"
                      alt={tokenInfo.symbol}
                    />
                    <span className="text-sm xl:text-lg bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                      {tokenInfo.symbol}
                    </span>
                    <span className="text-sm xl:text-md text-yellow-500">|Spot</span>
                  </h2>
                </div>
              </div>
            ) : (
              <div className="w-8 h-10 animate-pulse bg-gray-200 dark:bg-gray-800 rounded"></div>
            )}

            <div className="flex justify-end gap-4">
               {/* Stats Cards */}
              <div className="hidden lg:block stat-card">
                <div className="text-xs xl:text-sm font-medium text-gray-500 dark:text-gray-400">Liquidity</div>
                <div className="text-md font-bold font-mono text-gray-800 dark:text-gray-200">
                  {formateNumberInUnit(Number(tokenState?.liquidity || 0), 2)}
                </div>
              </div>
              <div className="hidden lg:block stat-card">
                <div className="text-xs xl:text-sm font-medium text-gray-500 dark:text-gray-400">Market Cap</div>
                <div className="text-md font-bold font-mono text-gray-800 dark:text-gray-200">
                  {formateNumberInUnit(Number(tokenState?.marketCap || 0), 2)}
                </div>
              </div>
              <div className="hidden lg:block stat-card">
                <div className="text-xs xl:text-sm font-medium text-gray-500 dark:text-gray-400">24h Vol</div>
                <div className="text-md font-bold font-mono text-gray-800 dark:text-gray-200">
                  {formateNumberInUnit(Number(tokenState?.volume24 || 0), 2)}
                </div>
              </div>
              <div className="hidden lg:block stat-card">
                <div className="text-xs xl:text-sm font-medium text-gray-500 dark:text-gray-400">24h Chg</div>
                <div className={`text-md font-bold font-mono ${Number(tokenState?.change24 || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formateNumberInUnit(Number(tokenState?.change24 || 0), 2)}%
                </div>
              </div>
              <div className="stat-card border-l pl-4 dark:border-gray-700">
                <div className="text-xs xl:text-sm font-medium text-gray-500 dark:text-gray-400">Price</div>
                {renderPriceSection()}
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-4 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          {isCollapsed ? <LuChartCandlestick className="w-5 h-5 text-gray-600" /> : <FiChevronUp className="w-5 h-5 text-gray-600" />}
        </button>
      </div>

      <div className={`overflow-hidden transition-all duration-300 border-t border-gray-300 dark:border-gray-800 ${isCollapsed ? "h-0 border-none" : "h-[400px] lg:h-[380px] 2xl:h-[380px]"}`}>
        {tokenInfo ? (
          <TvChartContainer
            pairAddress={tokenInfo.pairAddress}
            quoteToken={tokenInfo.quoteToken}
            createdAt={tokenInfo.createdAt}
            chainId={tokenInfo.chainId}
            symbol={tokenInfo.symbol}
            address={tokenInfo.address}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
        )}
      </div>
    </div>
  );
}