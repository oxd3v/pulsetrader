import { GMX_SUPPORTED_RESOLUTIONS } from "@/constants/common/chart";
import { getGmxCandles, normalizeGmxSymbol } from "@/lib/oracle/gmx";

type Resolution = string;

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface SymbolInfo {
  name: string;
}

interface PeriodParams {
  from: number;
  to: number;
  firstDataRequest: boolean;
}

type RealtimeBarCallback = (bar: Bar) => void;

const DEFAULT_HISTORY_LIMIT = 500;

const RESOLUTION_TO_INTERVAL_MS: Record<string, number> = {
  "1": 60_000,
  "5": 5 * 60_000,
  "15": 15 * 60_000,
  "60": 60 * 60_000,
  "240": 4 * 60 * 60_000,
  "1D": 24 * 60 * 60_000,
};

const RESOLUTION_TO_POLL_MS: Record<string, number> = {
  "1": 10_000,
  "5": 15_000,
  "15": 20_000,
  "60": 30_000,
  "240": 60_000,
  "1D": 120_000,
};

const lastBarsCache = new Map<string, Bar>();

const toFiniteNumber = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const buildCacheKey = (symbol: string, resolution: Resolution) => {
  return `${normalizeGmxSymbol(symbol)}_${resolution}`;
};

const getResolutionWindowMs = (resolution: Resolution) => {
  return RESOLUTION_TO_INTERVAL_MS[resolution] ?? 60 * 60_000;
};

const getPollMs = (resolution: Resolution) => {
  return RESOLUTION_TO_POLL_MS[resolution] ?? 20_000;
};

const getHistoryLimit = (resolution: Resolution, from: number, to: number) => {
  const resolutionWindowMs = getResolutionWindowMs(resolution);
  const fromMs = Math.trunc(toFiniteNumber(from) * 1000);
  const toMs = Math.trunc(toFiniteNumber(to) * 1000);

  if (resolutionWindowMs <= 0 || toMs <= fromMs) {
    return DEFAULT_HISTORY_LIMIT;
  }

  const estimatedBars = Math.ceil((toMs - fromMs) / resolutionWindowMs) + 8;
  return Math.max(10, Math.min(DEFAULT_HISTORY_LIMIT, estimatedBars));
};

class GmxPollingManager {
  private timers = new Map<string, ReturnType<typeof setInterval>>();

  subscribe(
    subscriberUID: string,
    resolution: Resolution,
    onPoll: () => Promise<void>,
  ) {
    this.unsubscribe(subscriberUID);

    void onPoll();

    const intervalId = setInterval(() => {
      void onPoll();
    }, getPollMs(resolution));

    this.timers.set(subscriberUID, intervalId);
  }

  unsubscribe(subscriberUID: string) {
    const timer = this.timers.get(subscriberUID);
    if (!timer) return;

    clearInterval(timer);
    this.timers.delete(subscriberUID);
  }
}

const pollingManager = new GmxPollingManager();

class GmxDataFeed {
  private symbol: string;

  constructor(symbol: string) {
    this.symbol = symbol;
  }

