'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  OrderBookLevel,
  OrderBookSnapshot,
  TradeItem,
  useRealTimeOrderBook,
} from '@/hooks/useRealTimeOrderBook';

type ActiveTab = 'orderbook' | 'trades';

interface OrderBookPriceLevelsProps {
  symbol: string;
  maxDepth?: number;
  displayCount?: number;
  tradesDisplayCount?: number;
  useWebSocket?: boolean;
  updateThrottleMs?: number;
}

const EMPTY_SNAPSHOT: OrderBookSnapshot = {
  bids: [],
  asks: [],
  bestBidPrice: 0,
  bestAskPrice: 0,
  spread: 0,
  spreadPercent: 0,
  lastUpdateTime: 0,
};

const formatPrice = (price: number): string => {
  if (!Number.isFinite(price) || price <= 0) return '-';

  if (price >= 1000) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  if (price >= 1) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }

  return price.toLocaleString('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
};

const formatCompactUsdt = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return '-';
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
};

const formatTradeTime = (timestamp: number): string => {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '--:--:--';

  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};

const setText = (node: HTMLElement | null | undefined, value: string): void => {
  if (node && node.textContent !== value) {
    node.textContent = value;
  }
};

const setWidth = (node: HTMLElement | null | undefined, value: string): void => {
  if (node && node.style.width !== value) {
    node.style.width = value;
  }
};

const setOpacity = (node: HTMLElement | null | undefined, value: string): void => {
  if (node && node.style.opacity !== value) {
    node.style.opacity = value;
  }
};

