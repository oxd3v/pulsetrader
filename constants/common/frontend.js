
export const PROTOCOL_NAME = "PULSETRADER"
export const PROTOCOL_MOTTO = ''



export const NAVBAR_ITEM_LIST = [
    {
      name: "Strategy",
      href: "/strategy",
      type: 'private'
    },
    {
      name: "Portfolio",
      href: "/portfolio",
      type: 'private'
    },
    {
      name: "Screener",
      href: "/screener",
      type: 'public'
    },
    {
      name: "Settings",
      href: "/settings",
      type: 'public'
    },
    {
      name: "Pricing",
      href: "/pricing",
      type: 'public'
    },
]

import {
  FiCrosshair,
  FiDivide,
  FiGrid,
  FiTrendingUp,
  FiRepeat,
  FiSettings
} from "react-icons/fi";



export const GmxStrategies  = [
  {
    id: "limit",
    name: "Limit Order",
    description: "Place a single limit order at a specific price",
    icon:<FiCrosshair className="w-5 h-5" />,
    features: [
      "Single entry point",
      "Good for precise entries", 
      "Simple execution",
    ],
    recommendedFor: "Traders who want to enter at specific price levels",
    type: "Premium"
  },
  {
    id: "grid",
    name: "Grid Trading", 
    description: "Create multiple orders in a grid pattern",
    icon: <FiGrid className="w-5 h-5" />,
    features: [
      "Multiple entry/exit points",
      "Profit from sideways markets",
      "Automated rebalancing",
    ],
    recommendedFor: "Traders in ranging or trending markets",
    type: "Premium"
  },
  {
    id: "multiScalp",
    name: "Multi Scalp",
    description: "Multiple concurrent scalping positions",
    icon: <FiRepeat className="w-5 h-5" />,
    features: [
      "Multiple positions",
      "Risk distribution",
      "Advanced automation",
    ],
    recommendedFor: "Experienced scalpers and day traders",
    type: "Premium"
  },
];

export const SpotStrategies = [
  {
    id: "limit",
    name: "Limit Order",
    description: "Place a single limit order at a specific price",
    icon: <FiCrosshair className="w-5 h-5" />,
    features: [
      "Single entry point",
      "Good for precise entries",
      "Simple execution",
    ],
    recommendedFor: "Traders who want to enter at specific price levels",
    type: "Basic"
  },
  {
    id: "dca",
    name: "DCA Trading",
    description: "Dollar Cost Average your entry across a price range",
    icon: <FiDivide className="w-5 h-5" />,
    features: [
      "Spread risk across prices",
      "Reduce impact of volatility",
      "Automated buying",
    ],
    recommendedFor: "Long-term investors and risk-averse traders",
    type: "Premium"
  },
  {
    id: "grid",
    name: "Grid Trading",
    description: "Create multiple orders in a grid pattern",
    icon: <FiGrid className="w-5 h-5" />,
    features: [
      "Multiple entry/exit points",
      "Profit from sideways markets",
      "Automated rebalancing",
    ],
    recommendedFor: "Traders in ranging or trending markets",
    type: "Premium"
  },
  {
    id: "scalp",
    name: "Scalp Trading",
    description: "Quick trades with small profit targets",
    icon: <FiTrendingUp className="w-5 h-5" />,
    features: ["Rapid execution", "Small profit targets", "High frequency"],
    recommendedFor: "Active traders seeking quick profits",
    type: "Basic"
  },
  {
    id: "multiScalp",
    name: "Multi Scalp",
    description: "Multiple concurrent scalping positions",
    icon: <FiRepeat className="w-5 h-5" />,
    features: [
      "Multiple positions",
      "Risk distribution",
      "Advanced automation",
    ],
    recommendedFor: "Experienced scalpers and day traders",
    type: "Premium"
  },
  {
    id: "sellToken",
    name: "Sell Token",
    description: "Sell a token at a specific price",
    icon: <FiTrendingUp className="w-5 h-5" />,
    features: ["Single exit point", "Good for precise exits", "Simple execution"],
    recommendedFor: "Traders who want to exit at specific price levels",
    type: "Advanced"
  },
  {
    id: "algo",
    name: "Advanced Algo Trading",
    description: "Technical Entry",
    icon: <FiSettings className="w-5 h-5" />,
    features: ["Advanced Indicator access", "Indicator based Strategy",],
    recommendedFor: "Traders who want to trade based on algorithmic indicators",
    type: "Advanced"
  }
];