  onReady(callback: (config: Record<string, unknown>) => void) {
    const config = {
      supported_resolutions: GMX_SUPPORTED_RESOLUTIONS,
      supports_search: false,
      supports_group_request: false,
      supports_marks: false,
      supports_timescale_marks: false,
      supports_time: true,
      exchange: "GMX",
      timezone: "UTC",
      pricescale: 100000000,
    };

    setTimeout(() => callback(config), 0);
  }

  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: (result: unknown[]) => void,
  ) {
    void userInput;
    void exchange;
    void symbolType;
    onResultReadyCallback([]);
  }

  resolveSymbol(
    symbolName: string,
    onSymbolResolvedCallback: (symbolInfo: Record<string, unknown>) => void,
    onResolveErrorCallback: (error: string) => void,
    extension?: unknown,
  ) {
    void extension;

    try {
      const normalizedSymbol = normalizeGmxSymbol(symbolName || this.symbol);
      const symbolInfo = {
        name: normalizedSymbol,
        full_name: normalizedSymbol,
        ticker: normalizedSymbol,
        description: `${normalizedSymbol}/USD`,
        type: "crypto",
        session: "24x7",
        timezone: "UTC",
        minmov: 1,
        pricescale: 100000000,
        has_intraday: true,
        has_daily: true,
        has_weekly_and_monthly: true,
        data_status: "streaming",
        default_bar_type: "candle",
        visible_plots_set: "ohlc",
        has_seconds: false,
        intraday_multipliers: ["1", "5", "15", "60", "240"],
        supported_resolutions: GMX_SUPPORTED_RESOLUTIONS,
        volume_precision: 2,
      };

      setTimeout(() => onSymbolResolvedCallback(symbolInfo), 0);
    } catch {
      onResolveErrorCallback("Unable to resolve GMX symbol");
    }
  }

  async getBars(
    symbolInfo: SymbolInfo,
    resolution: Resolution,
    periodParams: PeriodParams,
    onHistoryCallback: (bars: Bar[], meta: { noData: boolean }) => void,
    onErrorCallback: (error: Error) => void,
  ) {
    const { from, to, firstDataRequest } = periodParams;

    try {
      const response = await getGmxCandles({
        symbol: symbolInfo.name || this.symbol,
        resolution,
        from,
        to,
        limit: getHistoryLimit(resolution, from, to),
      });

      const fromMs = Math.floor(from * 1000);
      const toMs = Math.floor(to * 1000);

      const bars = Array.isArray(response?.candles)
        ? response.candles
            .map((bar) => ({
              time: Math.trunc(toFiniteNumber(bar.time)),
              open: toFiniteNumber(bar.open),
              high: toFiniteNumber(bar.high),
              low: toFiniteNumber(bar.low),
              close: toFiniteNumber(bar.close),
              volume: toFiniteNumber(bar.volume),
            }))
            .filter((bar) => bar.time > 0 && bar.time >= fromMs && bar.time <= toMs)
        : [];

      bars.sort((first, second) => first.time - second.time);

      const cacheKey = buildCacheKey(symbolInfo.name || this.symbol, resolution);
      if (firstDataRequest && bars.length > 0) {
        lastBarsCache.set(cacheKey, bars[bars.length - 1]);
      }

      onHistoryCallback(bars, { noData: bars.length === 0 });
    } catch (error) {
      onErrorCallback(error as Error);
    }
  }

  subscribeBars(
    symbolInfo: SymbolInfo,
    resolution: Resolution,
    onRealtimeCallback: RealtimeBarCallback,
    subscriberUID: string,
    onResetCacheNeededCallback?: () => void,
  ) {
    void onResetCacheNeededCallback;

    const symbolName = normalizeGmxSymbol(symbolInfo.name || this.symbol);
    const cacheKey = buildCacheKey(symbolName, resolution);

    pollingManager.subscribe(subscriberUID, resolution, async () => {
      const response = await getGmxCandles({
        symbol: symbolName,
        resolution,
        limit: 2,
      });

      const bars = Array.isArray(response?.candles)
        ? response.candles
            .map((bar) => ({
              time: Math.trunc(toFiniteNumber(bar.time)),
              open: toFiniteNumber(bar.open),
              high: toFiniteNumber(bar.high),
              low: toFiniteNumber(bar.low),
              close: toFiniteNumber(bar.close),
              volume: toFiniteNumber(bar.volume),
            }))
            .filter((bar) => bar.time > 0)
            .sort((first, second) => first.time - second.time)
        : [];

      const incomingBar = bars[bars.length - 1];
      if (!incomingBar) return;

      const lastBar = lastBarsCache.get(cacheKey);

      if (!lastBar || incomingBar.time > lastBar.time) {
        lastBarsCache.set(cacheKey, incomingBar);
        onRealtimeCallback(incomingBar);
        return;
      }

      if (incomingBar.time === lastBar.time) {
        const mergedBar = {
          ...lastBar,
          close: incomingBar.close,
          high: Math.max(lastBar.high, incomingBar.high),
          low: Math.min(lastBar.low, incomingBar.low),
          volume: incomingBar.volume,
        };

        lastBarsCache.set(cacheKey, mergedBar);
        onRealtimeCallback(mergedBar);
      }
    });
  }

  unsubscribeBars(subscriberUID: string) {
    pollingManager.unsubscribe(subscriberUID);
  }

  getMarks(
    symbolInfo: SymbolInfo,
    from: number,
    to: number,
    onDataCallback: (data: unknown[]) => void,
    resolution: Resolution,
  ) {
    void symbolInfo;
    void from;
    void to;
    void resolution;
    onDataCallback([]);
  }

  getTimescaleMarks(
    symbolInfo: SymbolInfo,
    from: number,
    to: number,
    onDataCallback: (data: unknown[]) => void,
    resolution: Resolution,
  ) {
    void symbolInfo;
    void from;
    void to;
    void resolution;
    onDataCallback([]);
  }
}

export default GmxDataFeed;

