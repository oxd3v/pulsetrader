import { MIN_ORDER_SIZE } from "@/constants/common/order";

const GMX_API_BASE_URL = "https://arbitrum-api.gmxinfra.io";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ORACLE_PRICE_DECIMALS = 30;
const USD_DECIMALS = 30;
const GMX_MAX_LEVERAGE = 100;

const RESOLUTION_TO_GMX_PERIOD: Record<string, string> = {
  "1": "1m",
  "5": "5m",
  "15": "15m",
  "60": "1h",
  "240": "4h",
  "1D": "1d",
  D: "1d",
};

const STABLE_SYMBOLS = new Set(["USDC", "USDC.E", "USDT", "DAI", "USDE"]);

export type GmxToken = {
  symbol: string;
  address: string;
  decimals: number;
  synthetic?: boolean;
};

export type GmxTicker = {
  tokenAddress: string;
  tokenSymbol: string;
  minPrice: string;
  maxPrice: string;
  updatedAt?: number;
  timestamp?: number;
};

export type GmxMarketInfo = {
  name: string;
  marketToken: string;
  indexToken: string;
  longToken: string;
  shortToken: string;
  isListed: boolean;
  listingDate?: string;
  openInterestLong?: string;
  openInterestShort?: string;
  availableLiquidityLong?: string;
  availableLiquidityShort?: string;
  poolAmountLong?: string;
  poolAmountShort?: string;
  fundingRateLong?: string;
  fundingRateShort?: string;
  borrowingRateLong?: string;
  borrowingRateShort?: string;
  netRateLong?: string;
  netRateShort?: string;
};

export type GmxCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type GmxResolvedMarket = {
  symbol: string;
  marketName: string;
  pairLabel: string;
  marketTokenAddress: string;
  indexTokenAddress: string;
  longTokenAddress: string;
  shortTokenAddress: string;
  indexTokenDecimals: number;
  longTokenSymbol: string;
  shortTokenSymbol: string;
  isListed: boolean;
  listingDate?: string;
  listingTimestamp: number;
  oracleMinPrice: number;
  oracleMaxPrice: number;
  markPrice: number;
  spreadBps: number;
  openInterestLongUsd: number;
  openInterestShortUsd: number;
  openInterestUsd: number;
  availableLiquidityLongUsd: number;
  availableLiquidityShortUsd: number;
  availableLiquidityUsd: number;
};

type GmxMarketSnapshotResult =
  | {
      success: true;
      markets: GmxResolvedMarket[];
      preferredMarkets: GmxResolvedMarket[];
    }
  | {
      success: false;
      markets: GmxResolvedMarket[];
      preferredMarkets: GmxResolvedMarket[];
      error: string;
    };

const toFiniteNumber = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const normalizeAddress = (value: string | undefined | null): string => {
  return (value ?? "").trim().toLowerCase();
};

const getScaledNumber = (value: string | number | undefined, decimals: number) => {
  const numericValue = toFiniteNumber(value);
  const safeDecimals = Math.max(0, decimals);
  return numericValue / 10 ** safeDecimals;
};

const getOraclePrice = (value: string | number | undefined, tokenDecimals: number) => {
  return getScaledNumber(value, ORACLE_PRICE_DECIMALS - tokenDecimals);
};

const getUsdValue = (value: string | number | undefined) => {
  return getScaledNumber(value, USD_DECIMALS);
};

const getStableTokenPreference = (symbol: string) => {
  return STABLE_SYMBOLS.has((symbol ?? "").trim().toUpperCase()) ? 1 : 0;
};

const getListingTimestamp = (value: string | undefined) => {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const getGmxTradingLimits = ({
  availableLiquidityUsd,
}: {
  availableLiquidityUsd: number;
}) => {
  const minPositionSizeUsd = Math.max(MIN_ORDER_SIZE, 0);
  const maxPositionSizeUsd = Math.max(0, availableLiquidityUsd);

  return {
    maxLeverage: GMX_MAX_LEVERAGE,
    minPositionSizeUsd,
    maxPositionSizeUsd,
    minMarginUsd: minPositionSizeUsd / GMX_MAX_LEVERAGE,
    maxMarginUsd: maxPositionSizeUsd,
  };
};

const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${GMX_API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`GMX request failed (${response.status})`);
  }

  return (await response.json()) as T;
};

