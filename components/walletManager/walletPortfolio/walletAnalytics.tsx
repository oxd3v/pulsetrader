"use client";

import { useState, useEffect, useRef } from "react";
import { 
  getNativeBalanceTransferForAnalytics, 
  getWalletTokenTransferForAnalytics 
} from "@/lib/oracle/analytics";

// --- Types ---
interface DataPoint {
  date: string;
  value: number;
}

interface AnalyticsProps {
  address: string;
  chainId: number;
  onlyArea?: boolean;
}

// --- Custom SVG Chart Component ---

const SimpleAreaChart = ({ 
  data, 
  color = "#82ca9d", 
  height = 200, 
  showXAxis = false 
}: { 
  data: DataPoint[], 
  color?: string, 
  height?: number, 
  showXAxis?: boolean 
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-zinc-500 font-medium text-sm italic" style={{ height }}>
        No historical data found for this period
      </div>
    );
  }

  const width = 1000; // Fixed coordinate system for SVG internals
  const maxVal = Math.max(...data.map(d => d.value)) || 1;
  const minVal = Math.min(...data.map(d => d.value)) || 0;
  const range = maxVal - minVal || 1;

  // Scaling helpers
  const getY = (val: number) => height - ((val - minVal) / range) * (height * 0.7) - (height * 0.15);
  const getX = (index: number) => (index / (data.length - 1)) * width;

  // Construct SVG Path
  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(" ");
  const areaPath = `${points} ${width},${height} 0,${height}`;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const index = Math.min(Math.max(Math.round(percentage * (data.length - 1)), 0), data.length - 1);
    setHoveredIndex(index);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full group transition-all"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredIndex(null)}
      style={{ height: height + (showXAxis ? 40 : 0) }}
    >
      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div 
          className="absolute z-30 pointer-events-none bg-zinc-900 border border-white/10 px-3 py-2 rounded-lg shadow-2xl text-[10px]"
          style={{ 
            left: `${(hoveredIndex / (data.length - 1)) * 100}%`,
            transform: `translateX(${hoveredIndex > data.length / 2 ? '-110%' : '10%'})`,
            top: '0px'
          }}
        >
          <p className="text-zinc-500 font-mono mb-0.5">{data[hoveredIndex].date}</p>
          <p className="text-white font-bold text-sm">
            ${data[hoveredIndex].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}

      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Fill Area */}
        <polygon points={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />

        {/* Line */}
        <polyline 
          points={points} 
          fill="none" 
          stroke={color} 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          vectorEffect="non-scaling-stroke"
        />

        {/* Hover Vertical Line */}
        {hoveredIndex !== null && (
          <line 
            x1={getX(hoveredIndex)} y1="0" x2={getX(hoveredIndex)} y2={height} 
            stroke="white" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.3"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {showXAxis && (
        <div className="flex justify-between items-center mt-4 px-1 text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
          <span>{data[0]?.date}</span>
          <span>{data[Math.floor(data.length / 2)]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      )}
    </div>
  );
};

export default function Analytics({ address, chainId, onlyArea = false }: AnalyticsProps) {
  const [tokensSent, setTokensSent] = useState<DataPoint[]>([]);
  const [tokensReceive, setTokensReceive] = useState<DataPoint[]>([]);
  const [dailyBalance, setDailyBalance] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!address) return;
      setLoading(true);
      try {
        const [tokenTransfer, walletBalance] = await Promise.all([
          getWalletTokenTransferForAnalytics(address, chainId),
          getNativeBalanceTransferForAnalytics(address, chainId)
        ]);

        if (tokenTransfer) {
          setTokensSent(tokenTransfer.erc20TransfersFrom?.map((i: any) => ({ date: i[0], value: i[1] })) || []);
          setTokensReceive(tokenTransfer.erc20TransfersTo?.map((i: any) => ({ date: i[0], value: i[1] })) || []);
        }
        if (walletBalance) {
          setDailyBalance(walletBalance.map((i: any) => ({ date: i[0], value: i[1] })) || []);
        }
      } catch (e) {
        console.error("Analytics fetch error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address, chainId]);

  if (loading) {
    return (
      <div className="w-full flex flex-col gap-4 animate-pulse">
        <div className="h-64 bg-zinc-100 dark:bg-zinc-800/50 rounded-3xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-40 bg-zinc-100 dark:bg-zinc-800/50 rounded-3xl" />
          <div className="h-40 bg-zinc-100 dark:bg-zinc-800/50 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Main Balance Chart */}
      <div className="bg-white dark:bg-[#0c0d10] border border-zinc-200 dark:border-white/5 rounded-[32px] p-6 lg:p-8">
        {!onlyArea && (
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Portfolio Performance</h2>
              <p className="text-2xl font-black text-zinc-900 dark:text-white mt-1">Native Balance History</p>
            </div>
          </div>
        )}
        <SimpleAreaChart 
          data={dailyBalance} 
          color="#3b82f6" 
          height={240} 
          showXAxis={!onlyArea} 
        />
      </div>

      {!onlyArea && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incoming Activity */}
          <div className="bg-white dark:bg-[#0c0d10] border border-zinc-200 dark:border-white/5 rounded-[32px] p-6">
            <h3 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-6">Total Tokens Received</h3>
            <SimpleAreaChart 
              data={tokensReceive} 
              color="#10b981" 
              height={140} 
              showXAxis 
            />
          </div>

          {/* Outgoing Activity */}
          <div className="bg-white dark:bg-[#0c0d10] border border-zinc-200 dark:border-white/5 rounded-[32px] p-6">
            <h3 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-6">Total Tokens Sent</h3>
            <SimpleAreaChart 
              data={tokensSent} 
              color="#f43f5e" 
              height={140} 
              showXAxis 
            />
          </div>
        </div>
      )}
    </div>
  );
}