export const TradeFormPriceUpperDropdown = [
  {
    lable: "Now",
    value: 10000,
  },
  {
    label: "+1%",
    value: 10100,
  },
  {
    label: "+3%",
    value: 10300,
  },
  {
    label: "+5%",
    value: 10500,
  },
  {
    label: "+10%",
    value: 11000,
  },
  {
    label: "+15%",
    value: 11500,
  },
  {
    label: "+20%",
    value: 12000,
  },
  {
    label: "+30%",
    value: 13000,
  },
  {
    label: "+45%",
    value: 14500,
  },
  {
    label: "+50%",
    value: 15000,
  },
  {
    label: "+75%",
    value: 17500,
  },
  {
    label: "+90%",
    value: 19000,
  },
];

export const TradeFormPriceLowerDropdown = [
  {
    label: "Now",
    value: 10000,
  },
  {
    label: "-1%",
    value: 9900,
  },
  {
    label: "-3%",
    value: 9700,
  },
  {
    label: "-5%",
    value: 9500,
  },
  {
    label: "-10%",
    value: 9000,
  },
  {
    label: "-15%",
    value: 8500,
  },
  {
    label: "-20%",
    value: 8000,
  },
  {
    label: "-30%",
    value: 7000,
  },
  {
    label: "-45%",
    value: 5500,
  },
  {
    label: "-50%",
    value: 5000,
  },
  {
    label: "-75%",
    value: 2500,
  },
  {
    label: "-90%",
    value: 1000,
  },
];


export const INDICATORS_KEY = [
  // Momentum - Typically "Buy" when oversold or crossing up
  { id: "RSI", name: "RSI", indicatorName: 'Relative Strength Index', type: "Momentum", defaultPeriod: 14, buyThreshold: 30 }, 
  { id: "WilliamsR", name: "WilliamsR", indicatorName: 'Williams %R', type: "Momentum", defaultPeriod: 14, buyThreshold: -80 },
  { id: "CCI", name: "CCI", indicatorName: 'Commodity Channel Index', type: "Momentum", defaultPeriod: 20, buyThreshold: -100 },
  { id: "MFI", name: "MFI", indicatorName: 'Money Flow Index', type: "Momentum", defaultPeriod: 14, buyThreshold: 20 },

  // Trend - Typically "Buy" on bullish crossovers
  { id: "MACD.Line", name: "MACD-Line", indicatorName: 'MACD', type: "Trend", buyThreshold: 0 },
  { id: "MACD.Signal", name: "MACD-Signal", indicatorName: 'MACD', type: "Trend", buyThreshold: 0 },
  { id: "MACD.Histogram", name: "MACD-Histogram", indicatorName: 'MACD', type: "Trend", buyThreshold: 0 },
  { id: "SMA", name: "SMA", indicatorName: 'Simple Moving Average', type: "Trend", defaultPeriod: 9, buyThreshold: null },
  { id: "EMA", name: "EMA", indicatorName: 'Exponential Moving Average', type: "Trend", defaultPeriod: 9, buyThreshold: null },

  // Volatility - Typically "Buy" when price touches/crosses the lower band
  { id: "BollingerBands.Upper", name: "BollingerBands-Upper", indicatorName: "Bollinger Bands", type: "Volatility", buyThreshold: null },
  { id: "BollingerBands.Middle", name: "BollingerBands-Middle", indicatorName: "Bollinger Bands", type: "Volatility", buyThreshold: null },
  { id: "BollingerBands.Lower", name: "BollingerBands-Lower", indicatorName: "Bollinger Bands", type: "Volatility", buyThreshold: null },

  // Volume & Market
  { id: "Volume.Signal", name: "Volume-Signal", indicatorName: "Volume", type: "Volume", buyThreshold: 0 },
  { id: "Price", name: "Price", indicatorName: "Current Price", type: "Price", buyThreshold: 0 },
  { id: "Liquidity", name: "Liquidity", indicatorName: "Market Liquidity", type: "Market", buyThreshold: 0 }, 
  { id: "Holders", name: "Holders", indicatorName: "Token Holders", type: "Market", buyThreshold: 0 } 
];

export const TECHNICAL_INDICATORS = [
 'RSI', "Stochastic.K", "OBV", "ATR", "BollingerBands%B", "BollingerBands.Lower", "BollingerBands.Upper", "BollingerBands.Middle", "EMA", "SMA", "ADX.Line", "ADX.PDI", "ADX.MDI", "ADX", "MACD.Line", "MACD.Histogram", "MACD.Signal", "MACD",
 "MFI", "CCI", "WilliamsR", "Stochastic.D", "Stochastic"
];


