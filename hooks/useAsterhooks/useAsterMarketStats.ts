import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getAsterSymbolTradingLimits,
  type AsterExchangeSymbol,
} from "@/lib/oracle/asterdexLimits";

import { getLeverageBracket } from "@/lib/oracle/asterdex";

type RawTickerPayload = {
  e?: string;
  E?: number | string;
  s?: string;
  c?: number | string;
  p?: number | string;
  P?: number | string;
  q?: number | string;
};

type RawMarkPricePayload = {
  e?: string;
  E?: number | string;
  s?: string;
  p?: number | string;
  i?: number | string;
  r?: number | string;
  T?: number | string;
};

type RawOpenInterestPayload = {
  symbol?: string;
  openInterest?: number | string;
  time?: number | string;
};

type RawPremiumIndexPayload = {
  symbol?: string;
  markPrice?: number | string;
  indexPrice?: number | string;
  lastFundingRate?: number | string;
  nextFundingTime?: number | string;
  time?: number | string;
};

type RawTickerRestPayload = {
  symbol?: string;
  lastPrice?: number | string;
  priceChangePercent?: number | string;
  quoteVolume?: number | string;
  time?: number | string;
};

type RawExchangeInfoPayload = {
  symbols?: AsterExchangeSymbol[];
};

type TickerLikePayload = {
  c?: number | string;
  lastPrice?: number | string;
  P?: number | string;
  priceChangePercent?: number | string;
  q?: number | string;
  quoteVolume?: number | string;
  E?: number | string;
  time?: number | string;
};

type MarkLikePayload = {
  p?: number | string;
  markPrice?: number | string;
  i?: number | string;
  indexPrice?: number | string;
  r?: number | string;
  lastFundingRate?: number | string;
  T?: number | string;
  nextFundingTime?: number | string;
  E?: number | string;
  time?: number | string;
};

interface UseAsterMarketStatsOptions {
  openInterestPollMs?: number;
}

export interface AsterMarketStats {
  symbol: string;
  minQty: string;
  maxQty: string;
  maxLeverage: number;
  lastPrice: number;
  priceChangePercent: number;
  markPrice: number;
  indexPrice: number;
  fundingRate: number;
  nextFundingTime: number;
  quoteVolume: number;
  openInterest: number;
  openInterestUsd: number;
  eventTime: number;
}

interface UseAsterMarketStatsReturn {
  loading: boolean;
  error: string | null;
  connected: boolean;
  marketSymbol: string;
  stats: AsterMarketStats;
}

const WS_BASE_URL = "wss://fstream.asterdex.com/stream?streams=";
const REST_BASE_URL = "https://fapi.asterdex.com/fapi/v3";
const RECONNECT_DELAY_MS = 3000;
const DEFAULT_OPEN_INTEREST_POLL_MS = 15000;

const toFiniteNumber = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const normalizeSymbol = (symbol: string): string => {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return "";
  if (
    normalized.endsWith("USDT") ||
    normalized.endsWith("USDC") ||
    normalized.endsWith("BUSD")
  ) {
    return normalized;
  }
  return `${normalized}USDT`;
};

const createEmptyStats = (symbol: string): AsterMarketStats => ({
  symbol,
  minQty: "0",
  maxQty: "0",
  maxLeverage: 1,
  lastPrice: 0,
  priceChangePercent: 0,
  markPrice: 0,
  indexPrice: 0,
  fundingRate: 0,
  nextFundingTime: 0,
  quoteVolume: 0,
  openInterest: 0,
  openInterestUsd: 0,
  eventTime: 0,
});

const toErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

/**
 * Merge an incoming patch into previous stats, recomputing derived trading limits.
 * bracketMaxLeverage – when > 0 it is the authoritative value from the signed
 * leverageBracket API and overrides the margin-percent–derived value.
 */
const mergeStats = (
  previous: AsterMarketStats,
  patch: Partial<AsterMarketStats>,
  exchangeSymbol: AsterExchangeSymbol | null,
  bracketMaxLeverage = 0,
): AsterMarketStats => {
  const merged = {
    ...previous,
    ...patch,
  };

  const markReference = merged.markPrice > 0 ? merged.markPrice : merged.lastPrice;
  const tradingLimits = getAsterSymbolTradingLimits(exchangeSymbol, markReference);

  const minQty =
    tradingLimits.minOrderQty > 0
      ? tradingLimits.minOrderQty.toString()
      : merged.minQty;
  const maxQty =
    tradingLimits.maxOrderQty > 0
      ? tradingLimits.maxOrderQty.toString()
      : merged.maxQty;

  // Bracket API value is authoritative: use it when available.
  // Fall back to exchangeInfo-derived value, then to whatever was previously held.
  const maxLeverage =
    bracketMaxLeverage > 0
      ? bracketMaxLeverage
      : tradingLimits.maxLeverage > 1
        ? tradingLimits.maxLeverage
        : merged.maxLeverage;

  const openInterestUsd =
    markReference > 0 && merged.openInterest > 0
      ? merged.openInterest * markReference
      : 0;

  return {
    ...merged,
    minQty,
    maxQty,
    maxLeverage,
    openInterestUsd,
  };
};


