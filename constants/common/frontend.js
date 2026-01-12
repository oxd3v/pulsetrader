
export const PROTOCOL_NAME = "PulseTrader"
export const PROTOCOL_MOTTO = ''


export const homeRouteNavbarRouteList = [
    {
      name: "Feature",
      href: "/feature"
    },
    {
      name: "Pricing",
      href: "/pricing"
    },
]

export const otherRouteNavbarRouteList = [
    {
      name: "Strategy",
      href: "/strategy"
    },
    {
      name: "Portfolio",
      href: "/portfolio"
    },
    {
      name: "Tokens",
      href: "/tokens"
    },
    {
      name: "Settings",
      href: "/settings"
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
  // Momentum
  { id: "RSI", name: "RSI", type: "Momentum", defaultPeriod: 14 },
  { id: "Stochastic.K", name: "Stochastic-K", type: "Momentum" },
  { id: "Stochastic.D", name: "Stochastic-D", type: "Momentum" },
  { id: "Stochastic", name: "Stochastic", type: "Momentum" },
  { id: "WilliamsR", name: "WilliamsR", type: "Momentum" },
  { id: "CCI", name: "CCI", type: "Momentum" },
  { id: "MFI", name: "MFI", type: "Momentum" },

  // Trend
  { id: "MACD.Line", name: "MACD-Line", type: "Trend" },
  { id: "MACD.Signal", name: "MACD-Signal", type: "Trend" },
  { id: "MACD.Histogram", name: "MACD-Histogram", type: "Trend" },
  { id: "MACD", name: "MACD", type: "Trend" },
  { id: "ADX.Line", name: "ADX-Line", type: "Trend" },
  { id: "ADX.PDI", name: "ADX-PDI", type: "Trend" },
  { id: "ADX.MDI", name: "ADX-MDI", type: "Trend" },
  { id: "ADX", name: "ADX", type: "Trend" },
  { id: "SMA", name: "SMA", type: "Trend" },
  { id: "EMA", name: "EMA", type: "Trend" },

  // Volatility
  { id: "BollingerBands.Upper", name: "BollingerBands-Upper", type: "Volatility" },
  { id: "BollingerBands.Middle", name: "BollingerBands-Middle", type: "Volatility" },
  { id: "BollingerBands.Lower", name: "BollingerBands-Lower", type: "Volatility" },
  { id: "BollingerBands", name: "BollingerBands", type: "Volatility" },
  { id: "ATR", name: "ATR", type: "Volatility" },

  // Volume
  { id: "OBV", name: "OBV", type: "Volume" },
  { id: "Volume.Signal", name: "Volume-Signal", type: "Volume" },

  // Price & Market Metrics
  { id: "Price", name: "Price", type: "Price" },
  { id: "Price.Change", name: "Price-Change", type: "Price" },
  { id: "Price.High", name: "Price-High", type: "Price" },
  { id: "Price.Low", name: "Price-Low", type: "Price" },
  { id: "MarketCap", name: "MarketCap", type: "Market" },
  { id: "Liquidity", name: "Liquidity", type: "Market" },
  { id: "Volume", name: "Volume", type: "Market" },
  { id: "BuyCount", name: "BuyCount", type: "Market" },
  { id: "SellCount", name: "SellCount", type: "Market" },
  { id: "Holders", name: "Holders", type: "Market" }
];

export const TECHNICAL_INDICATORS = [
 'RSI', "Stochastic.K", "OBV", "ATR", "BollingerBands%B", "BollingerBands.Lower", "BollingerBands.Upper", "BollingerBands.Middle", "EMA", "SMA", "ADX.Line", "ADX.PDI", "ADX.MDI", "ADX", "MACD.Line", "MACD.Histogram", "MACD.Signal", "MACD",
 "MFI", "CCI", "WilliamsR", "Stochastic.D", "Stochastic"
];