export const normalizeGmxSymbol = (symbol: string) => {
  const normalized = (symbol ?? "").trim().toUpperCase();
  if (!normalized) return "";

  return normalized
    .replace(/\/USD$/i, "")
    .replace(/[-_\s]USD$/i, "")
    .replace(/(USDT|USDC|BUSD)$/i, "")
    .trim();
};

const isPreferredMarket = (
  candidate: GmxResolvedMarket,
  current: GmxResolvedMarket,
) => {
  if (candidate.isListed !== current.isListed) {
    return candidate.isListed;
  }

  const candidateStableShort = getStableTokenPreference(candidate.shortTokenSymbol);
  const currentStableShort = getStableTokenPreference(current.shortTokenSymbol);
  if (candidateStableShort !== currentStableShort) {
    return candidateStableShort > currentStableShort;
  }

  if (Math.abs(candidate.openInterestUsd - current.openInterestUsd) > 1) {
    return candidate.openInterestUsd > current.openInterestUsd;
  }

  if (Math.abs(candidate.availableLiquidityUsd - current.availableLiquidityUsd) > 1) {
    return candidate.availableLiquidityUsd > current.availableLiquidityUsd;
  }

  return candidate.listingTimestamp > current.listingTimestamp;
};

export const getGmxTokens = async () => {
  const payload = await fetchJson<{ tokens?: GmxToken[] }>("/tokens");
  return payload.tokens ?? [];
};

export const getGmxTickers = async () => {
  return await fetchJson<GmxTicker[]>("/prices/tickers");
};

export const getGmxMarketsInfo = async () => {
  const payload = await fetchJson<{ markets?: GmxMarketInfo[] }>("/markets/info");
  return payload.markets ?? [];
};

export const buildGmxMarketRows = ({
  tokens,
  tickers,
  markets,
}: {
  tokens: GmxToken[];
  tickers: GmxTicker[];
  markets: GmxMarketInfo[];
}) => {
  const tokenByAddress = new Map(
    tokens.map((token) => [normalizeAddress(token.address), token]),
  );
  const tickerByAddress = new Map(
    tickers.map((ticker) => [normalizeAddress(ticker.tokenAddress), ticker]),
  );

  return markets
    .filter((market) => normalizeAddress(market.indexToken) !== ZERO_ADDRESS)
    .map<GmxResolvedMarket | null>((market) => {
      const indexToken = tokenByAddress.get(normalizeAddress(market.indexToken));
      if (!indexToken) return null;

      const longToken = tokenByAddress.get(normalizeAddress(market.longToken));
      const shortToken = tokenByAddress.get(normalizeAddress(market.shortToken));
      const ticker = tickerByAddress.get(normalizeAddress(market.indexToken));

      const oracleMinPrice = ticker
        ? getOraclePrice(ticker.minPrice, indexToken.decimals)
        : 0;
      const oracleMaxPrice = ticker
        ? getOraclePrice(ticker.maxPrice, indexToken.decimals)
        : 0;
      const markPrice =
        oracleMinPrice > 0 && oracleMaxPrice > 0
          ? (oracleMinPrice + oracleMaxPrice) / 2
          : Math.max(oracleMinPrice, oracleMaxPrice);
      const spreadBps =
        markPrice > 0
          ? ((Math.max(oracleMaxPrice - oracleMinPrice, 0) / markPrice) * 10000)
          : 0;
    

      const openInterestLongUsd = getUsdValue(market.openInterestLong);
      const openInterestShortUsd = getUsdValue(market.openInterestShort);
      const availableLiquidityLongUsd = getUsdValue(market.availableLiquidityLong);
      const availableLiquidityShortUsd = getUsdValue(market.availableLiquidityShort);
      const availableLiquidityUsd =
        availableLiquidityLongUsd + availableLiquidityShortUsd;
      const tradingLimits = getGmxTradingLimits({
        availableLiquidityUsd,
      });

      return {
        symbol: normalizeGmxSymbol(indexToken.symbol),
        marketName: market.name,
        pairLabel: `${longToken?.symbol ?? "LONG"}-${shortToken?.symbol ?? "SHORT"}`,
        marketTokenAddress: market.marketToken,
        indexTokenAddress: market.indexToken,
        longTokenAddress: market.longToken,
        shortTokenAddress: market.shortToken,
        indexTokenDecimals: indexToken.decimals,
        longTokenSymbol: longToken?.symbol ?? "LONG",
        shortTokenSymbol: shortToken?.symbol ?? "SHORT",
        isListed: Boolean(market.isListed),
        listingDate: market.listingDate,
        listingTimestamp: getListingTimestamp(market.listingDate),
        oracleMinPrice,
        oracleMaxPrice,
        markPrice,
        spreadBps,
        openInterestLongUsd,
        openInterestShortUsd,
        openInterestUsd: openInterestLongUsd + openInterestShortUsd,
        availableLiquidityLongUsd,
        availableLiquidityShortUsd,
        availableLiquidityUsd,
        
      };
    })
    .filter((market): market is GmxResolvedMarket => Boolean(market));
};

