"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  FiArrowUpLeft,
  FiCheck,
  FiZap,
  FiShield,
  FiTrendingUp,
  FiBarChart2,
  FiGlobe,
  FiUsers,
  FiLock,
  FiTarget,
  FiStar,
  FiCpu,
  FiDatabase,
  FiGlobe as FiWorld,
} from "react-icons/fi";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import {
  USER_LEVEL,
  USER_LEVEL_IDS,
  USER_LEVEL_REQUIREMENTS_ASSET,
} from "@/constants/common/user";

// Extended tier data that complements the USER_LEVEL structure
const tierExtendData: Record<string, any> = {
  silver: {
    features: [
      "Up to 20 active concurrent orders",
      "Access to 5 non-custodial wallets",
      "Basic trading strategies (limit, scalp)",
      "Real-time portfolio tracking",
      "24/7 automated trading",
      "Basic risk management",
      "Email support",
    ],
    popular: false,
    gradient: "from-gray-300 to-gray-400",
    darkGradient: "from-gray-600 to-gray-700",
    textColor: 'text-gray-300',
    badgeColor: "bg-gray-100 text-gray-800",
    icon: (
      <div className="relative">
        <svg
          className="w-12 h-12"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill="url(#silver-gradient)"
            stroke="#A9A9A9"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient
              id="silver-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#C0C0C0" />
              <stop offset="100%" stopColor="#E5E4E2" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
    orderComplexity: "Basic",
    riskLevel: "Low",
    tradingSpeed: "Standard",
  },
  gold: {
    features: [
      "Up to 50 active concurrent orders",
      "Access to 7 non-custodial wallets",
      "Perpetual contract trading",
      "Up to 7 concurrent perp orders per asset",
      "Premium trading strategies (grid, DCA)",
      "Priority email and telegram support",
      "Advanced portfolio tracking",
      "Advanced risk management tools",
      "Multi-exchange arbitrage",
    ],
    popular: true,
    gradient: "from-yellow-400 to-amber-500",
    darkGradient: "from-yellow-600 to-amber-700",
    badgeColor: "bg-yellow-100 text-yellow-800",
    textColor: 'text-yellow-300',
    icon: (
      <div className="relative">
        <svg
          className="w-12 h-12"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill="url(#gold-gradient)"
            stroke="#DAA520"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient
              id="gold-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#FFA500" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
    orderComplexity: "Advanced",
    riskLevel: "Medium",
    tradingSpeed: "Fast",
  },
  platinum: {
    features: [
      "Up to 100 concurrent orders",
      "Access to 10 non-custodial wallets",
      "Up to 10 concurrent perp orders per asset",
      "Advanced trading strategies (grid, DCA, multi-scalp, sellToken)",
      "Advanced risk management with trailing stops",
      "24/7 priority developer support",
      "Real-time market data analysis",
      "Comprehensive performance analytics",
      "Customizable order settings",
      "Professional portfolio tracking",
      "API access (rate limited)",
    ],
    popular: false,
    gradient: "from-cyan-400 to-blue-500",
    darkGradient: "from-cyan-600 to-blue-700",
    badgeColor: "bg-blue-100 text-blue-800",
    textColor: 'text-cyan-300',
    icon: (
      <div className="relative">
        <svg
          className="w-12 h-12"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill="url(#platinum-gradient)"
            stroke="#4682B4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient
              id="platinum-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#E5E4E2" />
              <stop offset="100%" stopColor="#B0C4DE" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
    orderComplexity: "Professional",
    riskLevel: "High",
    tradingSpeed: "Ultra-Fast",
  },
  diamond: {
    features: [
      "Unlimited concurrent orders",
      "Unlimited non-custodial wallets",
      "Unlimited perp orders per asset",
      "Enterprise-grade trading tools",
      "Dedicated account manager",
      "Institutional-level market data",
      "Advanced risk management suite",
      "Full API access",
      "Custom integrations for your workflow",
      "White-glove onboarding support",
      "Custom strategy development",
      "Co-location services",
      "Market making tools",
    ],
    popular: false,
    gradient: "from-purple-400 to-violet-600",
    darkGradient: "from-purple-600 to-violet-800",
    badgeColor: "bg-purple-100 text-purple-800",
    textColor: 'text-purple-300',
    icon: (
      <div className="relative">
        <svg
          className="w-12 h-12"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7 4H17L22 9L12 22L2 9L7 4Z"
            fill="url(#diamond-gradient)"
            stroke="#9370DB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2 9H22M7 4L12 9L17 4M12 9V22"
            stroke="#9370DB"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <linearGradient
              id="diamond-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#E0B0FF" />
              <stop offset="100%" stopColor="#9370DB" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    ),
    orderComplexity: "Enterprise",
    riskLevel: "Custom",
    tradingSpeed: "Institutional",
  },
};

const formatStakeAmount = (quantity: string) => {
  const numAmount = Number(quantity);
  if (numAmount >= 1000000) {
    return (numAmount / 1000000).toFixed(1).replace(".0", "");
  }
  return quantity;
};

const PricingCard = ({
  tierKey,
  isSelected,
  onSelect,
}: {
  tierKey: string;
  isSelected: boolean;
  onSelect: (tier: string) => void;
}) => {
  const tierId = tierKey.toLowerCase();
  const baseData = USER_LEVEL[tierKey];
  const extendData = tierExtendData[tierId];
  const data = { ...baseData, ...extendData };

  return (
    <div
      className={`relative p-4 rounded-3xl border-2 transition-all duration-500 cursor-pointer transform hover:-translate-y-2 ${
        isSelected
          ? `border-blue-500 dark:border-blue-400 bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 shadow-2xl shadow-blue-500/30 scale-105`
          : `border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:shadow-xl`
      } ${
        data.popular ? "ring-4 ring-yellow-400/50 dark:ring-yellow-500/50" : ""
      }`}
      onClick={() => onSelect(tierId)}
    >
      {data.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>
      )}

      {/* Card Header */}
      <div className="text-center mb-8 relative">
        {/* <div className="absolute -top-2 -right-2 opacity-20">
          {data.icon}
        </div> */}

        <div className="flex flex-col items-center gap-4 mb-6">
          {/* <div className={`p-3 rounded-2xl bg-gradient-to-br ${data.gradient} dark:${data.darkGradient} shadow-lg`}>
            {data.icon}
          </div> */}
          <div>
            <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {data.name}
            </h3>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${data.badgeColor}`}
              >
                {tierId.toUpperCase()}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Tier{" "}
                {tierId === "silver"
                  ? "I"
                  : tierId === "gold"
                  ? "II"
                  : tierId === "platinum"
                  ? "III"
                  : "IV"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Capabilities */}
      <div className="mb-6 p-2 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <FiCpu className="w-5 h-5 text-purple-500" />
          <h4 className="font-bold text-gray-900 dark:text-white">
            Trading Capabilities
          </h4>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <div className="text-center">
            <div className="text-xs  text-gray-500 dark:text-gray-400 mb-1">
              Complexity
            </div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {data.orderComplexity}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Risk Level
            </div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {data.riskLevel}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Speed
            </div>
            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {data.tradingSpeed}
            </div>
          </div>
        </div>
      </div>

      {/* Features List */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FiZap className="w-5 h-5 text-yellow-500" />
          <h4 className="font-bold text-gray-900 dark:text-white">
            Key Features
          </h4>
        </div>
        <ul className="space-y-3  pr-2">
          {data.features.map((feature: string, index: number) => (
            <li key={index} className="flex items-start gap-3 group">
              <div className="mt-1 flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center">
                  <FiCheck className="w-3 h-3 text-white" />
                </div>
              </div>
              <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors text-sm">
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Strategy Info */}
      <div className="mb-8 p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl">
        <div className="flex items-center gap-2 mb-3">
          <FiTarget className="w-5 h-5 text-purple-500" />
          <h4 className="font-bold text-gray-900 dark:text-white">
            Trading Strategies
          </h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.benefits?.supportStrategy?.map((strategy: string) => (
            <span
              key={strategy}
              className={`px-3 py-1 rounded-full text-sm ${
                tierId === "silver"
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  : tierId === "gold"
                  ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                  : tierId === "platinum"
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
              }`}
            >
              {strategy.charAt(0).toUpperCase() + strategy.slice(1)}
            </span>
          ))}
        </div>
      </div>

      {/* CTA Button */}
      <button
        className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-[1.02] ${
          isSelected
            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50"
            : `bg-gradient-to-r ${data.gradient} dark:${data.darkGradient} text-white hover:shadow-xl`
        }`}
      >
        {isSelected ? "✓ Currently Selected" : `Upgrade to ${data.name}`}
      </button>
    </div>
  );
};

const PricingMain = () => {
  const { user, isConnected } = useStore(
    useShallow((state: any) => ({
      user: state.user,
      isConnected: state.isConnected,
    }))
  );
  const [selectedTier, setSelectedTier] = useState("gold");

  const handleTierSelect = (tier: string) => {
    setSelectedTier(tier);
  };

  const stats = [
    {
      icon: <FiTrendingUp />,
      label: "Active Traders",
      value: "10,000+",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: <FiBarChart2 />,
      label: "Orders Processed",
      value: "$2.5B+",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: <FiShield />,
      label: "Security Score",
      value: "99.9%",
      color: "from-purple-500 to-violet-500",
    },
    {
      icon: <FiUsers />,
      label: "Community Members",
      value: "50,000+",
      color: "from-amber-500 to-orange-500",
    },
  ];

  const platformFeatures = [
    {
      title: "Advanced Order Management",
      description:
        "Execute multiple orders simultaneously across different wallets and exchanges",
      icon: <FiTarget />,
      color: "text-blue-500 bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Non-Custodial Security",
      description: "Your keys, your crypto. We never hold your assets",
      icon: <FiLock />,
      color: "text-green-500 bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "Smart Risk Management",
      description: "Automated stop-loss, take-profit, and trailing stops",
      icon: <FiShield />,
      color: "text-purple-500 bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: "Real-time Analytics",
      description: "Advanced charting and performance tracking",
      icon: <FiBarChart2 />,
      color: "text-amber-500 bg-amber-100 dark:bg-amber-900/30",
    },
    {
      title: "Multi-Wallet Support",
      description: "Connect and manage multiple non-custodial wallets",
      icon: <FiGlobe />,
      color: "text-cyan-500 bg-cyan-100 dark:bg-cyan-900/30",
    },
    {
      title: "Algorithmic Trading",
      description: "Deploy custom trading algorithms and strategies",
      icon: <FiCpu />,
      color: "text-pink-500 bg-pink-100 dark:bg-pink-900/30",
    },
  ];

  const tiers = ["SILVER", "GOLD", "PLATINUM", "DIAMOND"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-white text-sm font-semibold">
            <FiZap className="w-4 h-4" />
            PROFESSIONAL TRADING PLATFORM
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Trade Smarter with
            <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Advanced Automation
            </span>
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Unlock institutional-grade trading tools, manage multiple wallets,
            and automate your strategies with our AI-powered platform trusted by
            professional traders worldwide.
          </p>

          {/* Stats */}
          {/* <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} mb-4 mx-auto`}
                >
                  <div className="text-white text-xl">{stat.icon}</div>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 dark:text-gray-400 text-sm">
                  {stat.label}
                </div>
              </div>
            ))}
          </div> */}
        </div>

        {/* Platform Features */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Our Platform?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              Experience the future of trading with cutting-edge features
              designed for success
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {platformFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700"
              >
                <div
                  className={`inline-flex p-4 rounded-2xl ${feature.color} mb-6`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Choose Your Trading Tier
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
              Stake GLADIATOR tokens to unlock higher tiers with more features
              and capabilities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {tiers.map((tierKey) => (
              <PricingCard
                key={tierKey}
                tierKey={tierKey}
                isSelected={
                  isConnected /*&& user.status === USER_LEVEL_IDS[tierKey]*/
                }
                onSelect={handleTierSelect}
              />
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 shadow-xl mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Detailed Feature Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 text-gray-900 dark:text-white font-bold">
                    Feature / Tier
                  </th>
                  {tiers.map((tierKey) => {
                    const tier = USER_LEVEL[tierKey];
                    return (
                      <th key={tierKey} className="text-center py-4">
                        <div className={`font-bold ${tierExtendData[tierKey.toLowerCase()].textColor}`}>
                          {tier.name}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-4 text-gray-700 dark:text-gray-300 font-medium">
                    Max Concurrent Orders
                  </td>
                  {tiers.map((tierKey) => {
                    const tier = USER_LEVEL[tierKey];
                    return (
                      <td key={tierKey} className="text-center py-4">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {tier.benefits.maxOrder === "Unlimited"
                            ? "∞"
                            : tier.benefits.maxOrder}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-4 text-gray-700 dark:text-gray-300 font-medium">
                    Wallet Connections
                  </td>
                  {tiers.map((tierKey) => {
                    const tier = USER_LEVEL[tierKey];
                    return (
                      <td key={tierKey} className="text-center py-4">
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {tier.benefits.maxWallet}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-4 text-gray-700 dark:text-gray-300 font-medium">
                    Trading Types
                  </td>
                  {tiers.map((tierKey) => {
                    const tier = USER_LEVEL[tierKey];
                    return (
                      <td key={tierKey} className="text-center py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {tier.benefits.supportTrading
                            .map(
                              (type: string) =>
                                type.charAt(0).toUpperCase() + type.slice(1)
                            )
                            .join(", ")}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-4 text-gray-700 dark:text-gray-300 font-medium">
                    Available Strategies
                  </td>
                  {tiers.map((tierKey) => {
                    const tier = USER_LEVEL[tierKey];
                    return (
                      <td key={tierKey} className="text-center py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {tier.benefits.supportStrategy.length} strategies
                        </div>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-4 text-gray-700 dark:text-gray-300 font-medium">
                    Eligibility
                  </td>
                  {tiers.map((tierKey) => {
                    const tier = USER_LEVEL[tierKey];
                    const stakeAmount = tier.requireMents["GLADIATOR"].quantity;
                    return (
                      <td key={tierKey} className="text-center py-4">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1 mb-1">
                            <img
                              src={
                                USER_LEVEL_REQUIREMENTS_ASSET["GLADIATOR"]
                                  .imageUrl
                              }
                              className="w-6 h-6 rounded-full"
                              alt="GLADIATOR"
                            />
                            <span className="font-bold text-gray-900 dark:text-white">
                              {formatStakeAmount(stakeAmount)}M
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            GLADIATOR Tokens stake!
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Upgrade Path Visualization */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            Upgrade Path & Benefits
          </h2>
          <div className="relative">
            {/* Progress Line */}
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 h-1 w-full bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700"></div>

            <div className="grid grid-cols-4 gap-4 relative z-10">
              {tiers.map((tierKey, index) => {
                const tier = USER_LEVEL[tierKey];
                const stakeAmount = tier.requireMents["GLADIATOR"].quantity;
                return (
                  <div key={tierKey} className="text-center">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                        tierKey === "SILVER"
                          ? "bg-gray-200 dark:bg-gray-700"
                          : tierKey === "GOLD"
                          ? "bg-yellow-200 dark:bg-yellow-700"
                          : tierKey === "PLATINUM"
                          ? "bg-blue-200 dark:bg-blue-700"
                          : "bg-purple-200 dark:bg-purple-700"
                      }`}
                    >
                      <span className="text-2xl font-bold">{index + 1}</span>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                      {tier.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {formatStakeAmount(stakeAmount)}M GLADIATOR
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {tier.benefits.maxOrder} orders •{" "}
                      {tier.benefits.maxWallet} wallets
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Everything you need to know about our trading tiers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {[
              {
                question: "How do I upgrade my tier?",
                answer:
                  "Simply stake more GLADIATOR tokens on ArenaStake. Your tier will automatically update based on your total stake amount. Visit the staking platform to adjust your position.",
              },
              {
                question: "What happens if I unstake tokens?",
                answer:
                  "Your tier will adjust based on your remaining stake. Make sure to maintain the minimum stake for your desired tier. You'll be downgraded if your stake falls below the required amount.",
              },
              {
                question: "Can I use multiple wallets simultaneously?",
                answer:
                  "Yes! Each tier supports multiple non-custodial wallet connections. Higher tiers support more simultaneous connections for managing different trading strategies.",
              },
              {
                question: "What trading strategies are available?",
                answer:
                  "Start with basic strategies (Limit, Scalp) and unlock advanced ones (Grid, DCA, Multi-Scalp) as you upgrade tiers. Each tier offers progressively sophisticated trading tools.",
              },
              {
                question: "Is there a trial period?",
                answer:
                  "Yes! Join our Telegram group for trial access to test our platform before committing to a stake. Experience the platform's capabilities firsthand.",
              },
              {
                question: "How secure is the platform?",
                answer:
                  "100% non-custodial. We never hold your funds. All trades are executed directly from your connected wallets using secure, audited smart contracts.",
              },
            ].map((faq, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white">
                    {index + 1}
                  </div>
                  {faq.question}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
          <div className="relative z-10 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">
              Ready to Elevate Your Trading?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of professional traders using our platform to
              maximize their returns
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="https://arenaburn.vercel.app/stake"
                target="_blank"
                className="inline-flex items-center justify-center gap-3 bg-white text-blue-600 font-bold px-8 py-4 rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                <FiArrowUpLeft className="w-5 h-5" />
                Start Staking on ArenaStake
              </Link>
              <button className="inline-flex items-center justify-center gap-3 bg-transparent border-2 border-white text-white font-bold px-8 py-4 rounded-2xl hover:bg-white/10 transition-all duration-300">
                Join Telegram Community
              </button>
            </div>
          </div>
          <div className="absolute inset-0 bg-grid-white/10 opacity-20"></div>
        </div>
      </div>
    </div>
  );
};

export default PricingMain;
