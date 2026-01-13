"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiInfo } from "react-icons/fi";

export default function TradingStrategyMenu() {
  const [selectedType, setSelectedType] = useState<any>(null);
  const router = useRouter();

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 to-gray-100  dark:bg-gradient-to-br dark:from-slate-900  dark:to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-300 mb-6">
          <span>Trading</span>
          <span>→</span>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            Strategy Selection
          </span>

          {selectedType && (
            <>
              <span>→</span>
              <span className="font-medium text-blue-600 dark:text-gray-300 capitalize">
                {selectedType}
              </span>
            </>
          )}
        </nav>

        <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4">
          Trading Strategy Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Select your trading type and preferred strategy to begin
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Perpetual Trading Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`bg-white dark:bg-gray-800 rounded-xl dark:shadow-2xl shadow-lg p-6 cursor-pointer transition-all duration-300 pointer-events-none opacity-50 ${
              selectedType === "perpetual"
                ? "ring-2 ring-blue-500"
                : "hover:shadow-xl"
            }`}
            onClick={() => {
              setSelectedType("perpetual");
              router.push("/strategy/perpetual");
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                Future Trading
              </h2>

              <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm">
                Futures
              </div>
            </div>
            <p className="text-gray-600 mb-4 dark:text-gray-300">
              Trade perpetual futures contracts with leverage
            </p>

            {/* <motion.div 
                            initial={false}
                            animate={{ height: selectedType === 'perpetual' ? 'auto' : 0 }}
                            className="overflow-hidden"
                        >
                            <div className="space-y-3">
                                {strategies.map((strategy) => (
                                    <motion.div 
                                        key={strategy.id}
                                        className="relative group"
                                        onMouseEnter={() => setHoveredStrategy(strategy.id)}
                                        onMouseLeave={() => setHoveredStrategy(null)}
                                        whileHover={{ x: 8 }}
                                    >
                                        <div className="bg-blue-50 p-4 rounded-lg hover:bg-blue-100 cursor-pointer transition-all">
                                            <div className="flex items-center space-x-3">
                                                <strategy.icon className="h-6 w-6 text-blue-600" />
                                                <p className="text-blue-800 font-medium">{strategy.name}</p>
                                            </div>
                                        </div>
                                        {hoveredStrategy === strategy.id && (
                                            <div className="absolute top-0 left-full ml-4 w-64 p-4 bg-white rounded-lg shadow-lg z-10">
                                                <p className="text-sm text-gray-600">{strategy.description}</p>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div> */}
          </motion.div>

          {/* Spot Trading Card */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`bg-white dark:bg-gray-800 rounded-xl dark:shadow-2xl shadow-lg p-6 cursor-pointer transition-all duration-300 ${
              selectedType === "spot"
                ? "ring-2 ring-green-500"
                : "hover:shadow-xl"
            }`}
            onClick={() => {
              setSelectedType("spot");
              router.push("/strategy/spot/0x152b9d0FdC40C096757F570A51E494bd4b943E50");
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                Spot Trading
              </h2>

              <div className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm">
                Spot
              </div>
            </div>
            <p className="text-gray-600 mb-4 dark:text-gray-300">
              Trade actual cryptocurrencies without leverage
            </p>

            {/* <motion.div 
                            initial={false}
                            animate={{ height: selectedType === 'spot' ? 'auto' : 0 }}
                            className="overflow-hidden"
                        >
                            <div className="space-y-3">
                                {strategies.map((strategy) => (
                                    <motion.div 
                                        key={strategy.id}
                                        className="relative group"
                                        onMouseEnter={() => setHoveredStrategy(strategy.id)}
                                        onMouseLeave={() => setHoveredStrategy(null)}
                                        whileHover={{ x: 8 }}
                                    >
                                        <div className="bg-green-50 p-4 rounded-lg hover:bg-green-100 cursor-pointer transition-all">
                                            <div className="flex items-center space-x-3">
                                                <strategy.icon className="h-6 w-6 text-green-600" />
                                                <p className="text-green-800 font-medium">{strategy.name}</p>
                                            </div>
                                        </div>
                                        {hoveredStrategy === strategy.id && (
                                            <div className="absolute top-0 left-full ml-4 w-64 p-4 bg-white rounded-lg shadow-lg z-10">
                                                <p className="text-sm text-gray-600">{strategy.description}</p>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div> */}
          </motion.div>
          {/*  Trenches */}
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-200">
            <FiInfo className="h-5 w-5" />
            <span className="font-medium dark:text-gray-200">Need Help?</span>
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Select a trading type above to view available strategies. Hover over
            each strategy to learn more about its features and recommended
            usage.
          </p>
        </div>
      </div>
    </div>
  );
}