const OrderBookPriceLevelsComponent: React.FC<OrderBookPriceLevelsProps> = ({
  symbol,
  maxDepth = 20,
  displayCount = 10,
  tradesDisplayCount = 20,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('orderbook');

  const askRowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const askBarRefs = useRef<Array<HTMLDivElement | null>>([]);
  const askPriceRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const askSizeRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const askTotalRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const bidRowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const bidBarRefs = useRef<Array<HTMLDivElement | null>>([]);
  const bidPriceRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const bidSizeRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const bidTotalRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const tradeRowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const tradePriceRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const tradeSizeRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const tradeTimeRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const midPriceRef = useRef<HTMLSpanElement | null>(null);
  const spreadRef = useRef<HTMLSpanElement | null>(null);

  const patchBookRow = useCallback(
    (index: number, side: 'ask' | 'bid', level: OrderBookLevel | undefined, maxTotal: number) => {
      const rowRefs = side === 'ask' ? askRowRefs.current : bidRowRefs.current;
      const barRefs = side === 'ask' ? askBarRefs.current : bidBarRefs.current;
      const priceRefs = side === 'ask' ? askPriceRefs.current : bidPriceRefs.current;
      const sizeRefs = side === 'ask' ? askSizeRefs.current : bidSizeRefs.current;
      const totalRefs = side === 'ask' ? askTotalRefs.current : bidTotalRefs.current;

      const row = rowRefs[index];
      const bar = barRefs[index];
      const priceNode = priceRefs[index];
      const sizeNode = sizeRefs[index];
      const totalNode = totalRefs[index];

      if (!level || level.sizeUSDT <= 0 || level.totalUSDT <= 0) {
        setText(priceNode, '-');
        setText(sizeNode, '-');
        setText(totalNode, '-');
        setWidth(bar, '0%');
        setOpacity(row, '0.55');
        return;
      }

      const depthPercent =
        maxTotal > 0 ? Math.min((level.totalUSDT / maxTotal) * 100, 100) : 0;

      setText(priceNode, formatPrice(level.price));
      setText(sizeNode, formatCompactUsdt(level.sizeUSDT));
      setText(totalNode, formatCompactUsdt(level.totalUSDT));
      setWidth(bar, `${depthPercent.toFixed(2)}%`);
      setOpacity(row, '1');

      if (bar) {
        const nextColor =
          side === 'bid' ? 'rgba(34, 197, 94, 0.20)' : 'rgba(248, 113, 113, 0.20)';
        if (bar.style.backgroundColor !== nextColor) {
          bar.style.backgroundColor = nextColor;
        }
      }
    },
    []
  );

  const renderOrderBook = useCallback(
    (snapshot: OrderBookSnapshot) => {
      const asksForDisplay = snapshot.asks.slice(0, displayCount).reverse();
      const bidsForDisplay = snapshot.bids.slice(0, displayCount);

      const maxAskTotal = asksForDisplay.reduce((maxValue, level) => {
        return Math.max(maxValue, level.totalUSDT);
      }, 1);
      const maxBidTotal = bidsForDisplay.reduce((maxValue, level) => {
        return Math.max(maxValue, level.totalUSDT);
      }, 1);

      for (let index = 0; index < displayCount; index += 1) {
        patchBookRow(index, 'ask', asksForDisplay[index], maxAskTotal);
        patchBookRow(index, 'bid', bidsForDisplay[index], maxBidTotal);
      }

      const midPrice =
        snapshot.bestBidPrice > 0 && snapshot.bestAskPrice > 0
          ? (snapshot.bestBidPrice + snapshot.bestAskPrice) / 2
          : snapshot.bestBidPrice || snapshot.bestAskPrice;

      setText(midPriceRef.current, midPrice > 0 ? formatPrice(midPrice) : '-');

      const spreadText =
        snapshot.spread > 0
          ? `${formatPrice(snapshot.spread)} (${snapshot.spreadPercent.toFixed(3)}%)`
          : '-';
      setText(spreadRef.current, spreadText);
    },
    [displayCount, patchBookRow]
  );

  const renderTrades = useCallback(
    (trades: TradeItem[]) => {
      const visibleTrades = trades.slice(0, tradesDisplayCount);

      for (let index = 0; index < tradesDisplayCount; index += 1) {
        const row = tradeRowRefs.current[index];
        const priceNode = tradePriceRefs.current[index];
        const sizeNode = tradeSizeRefs.current[index];
        const timeNode = tradeTimeRefs.current[index];
        const trade = visibleTrades[index];

        if (!trade || trade.sizeUSDT <= 0) {
          setText(priceNode, '-');
          setText(sizeNode, '-');
          setText(timeNode, '--:--:--');
          setOpacity(row, '0.55');
          if (priceNode) {
            priceNode.style.color = '#9ca3af';
          }
          continue;
        }

        setText(priceNode, formatPrice(trade.price));
        setText(sizeNode, formatCompactUsdt(trade.sizeUSDT));
        setText(timeNode, formatTradeTime(trade.time));
        setOpacity(row, '1');

        if (priceNode) {
          priceNode.style.color = trade.isBuyerMaker ? '#fb923c' : '#22c55e';
        }
      }
    },
    [tradesDisplayCount]
  );

  const handleOrderBookUpdate = useCallback(
    (snapshot: OrderBookSnapshot) => {
      renderOrderBook(snapshot);
    },
    [renderOrderBook]
  );

  const handleTradesUpdate = useCallback(
    (trades: TradeItem[]) => {
      renderTrades(trades);
    },
    [renderTrades]
  );

  const { loading, error, connected, marketSymbol } = useRealTimeOrderBook({
    symbol,
    depth: maxDepth,
    tradesLimit: tradesDisplayCount,
    onOrderBookUpdate: handleOrderBookUpdate,
    onTradesUpdate: handleTradesUpdate,
  });

  const orderBookSlots = useMemo(() => Array.from({ length: displayCount }), [displayCount]);
  const tradeSlots = useMemo(
    () => Array.from({ length: tradesDisplayCount }),
    [tradesDisplayCount]
  );

  useEffect(() => {
    askRowRefs.current.length = displayCount;
    askBarRefs.current.length = displayCount;
    askPriceRefs.current.length = displayCount;
    askSizeRefs.current.length = displayCount;
    askTotalRefs.current.length = displayCount;

    bidRowRefs.current.length = displayCount;
    bidBarRefs.current.length = displayCount;
    bidPriceRefs.current.length = displayCount;
    bidSizeRefs.current.length = displayCount;
    bidTotalRefs.current.length = displayCount;

    tradeRowRefs.current.length = tradesDisplayCount;
    tradePriceRefs.current.length = tradesDisplayCount;
    tradeSizeRefs.current.length = tradesDisplayCount;
    tradeTimeRefs.current.length = tradesDisplayCount;

    renderOrderBook(EMPTY_SNAPSHOT);
    renderTrades([]);
  }, [displayCount, tradesDisplayCount, renderOrderBook, renderTrades]);

  return (
    <div className="h-full min-h-0 bg-[#0f1116] border border-[#1f2430] rounded-lg overflow-hidden flex flex-col">
      <div className="px-3 pt-2 border-b border-[#1f2430]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('orderbook')}
              className={`text-sm leading-none pb-1 border-b transition-colors ${
                activeTab === 'orderbook'
                  ? 'text-white border-white'
                  : 'text-gray-400 border-transparent hover:text-gray-200'
              }`}
            >
              Order book
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('trades')}
              className={`text-sm leading-none pb-1 border-b transition-colors ${
                activeTab === 'trades'
                  ? 'text-white border-white'
                  : 'text-gray-400 border-transparent hover:text-gray-200'
              }`}
            >
              Trades
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? 'bg-emerald-400' : 'bg-red-400'
              }`}
            />
            <span>{connected ? 'Live' : loading ? 'Loading' : 'Disconnected'}</span>
          </div>
        </div>

        <div className="mt-2 pb-2 flex items-center justify-between text-[11px] text-gray-500">
          <span>{marketSymbol || '--'}</span>
          {error ? <span className="text-red-400">{error}</span> : <span>Depth {maxDepth}</span>}
        </div>
      </div>

      <div className={`${activeTab === 'orderbook' ? 'flex' : 'hidden'} flex-1 min-h-0 flex-col`}>
        <div className="grid grid-cols-3 px-3 py-2 text-[11px] text-gray-500 border-b border-[#1f2430]">
          <span>Price (USDT)</span>
          <span className="text-right">Size (USDT)</span>
          <span className="text-right">Total (USDT)</span>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden">
            {orderBookSlots.map((_, index) => (
              <div
                key={`ask-${index}`}
                ref={(node) => {
                  askRowRefs.current[index] = node;
                }}
                className="relative grid grid-cols-3 items-center h-[22px] px-3 font-mono text-xs"
              >
                <div
                  ref={(node) => {
                    askBarRefs.current[index] = node;
                  }}
                  className="pointer-events-none absolute inset-y-0 right-0 w-0"
                />
                <span
                  ref={(node) => {
                    askPriceRefs.current[index] = node;
                  }}
                  className="relative z-10 text-[#f97316]"
                >
                  -
                </span>
                <span
                  ref={(node) => {
                    askSizeRefs.current[index] = node;
                  }}
                  className="relative z-10 text-right text-gray-300"
                >
                  -
                </span>
                <span
                  ref={(node) => {
                    askTotalRefs.current[index] = node;
                  }}
                  className="relative z-10 text-right text-gray-200"
                >
                  -
                </span>
              </div>
            ))}
          </div>

          <div className="h-10 px-3 border-y border-[#1f2430] bg-[#151c2c] flex items-center justify-between">
            <span ref={midPriceRef} className="font-mono text-base font-semibold text-[#fb923c]">
              -
            </span>
            <span ref={spreadRef} className="font-mono text-xs text-gray-400">
              -
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {orderBookSlots.map((_, index) => (
              <div
                key={`bid-${index}`}
                ref={(node) => {
                  bidRowRefs.current[index] = node;
                }}
                className="relative grid grid-cols-3 items-center h-[22px] px-3 font-mono text-xs"
              >
                <div
                  ref={(node) => {
                    bidBarRefs.current[index] = node;
                  }}
                  className="pointer-events-none absolute inset-y-0 right-0 w-0"
                />
                <span
                  ref={(node) => {
                    bidPriceRefs.current[index] = node;
                  }}
                  className="relative z-10 text-[#22c55e]"
                >
                  -
                </span>
                <span
                  ref={(node) => {
                    bidSizeRefs.current[index] = node;
                  }}
                  className="relative z-10 text-right text-gray-300"
                >
                  -
                </span>
                <span
                  ref={(node) => {
                    bidTotalRefs.current[index] = node;
                  }}
                  className="relative z-10 text-right text-gray-200"
                >
                  -
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`${activeTab === 'trades' ? 'flex' : 'hidden'} flex-1 min-h-0 flex-col`}>
        <div className="grid grid-cols-3 px-3 py-2 text-[11px] text-gray-500 border-b border-[#1f2430]">
          <span>Price (USDT)</span>
          <span className="text-right">Size (USDT)</span>
          <span className="text-right">Time</span>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {tradeSlots.map((_, index) => (
            <div
              key={`trade-${index}`}
              ref={(node) => {
                tradeRowRefs.current[index] = node;
              }}
              className="grid grid-cols-3 items-center h-[22px] px-3 font-mono text-xs"
            >
              <span
                ref={(node) => {
                  tradePriceRefs.current[index] = node;
                }}
                className="text-gray-400"
              >
                -
              </span>
              <span
                ref={(node) => {
                  tradeSizeRefs.current[index] = node;
                }}
                className="text-right text-gray-300"
              >
                -
              </span>
              <span
                ref={(node) => {
                  tradeTimeRefs.current[index] = node;
                }}
                className="text-right text-gray-400"
              >
                --:--:--
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-1.5 border-t border-[#1f2430] text-[11px] text-gray-500">
        Positive-only filter active for size and total values.
      </div>
    </div>
  );
};

const OrderBookPriceLevels = React.memo(
  OrderBookPriceLevelsComponent,
  (prev, next) =>
    prev.symbol === next.symbol &&
    prev.maxDepth === next.maxDepth &&
    prev.displayCount === next.displayCount &&
    prev.tradesDisplayCount === next.tradesDisplayCount &&
    prev.useWebSocket === next.useWebSocket &&
    prev.updateThrottleMs === next.updateThrottleMs
);

OrderBookPriceLevels.displayName = 'OrderBookPriceLevels';

export default OrderBookPriceLevels;
