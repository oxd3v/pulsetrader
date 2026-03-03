"use server";
import { axiosRequest } from "./axios";
const UI_API_ENDPOINT = "https://api-ui.hyperliquid.xyz";

type HyperliquidCandle = {
  t?: number | string;
  T?: number | string;
  o?: number | string;
  h?: number | string;
  l?: number | string;
  c?: number | string;
  v?: number | string;
};

const normalizeCoin = (symbol: string): string => {
  const normalized = (symbol ?? "").trim().toUpperCase();
  if (!normalized) return "";
  return normalized.replace(/(USDT|USDC|BUSD)$/i, "") || normalized;
};

const parseOracleCandle = (rawCandle: HyperliquidCandle) => {
  return {
    time: Number(rawCandle.t),
    open: Number(rawCandle.o),
    high: Number(rawCandle.h),
    low: Number(rawCandle.l),
    close: Number(rawCandle.c),
    volume: Number(rawCandle.v),
    closeTime: Number(rawCandle.T),
  };
};

export const getHyperLiquidCandles = async ({
  symbol,
  from,
  to,
  resolution,
  limit,
}: {
  symbol: string;
  from: number;
  to: number;
  resolution: string;
  limit: number;
}) => {
  try {
    const coin = normalizeCoin(symbol);
    if (!coin) {
      return {
        candles: [],
        success: false,
        error: "Invalid symbol",
      };
    }

    const fromTimestampMili = Math.floor(from * 1000);
    const toTimestampMil = Math.floor(to * 1000);

    // Resolution mapping (frontend to API format)
    const resolutionMap: Record<string, string> = {
      '1': '1m',
      '3': '3m',
      '5': '5m',
      '15': '15m',
      '30': '30m',
      '60': '1h',
      '120': '2h',
      '240': '4h',
      '360': '6h',
      '480': '8h',
      '720': '12h',
      '1D': '1d',
      'D': '1d',
      '1d': '1d',
      '3D': '3d',
      '1W': '1w',
      'W': '1w',
      '1M': '1M',
      'M': '1M',
    };

    const interval = resolutionMap[resolution] || "1h";

    const data = await axiosRequest({
      url: `${UI_API_ENDPOINT}/info`,
      method: "POST",
      data: {
        req: {
          coin,
          endTime: toTimestampMil,
          interval,
          startTime: fromTimestampMili,
        },
        type: "candleSnapshot",
      },
    });

    const candles = Array.isArray(data)
      ? data
          .slice(0, Math.max(1, Math.min(limit, 1000)))
          .map((item) => parseOracleCandle(item as HyperliquidCandle))
          .filter((bar) => Number.isFinite(bar.time))
      : [];

    return {
      candles,
      success: true,
    };
  } catch (error) {
    return {
      candles: [],
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
