'use server'

/**
 * Aster DEX API Integration - Server-side API calls
 * 
 * API Documentation: https://asterdex.github.io/aster-api-website/futures-v3/market-data/
 * WebSocket Documentation: https://asterdex.github.io/aster-api-website/futures-v3/websocket-market-streams/
 */
import { ethers, Wallet } from "ethers";



// EIP-712 Domain configuration
// IMPORTANT: Verify the exact values for your target network in the AsterDEX API docs.
const ASTER_EIP712_DOMAIN_MESSAGE = {
  name: "AsterSignTransaction",
  version: "1",
  chainId: 1666, //⚙️ mainnet
  //chainId: 714, // testnet
  verifyingContract: "0x0000000000000000000000000000000000000000",
}
const ASTER_API = 'https://fapi.asterdex.com';
const ASTER_WS = 'wss://fstream.asterdex.com/ws';
const userAddress = "0xc990DA43A0A5011eeED840f57Cb4dADf3d344183";
const signerAddress = "0x81404f61A6D1913266e3bdFab72F816ba738e0ED";
const signerPrivateKey = process.env.ASTER_DEFAULT_AGENT_SIGNER_PRIVATE_KEY;

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






/// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ NEW: Time Synchronization / 时间同步
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Global time offset state / 全局时间偏移状态
let _timeOffset = 0;  // milliseconds / 毫秒
let _lastSyncTime = 0;  // timestamp of last sync / 上次同步的时间戳
const TIME_SYNC_INTERVAL = 3600000;  // 1 hour / 1小时
let _timeSyncInProgress = false;  // prevent concurrent syncs / 防止并发同步

/**
 * Fetch server time from AsterDex API
 * 从 AsterDex API 获取服务器时间
 * 
 * @returns {Promise<number>} Time offset in milliseconds / 时间偏移（毫秒）
 */
