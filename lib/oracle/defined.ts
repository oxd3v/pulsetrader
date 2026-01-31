"use server";

let DEFINED_URL = "https://www.defined.fi/api";
import { gotScraping } from "got-scraping";

const headers = {
  "Accept": "*/*",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "en-US,en;q=0.9",
  "Content-Type": "application/json",
  //"Cookie":"session=eyJhbGciOiJIUzI1NiJ9.eyJleHBpcmVzQXQiOjE3NjgzOTg3OTM2NDAsImlhdCI6MTc2Nzc5Mzk5MywiZXhwIjoxNzY4Mzk4NzkzfQ.exgtl0ircebQafNdt1_27UwJ_7rWZHqH95CFlXa9B3w; _vcrcs=1.1768190388.3600.MmYzOWFmYzI0YjlkMTY1NzViYzU0YWVlNDY1NjJiMWM=.555e977450e0e7939d33f6ffbcdfcbec",
  "Origin": "https://www.defined.fi",
  "Priority": "u=1, i",
  "Sec-Ch-Ua": '"Brave";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Gpc": "1",
  "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
};

// const headers = {
//   "accept": "*/*",
//   "accept-encoding": "gzip, deflate, br, zstd",
//   "accept-language": "en-US,en;q=0.9",
//   "content-type": "application/json",
//   //"cookie": "session=eyJhbGciOiJIUzI1NiJ9.eyJleHBpcmVzQXQiOjE3NjgzOTg3OTM2NDAsImlhdCI6MTc2Nzc5Mzk5MywiZXhwIjoxNzY4Mzk4NzkzfQ.exgtl0ircebQafNdt1_27UwJ_7rWZHqH95CFlXa9B3w; _vcrcs=1.1768190388.3600.MmYzOWFmYzI0YjlkMTY1NzViYzU0YWVlNDY1NjJiMWM=.555e977450e0e7939d33f6ffbcdfcbec",
//   "origin": "https://www.defined.fi",
//   "priority": "u=1, i",
//   "sec-ch-ua": '"Brave";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
//   "sec-ch-ua-mobile": "?0",
//   "sec-ch-ua-platform": '"Windows"',
//   "sec-fetch-dest": "empty",
//   "sec-fetch-mode": "cors",
//   "sec-fetch-site": "same-origin",
//   "sec-gpc": "1",
//   "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
//   "referer": "https://www.defined.fi/",
// };

const CANDLES_DEFINED_BAR_QUERY = `query GetBars(
  $symbol: String!
  $countback: Int
  $from: Int!
  $to: Int!
  $resolution: String!
  $currencyCode: String
  $quoteToken: QuoteToken
  $statsType: TokenPairStatisticsType
  $removeLeadingNullValues: Boolean
  $removeEmptyBars: Boolean
) {
  getBars(
    symbol: $symbol
    countback: $countback
    from: $from
    to: $to
    resolution: $resolution
    currencyCode: $currencyCode
    quoteToken: $quoteToken
    statsType: $statsType
    removeLeadingNullValues: $removeLeadingNullValues
    removeEmptyBars: $removeEmptyBars
  ) {
    s # Status/Success? (Likely string or bool)
    o # Open price
    h # High price
    l # Low price
    c # Close price
    t # Timestamp
    volume
    volumeNativeToken
    buys
    buyers
    buyVolume
    sells
    sellers
    sellVolume
    liquidity
    traders
    transactions
    __typename
  }
}`;