export const selectPreferredGmxMarkets = (markets: GmxResolvedMarket[]) => {
  const bestMarkets = new Map<string, GmxResolvedMarket>();

  for (const market of markets) {
    const symbolKey = normalizeGmxSymbol(market.symbol);
    const current = bestMarkets.get(symbolKey);
    if (!current || isPreferredMarket(market, current)) {
      bestMarkets.set(symbolKey, market);
    }
  }

  return [...bestMarkets.values()].sort((first, second) => {
    return second.openInterestUsd - first.openInterestUsd;
  });
};

export const findGmxMarket = (
  markets: GmxResolvedMarket[],
  symbol: string,
) => {
  const normalizedSymbol = normalizeGmxSymbol(symbol);
  const normalizedAddress = normalizeAddress(symbol);

  return (
    markets.find((market) => normalizeGmxSymbol(market.symbol) === normalizedSymbol) ??
    markets.find((market) => normalizeAddress(market.marketTokenAddress) === normalizedAddress) ??
    null
  );
};

export const getGmxMarketSnapshot = async (): Promise<GmxMarketSnapshotResult> => {
  try {
    const [tokens, tickers, markets] = await Promise.all([
      getGmxTokens(),
      getGmxTickers(),
      getGmxMarketsInfo(),
    ]);


    const resolvedMarkets = buildGmxMarketRows({
      tokens,
      tickers,
      markets,
    });

    return {
      success: true,
      markets: resolvedMarkets,
      preferredMarkets: selectPreferredGmxMarkets(resolvedMarkets),
    };
  } catch (error) {
    return {
      success: false,
      markets: [] as GmxResolvedMarket[],
      preferredMarkets: [] as GmxResolvedMarket[],
      error: error instanceof Error ? error.message : "Unknown GMX error",
    };
  }
};

export const getGmxCandles = async ({
  symbol,
  resolution,
  from,
  to,
  limit = 300,
}: {
  symbol: string;
  resolution: string;
  from?: number;
  to?: number;
  limit?: number;
}) => {
  try {
    const normalizedSymbol = normalizeGmxSymbol(symbol);
    if (!normalizedSymbol) {
      return {
        candles: [] as GmxCandle[],
        success: false,
        error: "Invalid symbol",
      };
    }

    const period = RESOLUTION_TO_GMX_PERIOD[resolution] ?? "1h";
    const query = new URLSearchParams({
      tokenSymbol: normalizedSymbol,
      period,
      limit: String(Math.max(10, Math.min(limit, 500))),
    });

    const payload = await fetchJson<{
      candles?: Array<[number, number, number, number, number, number?]>;
    }>(`/prices/candles?${query.toString()}`);

    const fromSeconds = Math.trunc(toFiniteNumber(from));
    const toSeconds = Math.trunc(toFiniteNumber(to));

    const candles = Array.isArray(payload.candles)
      ? payload.candles
          .map((rawCandle) => {
            const [time, open, high, low, close, volume] = rawCandle;
            return {
              time: Math.trunc(toFiniteNumber(time) * 1000),
              open: toFiniteNumber(open),
              high: toFiniteNumber(high),
              low: toFiniteNumber(low),
              close: toFiniteNumber(close),
              volume: toFiniteNumber(volume),
            };
          })
          .filter((candle) => {
            const candleSeconds = Math.trunc(candle.time / 1000);
            if (fromSeconds > 0 && candleSeconds < fromSeconds) return false;
            if (toSeconds > 0 && candleSeconds > toSeconds) return false;
            return candle.time > 0;
          })
          .sort((first, second) => first.time - second.time)
      : [];

    return {
      candles,
      success: true,
    };
  } catch (error) {
    return {
      candles: [] as GmxCandle[],
      success: false,
      error: error instanceof Error ? error.message : "Unknown GMX error",
    };
  }
};
