'use server'

/**
 * Aster DEX API Integration - Server-side API calls
 * 
 * API Documentation: https://asterdex.github.io/aster-api-website/futures-v3/market-data/
 * WebSocket Documentation: https://asterdex.github.io/aster-api-website/futures-v3/websocket-market-streams/
 */

const ASTER_API = 'https://fapi.asterdex.com';
const ASTER_WS = 'wss://fstream.asterdex.com/ws';

/**
 * Parse raw candlestick data from API
 */
function parseOracleCandle(rawCandle: any) {
  const [
    time,
    open,
    high,
    low,
    close,
    volume,
    closeTime,
    quoteAssetVolume,
    numberOfTrades,
    takerBuyBaseAssetVolume,
    takerBuyQuoteAssetVolume,
  ] = rawCandle;

  return {
    time: Number(time),
    open: parseFloat(open),
    high: parseFloat(high),
    low: parseFloat(low),
    close: parseFloat(close),
    volume: parseFloat(volume),
    closeTime: Number(closeTime),
    quoteAssetVolume: parseFloat(quoteAssetVolume),
    numberOfTrades,
    takerBuyBaseAssetVolume: parseFloat(takerBuyBaseAssetVolume),
    takerBuyQuoteAssetVolume: parseFloat(takerBuyQuoteAssetVolume),
  };
}

/**
 * Get candlestick (Kline) data
 * 
 * @param symbol - Trading pair (e.g., "BTCUSDT")
 * @param resolution - Time interval (1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M)
 * @param from - Start time (Unix timestamp in seconds)
 * @param to - End time (Unix timestamp in seconds)
 * @param limit - Number of candles (max 1000)
 * 
 * @returns Array of candlesticks with OHLCV data
 * 
 * API Reference: https://asterdex.github.io/aster-api-website/futures-v3/market-data/#klinecandlestick-data
 */
export const getAsterKLines = async ({
  symbol,
  resolution,
  from,
  to,
  limit,
}: {
  symbol: string;
  resolution: string;
  from: number;
  to: number;
  limit: number;
}) => {
  try {
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

    const interval = resolutionMap[resolution] || '1h';

    const url = `${ASTER_API}/fapi/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${fromTimestampMili}&endTime=${toTimestampMil}&limit=${limit}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    

    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    const candleData = await res.json();
    const candles = candleData?.map(parseOracleCandle);

    return { candles, success: true };
  } catch (error) {
    //console.error('Error fetching klines:', error);
    return {
      candles: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get recent trades
 * 
 * @param symbol - Trading pair (e.g., "BTCUSDT")
 * @param limit - Number of trades (default 500, max 1000)
 * 
 * @returns Array of recent trades
 * 
 * API Reference: https://asterdex.github.io/aster-api-website/futures-v3/market-data/#recent-trades-list
 */
export const getAsterTrade = async ({
  symbol,
  limit = 100,
}: {
  symbol: string;
  limit?: number;
}) => {
  try {
    const url = `${ASTER_API}/fapi/v3/trades?symbol=${symbol}&limit=${Math.min(limit, 1000)}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    const trades = await res.json();

    return {
      trades: trades || [],
      success: true,
    };
  } catch (error) {
    console.error('Error fetching trades:', error);
    return {
      trades: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get order book (Market Depth)
 * 
 * @param symbol - Trading pair (e.g., "BTCUSDT")
 * @param limit - Order book depth (5, 10, 20, 50, 100, 500, 1000)
 * 
 * @returns Order book with bids and asks
 * 
 * API Reference: https://asterdex.github.io/aster-api-website/futures-v3/market-data/#order-book
 */
export const getAsterOrderBook = async ({
  symbol,
  limit = 20,
}: {
  symbol: string;
  limit?: number;
}) => {
  try {
    // Validate limit is in allowed values
    const validLimits = [5, 10, 20, 50, 100, 500, 1000];
    const validLimit = validLimits.includes(limit) ? limit : 20;

    const url = `${ASTER_API}/fapi/v3/depth?symbol=${symbol}&limit=${validLimit}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    const depth = await res.json();

    return {
      depth,
      success: true,
    };
  } catch (error) {
    console.error('Error fetching order book:', error);
    return {
      depth: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get 24hr ticker data
 * 
 * @param symbol - Trading pair (optional, returns all if not provided)
 * 
 * @returns 24hr price change statistics
 * 
 * API Reference: https://asterdex.github.io/aster-api-website/futures-v3/market-data/#24hr-ticker-price-change-statistics
 */
export const getAster24hrTicker = async ({
  symbol,
}: {
  symbol?: string;
}) => {
  try {
    const url = symbol
      ? `${ASTER_API}/fapi/v3/ticker/24hr?symbol=${symbol}`
      : `${ASTER_API}/fapi/v3/ticker/24hr`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    const ticker = await res.json();

    return {
      ticker,
      success: true,
    };
  } catch (error) {
    console.error('Error fetching 24hr ticker:', error);
    return {
      ticker: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get current price for symbol
 * 
 * @param symbol - Trading pair (e.g., "BTCUSDT")
 * 
 * @returns Current price and timestamp
 * 
 * API Reference: https://asterdex.github.io/aster-api-website/futures-v3/market-data/#symbol-price-ticker
 */
export const getAsterPrice = async ({ symbol }: { symbol: string }) => {
  try {
    const url = `${ASTER_API}/fapi/v3/ticker/price?symbol=${symbol}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    const price = await res.json();

    return {
      price: parseFloat(price.price),
      symbol: price.symbol,
      time: price.time,
      success: true,
    };
  } catch (error) {
    console.error('Error fetching price:', error);
    return {
      price: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * WebSocket Stream URLs for real-time data
 * 
 * Usage in client component:
 * const ws = new WebSocket('wss://fstream.asterdex.com/ws/btcusdt@depth@100ms');
 * 
 * Streams available:
 * - {symbol}@depth@100ms - Order book updates
 * - {symbol}@trade - Recent trade updates
 * - {symbol}@kline_{interval} - Candlestick updates
 * 
 * Reference: https://asterdex.github.io/aster-api-website/futures-v3/websocket-market-streams/
 */
const ASTER_WEBSOCKET_STREAMS = {
  orderBook: (symbol: string, speed: string = '100ms') =>
    `${ASTER_WS}/${symbol.toLowerCase()}@depth@${speed}`,
  trades: (symbol: string) =>
    `${ASTER_WS}/${symbol.toLowerCase()}@trade`,
  klines: (symbol: string, interval: string) =>
    `${ASTER_WS}/${symbol.toLowerCase()}@kline_${interval}`,
};

/**
 * Exchange info
 * 
 * @returns All trading pairs and exchange information
 * 
 * API Reference: https://asterdex.github.io/aster-api-website/futures-v3/market-data/#exchange-information
 */
export const getAsterExchangeInfo = async () => {
  try {
    const url = `${ASTER_API}/fapi/v3/exchangeInfo`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    const info = await res.json();

    return {
      symbols: info.symbols || [],
      timezone: info.timezone,
      serverTime: info.serverTime,
      success: true,
    };
  } catch (error) {
    console.error('Error fetching exchange info:', error);
    return {
      symbols: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};