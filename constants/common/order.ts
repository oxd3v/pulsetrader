export const MIN_ORDER_SIZE = 5;
export const MAX_GRID_NUMBER = 5;

import { chains } from "./chain";

export const GAS_LIMIT = {
  ["PERPETUAL"]: {
    ["GMX"]: {
      increaseOrderGasLimit: BigInt(6000000),
      decreaseOrderGasLimit: BigInt(7000000),
    },
  },  
  ["SPOT"]: {
    [chains.Avalanche]: BigInt(5000000),
  },
};

export const GAS_BUFFER = {
  [chains.Avalanche]: 50000,
  [chains.Ethereum]: 20000,
  [chains.Solana]: 100000,
  [chains.Arbitrum]: 40000,
};

export const  DEFAULT_GAS_PRICE = {
  [chains.Avalanche]: BigInt(2000000000),
  [chains.Ethereum]: BigInt(1000000000),
  [chains.Solana]: BigInt(10000000),
  [chains.Arbitrum]: BigInt(90000000),
}

export const DEFAULT_SOLANA_PRIORITY_FEE = BigInt(30_000);
export const SOLANA_BASE_FEE = BigInt(5000);