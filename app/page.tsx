"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiTarget, FiZap, FiShield, FiArrowRight, FiLayers } from "react-icons/fi";
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
      } catch (e) {
        console.error(e);
      }
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
              <span className="relative z-10 flex items-center gap-2 uppercase italic text-sm text-black">
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

        <TerminalMockup />
      </main>

      <footer className="relative z-10 py-12 text-center">
        <p className="text-[9px] font-mono text-slate-700 tracking-[0.5em] uppercase">
          PulseTrader Terminal // Developed for High-Frequency Precision
        </p>
      </footer>
    </div>
  );
}

function TerminalMockup() {
  const [logs, setLogs] = useState<string[]>([]);
  const [typedText, setTypedText] = useState("");
  const fullText = "IF BTC < 65000 AND RSI < 30 THEN BUY";

  // Rolling Logs
  useEffect(() => {
    const logPool = [
      "Analyzing BTC/USDT order book...",
      "Liquidity check: $42.5M pool depth",
      "Scanning Arbitrum bridge activity...",
      "Social Alpha: Trending Bullish (+12%)",
      "Network Congestion: Normal (12 gwei)",
      "Cross-chain sync: Base, Solomon, Arbitrum",
      "Signal check: EMA-20/50 crossover pending",
      "Strategic snapshot captured: Stable"
    ];

    let i = 0;
    const interval = setInterval(() => {
      const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newLog = `[${timestamp}] ${logPool[i % logPool.length]}`;
      setLogs(prev => [newLog, ...prev].slice(0, 5));
      i++;
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Typing Effect
  useEffect(() => {
    let i = 0;
    let isDeleting = false;
    const interval = setInterval(() => {
      if (!isDeleting) {
        setTypedText(fullText.slice(0, i));
        i++;
        if (i > fullText.length) {
          isDeleting = true;
          setTimeout(() => { }, 2000); // Pause at end
        }
      } else {
        setTypedText(fullText.slice(0, i));
        i--;
        if (i < 0) {
          isDeleting = false;
          i = 0;
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative group max-w-5xl mx-auto rounded-3xl border border-white/5 bg-[#0a0c10] p-3 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none group-hover:opacity-100 opacity-50 transition-opacity" />

      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 relative z-10">
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-900/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-900/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-900/40" />
        </div>
        <div className="text-[9px] font-mono text-blue-500/50 uppercase tracking-[0.3em]">Quantitative Execution Core v2.0</div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-green-500/70 animate-pulse">SYNC ACTIVE</span>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#10b981]" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="p-8 border-b lg:border-b-0 lg:border-r border-white/5 bg-black/20 flex flex-col items-center justify-center min-h-[300px] relative">
          <div className="bg-blue-600/10 border border-blue-500/20 px-6 py-4 rounded-xl mb-6 relative group/code overflow-hidden w-full max-w-xs text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/code:translate-x-full transition-transform duration-1000" />
            <code className="text-sm font-mono text-white tracking-wide">
              {typedText}<span className="animate-pulse text-blue-400">|</span>
            </code>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
            <span className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-blue-500" />
              EMA-20: <span className="text-white">$64,281</span>
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-purple-500" />
              RSI: <span className="text-white">28.4</span>
            </span>
          </div>
        </div>

        <div className="p-6 font-mono text-[11px] leading-relaxed relative min-h-[300px]">
          <div className="absolute top-4 right-6 text-[10px] text-slate-700">SYSTERM_FEED</div>
          <div className="space-y-3 mt-4">
            <AnimatePresence mode="popLayout">
              {logs.map((log, idx) => (
                <motion.div
                  key={log}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1 - idx * 0.2, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={idx === 0 ? "text-blue-400" : "text-slate-500"}
                >
                  {log}
                </motion.div>
              ))}
            </AnimatePresence>
            {logs.length === 0 && <div className="text-slate-800 italic">Initializing data stream...</div>}
          </div>

          <div className="absolute bottom-6 left-6 right-6 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between group-hover:border-emerald-500/30 transition-colors">
            <span className="text-[10px] text-emerald-500 font-bold tracking-tight">STRATEGY CONFIRMED: AUTO-EXECUTE READY</span>
            <div className="flex -space-x-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="w-4 h-4 rounded-full border border-black bg-blue-600 flex items-center justify-center text-[8px] text-white">
                  ₿
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
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