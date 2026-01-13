"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiTrendingUp, FiZap, FiShield, FiCpu, FiTarget, FiArrowRight, FiActivity, FiLayers } from "react-icons/fi";
import Link from "next/link";
import { fetchCodexFilterTokens } from "@/lib/oracle/codex";

// Chain Data with Logos (Scattered positioning logic)
const chains = [
  { name: "Ethereum", color: "from-blue-500", top: "15%", left: "10%", delay: 0 },
  { name: "Solana", color: "from-purple-500", top: "25%", left: "75%", delay: 0.2 },
  { name: "Base", color: "from-blue-400", top: "65%", left: "15%", delay: 0.4 },
  { name: "Arbitrum", color: "from-cyan-600", top: "80%", left: "70%", delay: 0.1 },
  { name: "Polygon", color: "from-purple-600", top: "45%", left: "85%", delay: 0.3 },
  { name: "BSC", color: "from-yellow-500", top: "10%", left: "60%", delay: 0.5 },
  { name: "Avalanche", color: "from-red-500", top: "75%", left: "30%", delay: 0.25 },
];

export default function PulseTraderHome() {
  const [trending, setTrending] = useState<any[]>([]);

  useEffect(() => {
    async function loadTrending() {
      try {
        const data = await fetchCodexFilterTokens({
          variables: { limit: 4, statsType: "FILTERED", filters: { liquidity: { gt: 100000 } } }
        });
        setTrending(data || []);
      } catch (e) { console.error(e); }
    }
    loadTrending();
  }, []);

  return (
    <div className="min-h-screen bg-[#060709] text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden relative">
      
      {/* --- SCATTERED CHAIN CLOUD BACKGROUND --- */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {chains.map((chain, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ 
                opacity: [0.1, 0.3, 0.1], 
                y: [0, -20, 0],
                scale: 1 
            }}
            transition={{ 
                duration: 5 + i, 
                repeat: Infinity, 
                delay: chain.delay 
            }}
            style={{ top: chain.top, left: chain.left }}
            className="absolute flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm"
          >
            <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${chain.color} shadow-[0_0_12px_rgba(255,255,255,0.3)] animate-pulse`} />
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">{chain.name}</span>
          </motion.div>
        ))}
      </div>

      {/* Cinematic Overlays */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-blue-600/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150" />
      </div>

      <main className="relative z-10 container mx-auto px-6 pt-24 pb-20">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-12">
           {/* <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.3)] mb-6"
           >
             <FiActivity className="w-8 h-8 text-white" strokeWidth={2.5} />
           </motion.div>
           <h1 className="text-4xl font-black tracking-tighter text-white">PULSE<span className="text-blue-500">TRADER</span></h1> */}
           <p className="text-slate-600 font-mono text-[10px] mt-2 tracking-[0.4em] uppercase">Multi-Chain Quantitative Terminal</p>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-8 leading-[1.1]">
            Trade on the edge <br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">of every signal.</span>
          </h2>
          
          <div className="flex justify-center gap-6">
            <Link 
              href="/strategy"
              className="group relative px-10 py-4 bg-white text-black font-black rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-2xl"
            >
              <span className="relative z-10 flex items-center gap-2 uppercase italic text-sm">
                Enter Terminal <FiArrowRight />
              </span>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-32 max-w-6xl mx-auto">
          <FeatureCard 
            icon={<FiTarget className="text-blue-400" />}
            title="Strategy Engine"
            desc="Set auto-buys on RSI oversold or EMA crossovers across 20+ chains."
          />
          <FeatureCard 
            icon={<FiLayers className="text-cyan-400" />}
            title="Multi-Chain Hub"
            desc="Unified interface for Ethereum, Solana, Base, and EVM L2s."
          />
          <FeatureCard 
            icon={<FiZap className="text-yellow-400" />}
            title="Futures & Spot"
            desc="High-leverage perps or deep-liquidity spot swaps in one terminal."
          />
          <FeatureCard 
            icon={<FiShield className="text-green-400" />}
            title="Non-Custodial"
            desc="No deposits. Trade directly from your wallet with zero counterparty risk."
          />
        </div>

        {/* Interactive Terminal Mockup */}
        
        <div className="relative group max-w-5xl mx-auto rounded-3xl border border-white/5 bg-[#0a0c10] p-3 shadow-[0_0_100px_rgba(0,0,0,1)]">
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
            <div className="flex gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
            </div>
            <div className="text-[9px] font-mono text-blue-500/50 uppercase tracking-[0.3em]">Cross-Chain Data Sync Active</div>
            <div className="w-4 h-4 rounded-full bg-green-500/20 animate-pulse flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            </div>
          </div>

          <div className="h-[300px] w-full flex items-center justify-center relative bg-[url('https://www.tradingview.com/static/images/free-pw-background.png')] bg-cover opacity-40 grayscale">
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0c10]" />
             <div className="z-10 flex flex-col items-center">
                <div className="text-xs font-mono text-slate-400 mb-4 px-4 py-2 border border-white/10 rounded-lg bg-black/50">
                    IF <span className="text-blue-400">RSI &lt; 30</span> AND <span className="text-purple-400">VOL &gt; 1M</span> THEN <span className="text-green-400">BUY</span>
                </div>
                <div className="text-[10px] text-slate-600 font-mono italic">Waiting for signal crossover...</div>
             </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-12 text-center">
        <p className="text-[9px] font-mono text-slate-700 tracking-[0.5em] uppercase">
          PulseTrader Terminal // Developed for High-Frequency Precision
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 bg-gradient-to-b from-white/5 to-transparent border border-white/5 rounded-3xl hover:border-blue-500/30 transition-all group">
      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-blue-600/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-white font-bold text-lg mb-3">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}