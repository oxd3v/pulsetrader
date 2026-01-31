export type LogicalOperator = "AND" | "OR";

export type ComparisonOperator =
  | "EQUAL"
  | "NOT_EQUAL"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "LESS_THAN_OR_EQUAL";

export interface ConditionNode {
  operator: ComparisonOperator;
  id: string;
  type: string;
  resolution?: string;
  period?: number;
  threshold: number | string;
}

export interface GroupNode {
  operator: LogicalOperator;
  logics: TECHNICAL_LOGICS_TYPE[];
}

export type TECHNICAL_LOGICS_TYPE = GroupNode | ConditionNode;

// Type Guards
export function isConditionNode(logic: TECHNICAL_LOGICS_TYPE): logic is ConditionNode {
  return 'type' in logic && !('logics' in logic);
}

export function isGroupNode(logic: TECHNICAL_LOGICS_TYPE): logic is GroupNode {
  return 'logics' in logic && Array.isArray(logic.logics);
}

export type OrderTokenType = {
  decimals: number;
  address: string;
  symbol: string;
  name?: string;
  imageUrl?: string;
  isCollateral?: boolean;
};

export type OrderStrategyType = 
  | "limit"
  | "scalp"
  | "grid"
  | "dca"
  | "algo"
  | "sellToken"
  | string;

export type OrderCategoryType = "spot" | "perpetual" | "futures";
export type OrderStatusType = "PENDING" | "OPENED" | "CANCELLED" | "REVERTED" | "COMPLETED" | "PROCESSING";
export type OrderExecutionType = "BUY" | "SELL";

export type LimitType = {
  threshold: string;
  operators: ComparisonOperator | 'MARKET';
}

export type ORDER_TYPE = {
  _id?: string;
  user: any;
  wallet: any;
  chainId: number;
  name: string;
  strategy: OrderStrategyType;
  category: OrderCategoryType;
  orderType: OrderExecutionType;
  orderStatus: OrderStatusType;
  entry:{
    isTechnicalEntry: boolean;
    technicalLogic?: TECHNICAL_LOGICS_TYPE;
    priceLogic?: ConditionNode
  }
  orderAsset: {
    orderToken: OrderTokenType;
    collateralToken: OrderTokenType;
    outputToken: OrderTokenType;
    marketTokenAddress?: string;
    pairAddress?: string;
  };
  amount: {
    orderSize: string; 
    tokenAmount: string; 
    orderSizeUsd?: string;
  };
  sl: number;
  isTrailingMode: boolean;
  exit: {
   takeProfit: {
    profit: string;
    takeProfitPercentage: number;
    takeProfitPrice: string;
  };
  stopLoss: {
    isActive: boolean;
    save: string;
    stopLossPrice: string;
    stopLossPercentage: number;
  };
  isTechnicalExit: boolean;
  technicalLogic?: TECHNICAL_LOGICS_TYPE
  }
  isActive: boolean;
  isBusy: boolean;
  priority: number;
  slippage: number;
  executionSpeed: string;
  reEntrance?: {
    isReEntrance: boolean;
    reEntranceLimit: number;
  };
  executionFee: {
    payInUsd: string;
    nativeFeeAmount?: string;
    feeInUsd: string;
  };
  additional?: {
    realizedPnl?: string;
    walletAddress?: string;
    entryPrice?: string;
    exitPrice?: string;
  };
  createdAt: Date;
  updatedAt: Date;
};