const DEFINED_FILTER_TOKENS_QUERY = `query FilterTokens(
  $filters: TokenFilters
  $statsType: TokenPairStatisticsType
  $excludeTokens: [String]
  $phrase: String
  $tokens: [String]
  $rankings: [TokenRanking]
  $limit: Int
  $offset: Int
) {
  filterTokens(
    filters: $filters
    statsType: $statsType
    excludeTokens: $excludeTokens
    phrase: $phrase
    tokens: $tokens
    rankings: $rankings
    limit: $limit
    offset: $offset
  ) {
    results {
      buyCount5m
      buyCount1
      buyCount12
      buyCount24
      buyCount4
      uniqueBuys5m
      uniqueBuys1
      uniqueBuys12
      uniqueBuys24
      uniqueBuys4
      change5m
      change1
      change12
      change24
      change4
      createdAt
      exchanges {
        ...ExchangeModel
        __typename
      }
      fdv
      high5m
      high1
      high12
      high24
      high4
      holders
      lastTransaction
      liquidity
      low5m
      low1
      low12
      low24
      low4
      marketCap
      pair {
        ...PairModel
        __typename
      }
      priceUSD
      quoteToken
      sellCount5m
      sellCount1
      sellCount12
      sellCount24
      sellCount4
      uniqueSells5m
      uniqueSells1
      uniqueSells12
      uniqueSells24
      uniqueSells4
      token {
        address
        decimals
        id
        name
        networkId
        symbol
        isScam
        socialLinks {
          discord
          telegram
          twitter
          website
          __typename
        }
        imageThumbUrl
        imageSmallUrl
        imageLargeUrl
        info {
          ...BaseTokenInfo
          __typename
        }
        __typename
      }
      txnCount5m
      txnCount1
      txnCount12
      txnCount24
      txnCount4
      uniqueTransactions5m
      uniqueTransactions1
      uniqueTransactions12
      uniqueTransactions24
      uniqueTransactions4
      volume5m
      volume1
      volume12
      volume24
      volume4
      swapPct7dOldWallet
      swapPct1dOldWallet
      walletAgeAvg
      walletAgeStd
      __typename
    }
    count
    page
    __typename
  }
}

fragment ExchangeModel on Exchange {
  address
  color
  exchangeVersion
  id
  name
  networkId
  tradeUrl
  iconUrl
  enabled
  __typename
}

fragment PairModel on Pair {
  address
  exchangeHash
  fee
  id
  networkId
  tickSpacing
  token0
  token1
  __typename
}

fragment BaseTokenInfo on TokenInfo {
  address
  circulatingSupply
  description
  id
  imageBannerUrl
  imageLargeUrl
  imageSmallUrl
  imageThumbUrl
  isScam
  name
  networkId
  symbol
  totalSupply
  __typename
}`;

const TOKEN_PRICE_QUERY = `query GetTokenPrice($inputs: [GetPriceInput]) {
  getTokenPrices(inputs: $inputs) {
    priceUsd
    address
    networkId
    poolAddress
    timestamp
    __typename
  }
}`;

export const getDefinedCandleData = async ({
  pairAddress,
  quoteToken,
  chainId,
  resolution = "1",
  createdAt = 1700000000,
  limit = 330,
}: {
  pairAddress: string;
  quoteToken: string;
  chainId: number;
  resolution: string;
  createdAt: number;
  limit: number;
}) => {
  let response: any;
  try {
    if (!pairAddress || !quoteToken || !chainId || !resolution) {
      throw new Error("Missing required parameters");
    }

    //const quoteToken = tokenAddress.toLowerCase() === tokenAddress.toLowerCase() ? "token0" : "token1";
    const to = Math.floor(Date.now() / 1000);
    let from = to - 28512000; // 330 days earlier
    from = Math.max(from, createdAt);
    let scrappedData: any = await gotScraping.post(DEFINED_URL, {
      headers,
      json: {
        query: CANDLES_DEFINED_BAR_QUERY,
        variables: {
          symbol: `${pairAddress}:${chainId}`,
          countback: limit,
          from,
          to,
          resolution,
          currencyCode: "USD",
          quoteToken,
          statsType: "FILTERED",
          removeLeadingNullValues: true,
          removeEmptyBars: true,
        },
      },
      retry: {
        limit: 2,
        methods: ["POST"],
        statusCodes: [429, 500, 502, 503, 504, 408],
        calculateDelay: ({ attemptCount }) => attemptCount * 2000,
      },
    });
    response = JSON.parse(scrappedData.body);

    if (!response?.data?.getBars) {
      throw new Error("Invalid response format from Defined candle bars API");
    }
  } catch (err: any) {
    throw new Error(
      `Defined token candle bars api failed: ${
        err.response.body || err.message || "UNKNOWN_ERROR"
      }`
    );
  }
  try {
    const bars = response?.data?.getBars;
    if (bars.t.length == 0 || !bars.t.length) {
      throw new Error(`NO_DATA`);
    }
    const sanitizeBars = bars.t.map((time: number, i: number) => ({
      time: time * 1000,
      high: bars.h[i],
      low: bars.l[i],
      close: bars.c[i],
      open: bars.o[i],
      volume: parseFloat(bars.volume[i] || 0),
      buyVolume: parseFloat(bars.buyVolume[i] || 0),
      sellVolume: parseFloat(bars.sellVolume[i] || 0),
      transactions: parseFloat(bars.transactions[i] || 0),
      traders: parseFloat(bars.traders[i] || 0),
    }));
    return {
      candles: sanitizeBars,
    };
  } catch (err: any) {
    throw new Error(`Failed to process Defined candle bars: ${err.message}`);
  }
};

