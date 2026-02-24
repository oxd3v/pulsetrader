"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  FiArrowUpRight,
  FiCheck,
  FiZap,
  FiShield,
  FiBarChart2,
  FiLock,
  FiTarget,
  FiCpu,
  FiMessageCircle,
  FiSettings,
  FiStar,
  FiTrendingUp
} from "react-icons/fi";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import {
  USER_LEVEL,
} from "@/constants/common/user";

// --- Types & Data ---
const tierExtendData: Record<string, any> = {
  iron: {
    icon: <FiZap className="text-gray-400" />,
    description: "For casual traders starting their automation journey.",
    features: ["2 Concurrent Orders", "2 Wallets", "Limit & Scalp", "Portfolio Tracking"],
    upcoming: ["Telegram Bot", "AI Signals"],
    color: "gray",
  },
  silver: {
    icon: <FiTrendingUp className="text-blue-400" />,
    description: "Enhanced capacity for active daily traders.",
    features: ["20 Concurrent Orders", "5 Wallets", "Advanced Tracking", "Email Support"],
    upcoming: ["Telegram Bot", "AI Integration"],
    color: "blue",
  },
  gold: {
    icon: <FiStar className="text-yellow-400" />,
    description: "The sweet spot for professional DeFi enthusiasts.",
    features: ["50 Concurrent Orders", "7 Wallets", "Perp Trading", "Grid & DCA", "Arbitrage"],
    upcoming: ["Priority AI", "Custom Orders"],
    popular: true,
    color: "yellow",
  },
  platinum: {
    icon: <FiShield className="text-cyan-400" />,
    description: "Professional tools with developer-grade support.",
    features: ["100 Concurrent Orders", "10 Wallets", "Trailing Stops", "API Access (Limited)"],
    upcoming: ["Custom Algo", "Full AI Bot"],
    color: "cyan",
  },
  diamond: {
    icon: <FiCpu className="text-purple-400" />,
    description: "Institutional scale with no limits and full API.",
    features: ["Unlimited Orders", "Unlimited Wallets", "Full API access", "Custom Integrations"],
    upcoming: ["White-label", "SLA Support"],
    color: "purple",
  },
};

const formatStakeAmount = (quantity: string) => {
  const num = Number(quantity);
  return num >= 1_000_000 ? `${(num / 1_000_000).toFixed(0)}M` : quantity;
};

// --- Sub-Components ---

const FeatureItem = ({ text, isUpcoming = false }: { text: string; isUpcoming?: boolean }) => (
  <li className="flex items-center gap-3 text-sm group">
    {isUpcoming ? (
      <FiSettings className="text-amber-500/50 group-hover:rotate-90 transition-transform" size={14} />
    ) : (
      <FiCheck className="text-emerald-500" size={16} />
    )}
    <span className={isUpcoming ? "text-gray-500 italic" : "text-gray-700 dark:text-gray-300"}>
      {text}
      {isUpcoming && <span className="ml-2 text-[10px] uppercase tracking-tighter opacity-70">Soon</span>}
    </span>
  </li>
);

const PricingCard = ({ tierKey, userStatus, onSelect }: any) => {
  const id = tierKey.toLowerCase();
  const base = USER_LEVEL[tierKey];
  const ext = tierExtendData[id];
  const isActive = userStatus === tierKey;

  return (
    <div className={`relative flex flex-col p-6 rounded-3xl transition-all duration-300 border ${
      ext.popular 
        ? "border-yellow-500/50 bg-yellow-500/5 dark:bg-yellow-500/[0.02] shadow-xl scale-105 z-10" 
        : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50"
    } hover:border-blue-500/50 hover:shadow-2xl group`}>
      
      {ext.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-amber-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
          Most Popular
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 group-hover:scale-110 transition-transform">
            {ext.icon}
          </div>
          <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
            {formatStakeAmount(base.requireMents?.GLADIATOR?.quantity || "0")} Stake
          </span>
        </div>
        <h3 className="text-2xl font-bold dark:text-white">{base.name}</h3>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">{ext.description}</p>
      </div>

      <div className="flex-1">
        <p className="text-[10px] font-bold uppercase text-gray-400 mb-4 tracking-widest">Core Features</p>
        <ul className="space-y-3 mb-6">
          {ext.features.map((f: string) => <FeatureItem key={f} text={f} />)}
          {ext.upcoming.map((f: string) => <FeatureItem key={f} text={f} isUpcoming />)}
        </ul>
      </div>

      <button
        onClick={() => onSelect(id)}
        disabled={isActive}
        className={`w-full py-4 rounded-2xl font-bold text-sm transition-all ${
          isActive
            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default"
            : "bg-gray-900 dark:bg-white dark:text-black text-white hover:opacity-90 active:scale-95 shadow-lg"
        }`}
      >
        {isActive ? "Your Current Tier" : `Upgrade to ${base.name}`}
      </button>
    </div>
  );
};

// --- Main Component ---

const PricingMain = () => {
  const { user, isConnected } = useStore(useShallow((s: any) => ({ user: s.user, isConnected: s.isConnected })));
  const userTier = isConnected ? user?.status?.toUpperCase() : null;

  const features = [
    { title: "Non-Custodial", desc: "Your keys, your crypto. Period.", icon: <FiLock />, color: "text-blue-500" },
    { title: "Risk Safeguards", desc: "Hard-coded stop losses and protection.", icon: <FiShield />, color: "text-emerald-500" },
    { title: "Advanced Analytics", desc: "Real-time PnL and trade history.", icon: <FiBarChart2 />, color: "text-purple-500" },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#050505] text-gray-900 dark:text-gray-100 pb-20">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold mb-6">
          <FiZap size={14} /> NEW: V3 ALGO STRATEGIES NOW LIVE
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          The Future of <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">DeFi Automation.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-gray-500 dark:text-gray-400 text-lg md:text-xl">
          Scale your trading from Iron to Diamond. Stake GLADIATOR to unlock 
          institutional-grade liquidity and execution.
        </p>
      </section>

      {/* Main Grid */}
      <section className="max-w-7xl mx-auto px-6 mb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {Object.keys(USER_LEVEL).map((key) => (
            <PricingCard 
              key={key} 
              tierKey={key} 
              userStatus={userTier} 
              onSelect={(id: string) => window.open('https://arenaburn.vercel.app/stake', '_blank')}
            />
          ))}
        </div>
      </section>

      {/* Trust & Features */}
      <section className="max-w-5xl mx-auto px-6 mb-32">
        <div className="grid md:grid-cols-3 gap-12">
          {features.map((f, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className={`mb-4 p-4 rounded-full bg-gray-100 dark:bg-gray-800 ${f.color}`}>{f.icon}</div>
              <h4 className="font-bold text-lg mb-2">{f.title}</h4>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Simplified FAQ & Comparison Toggle could go here */}

      {/* Final Call to Action */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="relative rounded-[40px] overflow-hidden bg-blue-600 dark:bg-blue-700 p-12 text-center text-white">
          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-4">Ready to dominate the arena?</h2>
            <p className="text-blue-100 mb-8 max-w-lg mx-auto">Join the next generation of algorithmic traders. No hidden fees, just pure execution.</p>
            <Link
              href="https://arenaburn.vercel.app/stake"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold hover:shadow-2xl transition-all"
            >
              Start Staking Now <FiArrowUpRight />
            </Link>
          </div>
          {/* Background Decorative Circles */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-black/10 rounded-full blur-3xl"></div>
        </div>
      </section>
    </div>
  );
};

export default PricingMain;