export const useAsterMarketStats = (
  symbol: string,
  options: UseAsterMarketStatsOptions = {},
): UseAsterMarketStatsReturn => {
  const marketSymbol = useMemo(() => normalizeSymbol(symbol), [symbol]);
  const openInterestPollMs = useMemo(() => {
    const pollMs = Math.trunc(
      options.openInterestPollMs ?? DEFAULT_OPEN_INTEREST_POLL_MS,
    );
    return Math.max(5000, pollMs);
  }, [options.openInterestPollMs]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState<AsterMarketStats>(() =>
    createEmptyStats(marketSymbol),
  );

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openInterestIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const exchangeSymbolRef = useRef<AsterExchangeSymbol | null>(null);
  // Persists the bracket-API max leverage so every mergeStats call uses it
  const bracketMaxLeverageRef = useRef<number>(0);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const clearOpenInterestTimer = useCallback(() => {
    if (openInterestIntervalRef.current) {
      clearInterval(openInterestIntervalRef.current);
      openInterestIntervalRef.current = null;
    }
  }, []);

  const closeSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!marketSymbol) {
      setLoading(false);
      setError(null);
      setConnected(false);
      setStats(createEmptyStats(""));
      return undefined;
    }

    let disposed = false;
    const abortController = new AbortController();

    setLoading(true);
    setError(null);
    setConnected(false);
    setStats(createEmptyStats(marketSymbol));
    exchangeSymbolRef.current = null;
    bracketMaxLeverageRef.current = 0; // reset on symbol change

    const publishTicker = (tickerPayload: TickerLikePayload) => {
      const lastPrice = toFiniteNumber(tickerPayload.c ?? tickerPayload.lastPrice);
      const priceChangePercent = toFiniteNumber(
        tickerPayload.P ?? tickerPayload.priceChangePercent,
      );
      const quoteVolume = toFiniteNumber(tickerPayload.q ?? tickerPayload.quoteVolume);
      const eventTime = Math.trunc(
        toFiniteNumber(tickerPayload.E ?? tickerPayload.time),
      );

      setStats((previous) =>
        mergeStats(
          previous,
          {
            symbol: marketSymbol,
            lastPrice: lastPrice > 0 ? lastPrice : previous.lastPrice,
            priceChangePercent: Number.isFinite(priceChangePercent)
              ? priceChangePercent
              : previous.priceChangePercent,
            quoteVolume: quoteVolume > 0 ? quoteVolume : previous.quoteVolume,
            eventTime: eventTime > 0 ? eventTime : previous.eventTime,
          },
          exchangeSymbolRef.current,
          bracketMaxLeverageRef.current,
        ),
      );
    };

    const publishMarkPrice = (markPayload: MarkLikePayload) => {
      const markPrice = toFiniteNumber(markPayload.p ?? markPayload.markPrice);
      const indexPrice = toFiniteNumber(markPayload.i ?? markPayload.indexPrice);
      const fundingRate = toFiniteNumber(
        markPayload.r ?? markPayload.lastFundingRate,
      );
      const nextFundingTime = Math.trunc(
        toFiniteNumber(markPayload.T ?? markPayload.nextFundingTime),
      );
      const eventTime = Math.trunc(
        toFiniteNumber(markPayload.E ?? markPayload.time),
      );

      setStats((previous) =>
        mergeStats(
          previous,
          {
            symbol: marketSymbol,
            markPrice: markPrice > 0 ? markPrice : previous.markPrice,
            indexPrice: indexPrice > 0 ? indexPrice : previous.indexPrice,
            fundingRate: Number.isFinite(fundingRate)
              ? fundingRate
              : previous.fundingRate,
            nextFundingTime:
              nextFundingTime > 0 ? nextFundingTime : previous.nextFundingTime,
            eventTime: eventTime > 0 ? eventTime : previous.eventTime,
          },
          exchangeSymbolRef.current,
          bracketMaxLeverageRef.current,
        ),
      );
    };

    const fetchOpenInterest = async () => {
      try {
        const response = await fetch(
          `${REST_BASE_URL}/openInterest?symbol=${marketSymbol}`,
          { signal: abortController.signal },
        );

        if (!response.ok) {
          throw new Error(`Open interest request failed (${response.status})`);
        }

        const payload = (await response.json()) as RawOpenInterestPayload;
        const openInterest = toFiniteNumber(payload.openInterest);
        const eventTime = Math.trunc(toFiniteNumber(payload.time));

        if (disposed) return; // guard BEFORE any state mutation

        setStats((previous) =>
          mergeStats(
            previous,
            {
              symbol: marketSymbol,
              openInterest: openInterest > 0 ? openInterest : previous.openInterest,
              eventTime: eventTime > 0 ? eventTime : previous.eventTime,
            },
            exchangeSymbolRef.current,
            bracketMaxLeverageRef.current,
          ),
        );
      } catch (fetchError) {
        if (disposed || abortController.signal.aborted) return;
        // non-critical: don't surface OI errors to the user
      }
    };

    const fetchInitialData = async () => {
      try {
        // Fetch ALL symbol-specific data atomically so limits and price arrive together.
        // getLeverageBracket uses a server action with its own auth — no AbortSignal.
        const [tickerResponse, premiumResponse, exchangeResponse, leverageBrackets] =
          await Promise.all([
            fetch(`${REST_BASE_URL}/ticker/24hr?symbol=${marketSymbol}`, {
              signal: abortController.signal,
            }),
            fetch(`${REST_BASE_URL}/premiumIndex?symbol=${marketSymbol}`, {
              signal: abortController.signal,
            }),
            fetch(`${REST_BASE_URL}/exchangeInfo`, {
              signal: abortController.signal,
            }),
            // Leverage brackets: fetched once per symbol change and cached in ref
            getLeverageBracket(marketSymbol),
          ]);

        if (!tickerResponse.ok) {
          throw new Error(`Ticker request failed (${tickerResponse.status})`);
        }
        if (!premiumResponse.ok) {
          throw new Error(`Premium index request failed (${premiumResponse.status})`);
        }
        if (!exchangeResponse.ok) {
          throw new Error(`Exchange info request failed (${exchangeResponse.status})`);
        }

        // All responses resolved — check disposed BEFORE mutating any refs
        if (disposed) return;

        // Parse exchange info and set ref so all subsequent mergeStats calls use it
        const exchangePayload = (await exchangeResponse.json()) as RawExchangeInfoPayload;
        exchangeSymbolRef.current =
          exchangePayload.symbols?.find((item) => item.symbol === marketSymbol) ?? null;

        // Store bracket leverage — this is now the authoritative value for this symbol
        if (leverageBrackets.maxLeverage > 0) {
          bracketMaxLeverageRef.current = leverageBrackets.maxLeverage;
        }

        const tickerPayload = (await tickerResponse.json()) as RawTickerRestPayload;
        const premiumPayload = (await premiumResponse.json()) as RawPremiumIndexPayload;

        // Publish price + limits all at once
        publishTicker(tickerPayload);
        publishMarkPrice(premiumPayload);
        // Final merge to ensure minQty/maxQty/maxLeverage are set after exchangeSymbolRef is populated
        setStats((previous) =>
          mergeStats(previous, {}, exchangeSymbolRef.current, bracketMaxLeverageRef.current),
        );
      } catch (fetchError) {
        if (!disposed && !abortController.signal.aborted) {
          setError(toErrorMessage(fetchError, "Failed to fetch initial market stats"));
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    const connectWebSocket = () => {
      if (disposed) return;

      const wsSymbol = marketSymbol.toLowerCase();
      const streamName = `${wsSymbol}@ticker/${wsSymbol}@markPrice@1s`;
      const ws = new WebSocket(`${WS_BASE_URL}${streamName}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed) return;
        setConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        if (disposed) return;

        try {
          const rawMessage = JSON.parse(event.data) as {
            stream?: string;
            data?: unknown;
          };
          const payload = (rawMessage.data ?? rawMessage) as RawTickerPayload &
            RawMarkPricePayload;

          if (payload.e === "24hrTicker") {
            publishTicker(payload);
            setLoading(false);
            return;
          }

          if (payload.e === "markPriceUpdate") {
            publishMarkPrice(payload);
            setLoading(false);
          }
        } catch (parseError) {
          setError(
            toErrorMessage(parseError, "Failed to parse market stats payload"),
          );
        }
      };

      ws.onerror = () => {
        if (disposed) return;
        setError("WebSocket error occurred");
      };

      ws.onclose = () => {
        if (disposed) return;
        setConnected(false);
        clearReconnectTimer();
        reconnectTimeoutRef.current = setTimeout(
          connectWebSocket,
          RECONNECT_DELAY_MS,
        );
      };
    };

    fetchInitialData();
    fetchOpenInterest();
    connectWebSocket();

    openInterestIntervalRef.current = setInterval(
      fetchOpenInterest,
      openInterestPollMs,
    );

    return () => {
      disposed = true;
      abortController.abort();
      clearReconnectTimer();
      clearOpenInterestTimer();
      closeSocket();
    };
  }, [
    marketSymbol,
    openInterestPollMs,
    clearReconnectTimer,
    clearOpenInterestTimer,
    closeSocket,
  ]);

  return {
    loading,
    error,
    connected,
    marketSymbol,
    stats,
  };
};