export const getDefinedFilterTokens = async ({
  variables,
}: {
  variables: any;
}) => {
  if (!variables) {
    throw new Error(`Variables params are required`);
  }
  try {
    const scrappingData: any = await gotScraping.post(DEFINED_URL, {
      headers,
      headerGeneratorOptions: {
        browsers: [{ name: 'chrome' }],
        devices: ['desktop'],
        locales: ['en-US'],
      },
      useHeaderGenerator: false,
      json: {
        query: DEFINED_FILTER_TOKENS_QUERY,
        variables,
      },
      retry: {
        limit: 2,
        methods: ["POST"],
        statusCodes: [429, 500, 502, 503, 504, 408],
        calculateDelay: ({ attemptCount }) => attemptCount * 2000,
      },
    });
    const response: any = JSON.parse(scrappingData.body);

    if (!response?.data?.filterTokens?.results) {
      throw new Error(`Invalid response format`);
    }

    return response.data.filterTokens.results;
  } catch (err) {
    console.log(err);
  }
};

export const getDefinedTokenPrices = async ({
  tokens,
}: {
  tokens: any[];
}) => {
  if (!tokens?.length) {
    throw new Error("Token price requests are required");
  }
  let gotScrappedResponse = await gotScraping.post(DEFINED_URL, {
    headers,
    json: {
      operationName: "GetTokenPrice",
      query: TOKEN_PRICE_QUERY,
      variables: { inputs: tokens },
    },
    retry: {
      limit: 2,
      methods: ["POST"],
      statusCodes: [429, 500, 502, 503, 504, 408],
      calculateDelay: ({ attemptCount }) => attemptCount * 2000,
    },
  });
  let response = JSON.parse(gotScrappedResponse.body);
  if (!response?.data?.getTokenPrices.length) {
    throw new Error("Invalid response format");
  }
  return response?.data?.getTokenPrices || [];
};

export const getDefinedTokenPrice = async ({
  tokenAddress,
  chainId,
}: {
  tokenAddress: string;
  chainId: number;
}) => {
  if (!tokenAddress || !chainId) {
    throw new Error("Token and chainId  are required");
  }

  let gotScrappedResponse = await gotScraping.post(DEFINED_URL, {
    headers,
     headerGeneratorOptions: {
        browsers: [{ name: 'chrome', minVersion: 120 }],
        devices: ['desktop'],
        locales: ['en-US'],
      },
    json: {
      operationName: "GetTokenPrice",
      query: TOKEN_PRICE_QUERY,
      variables: {
        inputs: [
          {
            address: tokenAddress,
            networkId: chainId,
          },
        ],
      },
    },
    retry: {
      limit: 2,
      methods: ["POST"],
      statusCodes: [429, 500, 502, 503, 504, 408],
      calculateDelay: ({ attemptCount }) => attemptCount * 2000,
    },
  });
  let response = JSON.parse(gotScrappedResponse.body);
  if (!response?.data?.getTokenPrices.length) {
    throw new Error("Invalid response format");
  }
  return response?.data?.getTokenPrices[0].priceUsd || null;
};