export async function fetchServerTime() {
  try {
    const response = await fetch(`${ASTER_API}/fapi/v1/time`, {
      method: 'GET',
      //timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch server time: ${response.status}`);
    }

    const data = await response.json();
    const serverTime = data.serverTime;  // milliseconds
    const localTime = Date.now();

    // Calculate offset: serverTime - localTime
    _timeOffset = serverTime - localTime;
    _lastSyncTime = Date.now();


    //console.log(`✅ Time sync successful. Offset: ${_timeOffset}ms (${(_timeOffset / 1000).toFixed(2)}s)`);
    return _timeOffset;
  } catch (error) {
    //console.error(`❌ Failed to sync server time: ${error.message}`);
    // Don't throw - continue with current offset or 0
    return _timeOffset;
  }
}



/**
 * Initialize time sync on startup (prevents duplicate syncs)
 * 在启动时初始化时间同步（防止重复同步）
 * 
 * @returns {Promise<void>}
 */
export async function initializeTimeSync() {
  // Skip if sync already in progress
  if (_timeSyncInProgress) {
    //console.log('⏳ Time sync already in progress...');
    return;
  }

  // Skip if recently synced
  if (_lastSyncTime > 0 && (Date.now() - _lastSyncTime) < 60000) {
    // console.log('⏭️ Time sync skipped (recent sync detected)');
    return;
  }

  try {
    _timeSyncInProgress = true;
    //console.log('🔄 Initializing time synchronization...');
    await fetchServerTime();
    // console.log('✅ Time synchronization initialized');
  } catch (error) {
    //console.warn(`⚠️ Time sync initialization failed: ${error.message}`);
    //console.warn('⚠️ Using local time. Ensure your system clock is correct.');
  } finally {
    _timeSyncInProgress = false;
  }
}



// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Nonce state / Nonce 状态
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let _lastMs = 0;
let _counter = 0;

/**
 * Generate nonce using synchronized server time
 * 使用同步的服务器时间生成 nonce
 * 
 * Format: timestamp_seconds * 1,000,000 + counter
 * 格式：时间戳秒数 * 1,000,000 + 计数器
 */
export async function getNonce() {
  // Auto-sync on first use if never synced
  if (_lastSyncTime === 0) {
    await fetchServerTime();
  }

  function getSyncedTime() {
    // Warn if sync is stale (more than 1 hour)
    const now = Date.now();
    if (_lastSyncTime > 0 && (now - _lastSyncTime) > TIME_SYNC_INTERVAL) {
      //console.warn('⏰ Time sync is stale (>1 hour old). Consider calling fetchServerTime() again.');
    }

    // Return local time + offset
    return Date.now() + _timeOffset;
  }

  const nowSeconds = Math.floor(getSyncedTime() / 1000);

  if (nowSeconds === _lastMs) {
    _counter += 1;
  } else {
    _lastMs = nowSeconds;
    _counter = 0;
  }

  return nowSeconds * 1000000 + _counter;
}


/**
 * Sign with EIP-712 for main=False operations (Message.msg) /
 * 为 main=False 操作进行 EIP-712 签名（Message.msg）
 *
 * @param {string} privateKey - Signer private key / Signer 私钥
 * @param {string} message - Message string (querystring) / 消息字符串（查询字符串）
 * @returns {string} Signature / 签名
 */
export async function signEIP712Message(wallet: any, message: string) {
  const typedData = {
    "types": {
      "EIP712Domain": [
        { "name": "name", "type": "string" },
        { "name": "version", "type": "string" },
        { "name": "chainId", "type": "uint256" },
        { "name": "verifyingContract", "type": "address" }
      ],
      "Message": [
        { "name": "msg", "type": "string" }
      ]
    },
    "primaryType": "Message",
    "domain": ASTER_EIP712_DOMAIN_MESSAGE,
    "message": {
      "msg": message
    }
  }

  const signature = await wallet.signTypedData(
    typedData.domain,
    { Message: typedData.types.Message },
    typedData.message,
  );

  return signature;
}



export async function signedAgentRequest({ userAddress, signerAddress, signerPrivateKey, method, endpoint, params }: {
  userAddress: string,
  signerAddress: string,
  signerPrivateKey: string,
  method: string,
  endpoint: string,
  params: any
}) {

  const allParams = {
    ...params,
    nonce: await getNonce(),
    user: userAddress,
    signer: signerAddress,
  };
  const wallet = new Wallet(signerPrivateKey);
  // Fix: use allParams for both filter and map so nonce/user/signer are included in the signature
  const signatureQueryString = Object.keys(allParams)
    .filter((key) => allParams[key] !== undefined && allParams[key] !== null)
    .map((key) => `${key}=${String(allParams[key])}`)
    .join("&");
  const signature = await signEIP712Message(wallet, signatureQueryString);
  const queryString = `${signatureQueryString}&signature=${signature}`;

  if (method === "GET" || method === "DELETE") {
    const url = `${ASTER_API}${endpoint}?${queryString}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`AsterDEX API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  }

  const response = await fetch(`${ASTER_API}${endpoint}`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: queryString,
  });
  if (!response.ok) {
    throw new Error(`AsterDEX API error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data;
}

/**
 * Fetch leverage brackets for a symbol.
 * Response shape: [{ symbol, brackets: [{ bracket, initialLeverage, notionalCap, ... }] }]
 * The first bracket (lowest notional) always carries the max leverage for the symbol.
 */
export const getLeverageBracket = async (symbol: string | null) => {
  const params = symbol ? { symbol } : {};
  if (!signerPrivateKey) {
    return {
      success: false as const,
      brackets: [] as any[],
      maxLeverage: 0,
      error: 'No signer private key',
    };
  }
  try {
    const result = await signedAgentRequest({
      userAddress,
      signerAddress,
      signerPrivateKey,
      method: 'GET',
      endpoint: '/fapi/v3/leverageBracket',
      params,
    });

    // result is an array of { symbol, brackets: [{ bracket, initialLeverage, ... }] }
    const arr = Array.isArray(result) ? result : [];
    const symbolData = symbol
      ? (arr.find((r: any) => r.symbol === symbol) ?? arr[0])
      : arr[0];
    // bracket 1 = tier with highest leverage (max leverage available)
    const maxLeverage: number = symbolData?.brackets?.[0]?.initialLeverage ?? 0;

    return {
      success: true as const,
      brackets: arr,
      maxLeverage,
    };
  } catch (err) {
    return {
      success: false as const,
      brackets: [] as any[],
      maxLeverage: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
};
