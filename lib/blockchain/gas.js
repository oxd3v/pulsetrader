'use server';

import {
  chains,
  chainConfig,
  getConnectionProvider,
} from '@/constants/common/chain';
import { getExecutionFee } from "@gmx-io/sdk/utils/fees";
import {
  GAS_BUFFER,
  GAS_LIMIT,
  DEFAULT_GAS_PRICE,
  DEFAULT_SOLANA_PRIORITY_FEE,
  DEFAULT_SOLANA_COMPUTE_UNITS,
  SOLANA_BASE_FEE,
} from '@/constants/common/order';
import { BASIS_POINT_DIVISOR_BIGINT } from '@/constants/common/utils';

export async function getSolanaPriorityFeeEstimate(accounts = []) {
  let priorityFee;
  try {
    const response = await fetch(chainConfig[chains.Solana].rpcUrls[0], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getRecentPrioritizationFees',
        params: accounts.length ? [accounts] : [],
      }),
    });

    const { result: fees } = await response.json();
    if (!fees?.length) return DEFAULT_SOLANA_PRIORITY_FEE;

    fees.sort((a, b) => a.prioritizationFee - b.prioritizationFee);

    priorityFee = BigInt(
      fees[Math.min(fees.length - 1, Math.floor(fees.length * 0.9))]
        .prioritizationFee || DEFAULT_SOLANA_PRIORITY_FEE,
    );
  } catch (err) {
    priorityFee = DEFAULT_SOLANA_PRIORITY_FEE;
  }
  if (priorityFee == BigInt(0)) {
    priorityFee = DEFAULT_SOLANA_PRIORITY_FEE;
  }
  return priorityFee;
}

export async function getEVMSpotGasFee(chainId) {
  let gasPrice;
  try {
    let provider = getConnectionProvider(chainId);
    let gasObject = await provider.getFeeData();
    gasPrice = gasObject.gasPrice;
  } catch (err) {
    gasPrice = DEFAULT_GAS_PRICE[chainId];
  }

  return gasPrice;
}

export const getGasFee = async (chainId) => {
  let gasFee =
    chainId == chains.Solana
      ? await getSolanaPriorityFeeEstimate([])
      : await getEVMSpotGasFee(chainId);
  return gasFee;
};

export const spotNetworkFee = async (chainId) => {
  let networkFee = BigInt(0);
  if (chainId == chains.Solana) {
    let priorityFee =
      (await getSolanaPriorityFeeEstimate([])) || DEFAULT_SOLANA_PRIORITY_FEE;
    const expFee =
      SOLANA_BASE_FEE +
      (GAS_LIMIT['SPOT'][chains.Solana] * priorityFee) / BigInt(1_000_000);
    networkFee = expFee;
  } else {
    let gasFee = await getEVMSpotGasFee(chainId);
    let gasLimit = GAS_LIMIT['SPOT'][chainId];
    let fee = gasFee * gasLimit;
    networkFee = fee;
  }

  networkFee =
    (networkFee * BigInt(GAS_BUFFER[chainId])) / BASIS_POINT_DIVISOR_BIGINT;
  return networkFee;
};

/**
 * Calculate network fee for GMX perpetual orders
 * @param {number} chainId - Chain ID (GMX supported chains: Arbitrum, Avalanche)
 * @returns {Promise<bigint>} GMX execution fee with buffer applied
 */
export const gmxNetworkFee = async (chainId) => {
  let networkFee = BigInt(0);

  try {
    // Get current gas price
    let gasPrice = await getEVMSpotGasFee(chainId);

    // Get GMX execution fee using SDK
    // The SDK returns the execution fee which includes keeper costs
    let executionFeeEstimate = await getExecutionFee(
      chainId,
      chainConfig[chainId]?.rpcUrls?.[0] || '',
      GAS_LIMIT['PERPETUAL']?.['GMX']?.increaseOrderGasLimit || BigInt(600_000),
    );

    if (executionFeeEstimate) {
      networkFee = BigInt(executionFeeEstimate);
    } else {
      // Fallback: Calculate manually if SDK returns empty
      const gasLimit = GAS_LIMIT['PERPETUAL']?.['GMX']?.increaseOrderGasLimit || BigInt(600_000);
      networkFee = gasPrice * gasLimit;
    }

    // Apply gas buffer (safety margin)
    const buffer = BigInt(GAS_BUFFER[chainId]) || BigInt(11000); // 10% default
    networkFee = (networkFee * buffer) / BASIS_POINT_DIVISOR_BIGINT;
  } catch (err) {
    console.error(`Error calculating GMX network fee for chain ${chainId}:`, err);
    // Fallback: return estimated fee
    try {
      const gasPrice = await getEVMSpotGasFee(chainId);
      const gasLimit = GAS_LIMIT['PERPETUAL']?.['GMX']?.increaseOrderGasLimit || BigInt(600_000);
      networkFee = gasPrice * gasLimit;
      const buffer = BigInt(GAS_BUFFER[chainId]) || BigInt(11000);
      networkFee = (networkFee * buffer) / BASIS_POINT_DIVISOR_BIGINT;
    } catch (fallbackErr) {
      console.error(`Fallback also failed for GMX fee calculation:`, fallbackErr);
      networkFee = BigInt(0);
    }
  }

  return networkFee;
};

/**
 * Calculate network fee for Asterdex perpetual orders
 * @param {number} chainId - Chain ID (Asterdex supported chains)
 * @returns {Promise<bigint>} Asterdex execution fee with buffer applied
 */
export const asterdexNetworkFee = async (chainId) => {
  let networkFee = BigInt(0);

  try {
    // Asterdex is EVM-based, get current gas price
    let gasPrice = await getEVMSpotGasFee(chainId);

    // Get Asterdex gas limit for increase order operation
    // Asterdex typically requires less gas than GMX due to simpler contract logic
    const gasLimit = GAS_LIMIT['PERPETUAL']?.['ASTERDEX']?.increaseOrderGasLimit || BigInt(500_000);

    // Calculate fee: gasPrice * gasLimit
    networkFee = gasPrice * gasLimit;

    // Apply gas buffer (safety margin)
    const buffer = BigInt(GAS_BUFFER[chainId]) || BigInt(11000); // 10% default
    networkFee = (networkFee * buffer) / BASIS_POINT_DIVISOR_BIGINT;
  } catch (err) {
    console.error(`Error calculating Asterdex network fee for chain ${chainId}:`, err);
    networkFee = BigInt(0);
  }

  return networkFee;
};

/**
 * Get network fee for any order type and protocol
 * Supports spot orders on all chains and perpetual orders on GMX/Asterdex
 * 
 * @param {number} chainId - Chain ID (see chains constant)
 * @param {string} protocol - Protocol name: 'gmx', 'asterdex', or 'spot'
 * @param {string} category - Order category: 'spot' or 'perpetual'
 * @returns {Promise<bigint>} Network fee in wei (for EVM) or lamports (for Solana)
 * 
 * @example
 * // Spot order on Arbitrum
 * const spotFee = await getNetworkfee(42161, 'spot', 'spot');
 * 
 * @example
 * // GMX perpetual on Arbitrum
 * const gmxPerpFee = await getNetworkfee(42161, 'gmx', 'perpetual');
 * 
 * @example
 * // Asterdex perpetual
 * const asterdexPerpFee = await getNetworkfee(42161, 'asterdex', 'perpetual');
 * 
 * @example
 * // Spot on Solana
 * const solanaSpotFee = await getNetworkfee(chains.Solana, 'spot', 'spot');
 */
export const getNetworkfee = async (chainId, protocol, category) => {
  let networkFee = BigInt(0);

  try {
    if (category === 'spot') {
      // Spot trading network fee calculation (works on all chains)
      networkFee = await spotNetworkFee(chainId);
    } else if (category === 'perpetual') {
      // Perpetual trading network fee calculation
      if (protocol === 'gmx') {
        networkFee = await gmxNetworkFee(chainId);
      } else if (protocol === 'asterdex') {
        networkFee = await asterdexNetworkFee(chainId);
      } else {
        console.warn(`Unknown protocol: ${protocol}`);
        networkFee = BigInt(0);
      }
    } else {
      console.warn(`Unknown category: ${category}`);
      networkFee = BigInt(0);
    }
  } catch (err) {
    console.error(
      `Error calculating network fee for chain ${chainId}, protocol ${protocol}, category ${category}:`,
      err
    );
    networkFee = BigInt(0);
  }

  return networkFee;
};

/**
 * Get formatted network fee estimate for UI display
 * Converts BigInt to decimal number based on token decimals
 * 
 * @param {number} chainId - Chain ID
 * @param {string} protocol - Protocol name
 * @param {string} category - Order category
 * @param {number} decimals - Token decimals for conversion (default: 18 for most EVM tokens)
 * @returns {Promise<number>} Network fee as decimal number (e.g., 0.005 ETH)
 * 
 * @example
 * const feeEstimate = await getNetworkfeeEstimate(42161, 'gmx', 'perpetual', 18);
 * console.log(`Fee: ${feeEstimate} ETH`); // Fee: 0.003 ETH
 */
export const getNetworkfeeEstimate = async (chainId, protocol, category, decimals = 18) => {
  try {
    const fee = await getNetworkfee(chainId, protocol, category);
    return Number(fee) / Math.pow(10, decimals);
  } catch (err) {
    console.error('Error getting network fee estimate:', err);
    return 0;
  }
};

/**
 * Compare network fees across all protocols for same order type
 * Useful for showing users which protocol is cheapest
 * 
 * @param {number} chainId - Chain ID
 * @param {string} category - Order category ('spot' or 'perpetual')
 * @param {number} decimals - Token decimals for display
 * @returns {Promise<Object>} Object with fees for each protocol
 * 
 * @example
 * const fees = await compareNetworkFees(42161, 'perpetual', 18);
 * console.log('GMX:', fees.gmx, 'ETH');
 * console.log('Asterdex:', fees.asterdex, 'ETH');
 * console.log('Cheapest:', fees.gmx < fees.asterdex ? 'GMX' : 'Asterdex');
 */
export const compareNetworkFees = async (chainId, category, decimals = 18) => {
  const fees = {};

  try {
    if (category === 'spot') {
      // Only one spot fee regardless of protocol
      const spotFeeRaw = await spotNetworkFee(chainId);
      fees.spot = Number(spotFeeRaw) / Math.pow(10, decimals);
    } else if (category === 'perpetual') {
      // Compare all perpetual protocols
      const gmxFeeRaw = await gmxNetworkFee(chainId);
      const asterdexFeeRaw = await asterdexNetworkFee(chainId);

      fees.gmx = Number(gmxFeeRaw) / Math.pow(10, decimals);
      fees.asterdex = Number(asterdexFeeRaw) / Math.pow(10, decimals);

      // Add cheapest indicator
      fees.cheapest = fees.gmx < fees.asterdex ? 'gmx' : 'asterdex';
      fees.difference = Math.abs(fees.gmx - fees.asterdex);
    }
  } catch (err) {
    console.error(`Error comparing network fees for chain ${chainId}:`, err);
  }

  return fees;
};

/**
 * Get detailed fee breakdown with all components
 * Shows gas price, gas limit, and final fee with buffer
 * 
 * @param {number} chainId - Chain ID
 * @param {string} protocol - Protocol name
 * @param {string} category - Order category
 * @param {number} decimals - Token decimals
 * @returns {Promise<Object>} Detailed fee breakdown
 * 
 * @example
 * const breakdown = await getDetailedFeeBreakdown(42161, 'gmx', 'perpetual', 18);
 * console.log('Gas Price:', breakdown.gasPrice, 'gwei');
 * console.log('Gas Limit:', breakdown.gasLimit);
 * console.log('Total Fee:', breakdown.totalFee, 'ETH');
 * console.log('With Buffer:', breakdown.withBuffer, 'ETH');
 */
export const getDetailedFeeBreakdown = async (chainId, protocol, category, decimals = 18) => {
  const breakdown = {
    chainId,
    protocol,
    category,
    timestamp: new Date().toISOString(),
  };

  try {
    if (chainId === chains.Solana) {
      // Solana fee breakdown
      const priorityFee = await getSolanaPriorityFeeEstimate([]);
      const gasLimit = GAS_LIMIT['SPOT']?.[chains.Solana] || DEFAULT_SOLANA_COMPUTE_UNITS;

      breakdown.priorityFee = Number(priorityFee);
      breakdown.gasLimit = Number(gasLimit);
      breakdown.baseFee = Number(SOLANA_BASE_FEE);
      breakdown.totalFee =
        Number(
          SOLANA_BASE_FEE + (gasLimit * priorityFee) / BigInt(1_000_000)
        ) / Math.pow(10, 9); // Solana uses 9 decimals

      const buffer = GAS_BUFFER[chainId] || BigInt(11000);
      breakdown.bufferPercentage = Number(buffer) / 100;
      breakdown.withBuffer = (breakdown.totalFee * Number(buffer)) / 10000;
    } else {
      // EVM fee breakdown
      const gasPrice = await getEVMSpotGasFee(chainId);
      const gasPriceGwei = Number(gasPrice) / Math.pow(10, 9);

      let gasLimit = BigInt(0);
      if (category === 'spot') {
        gasLimit = GAS_LIMIT['SPOT']?.[chainId] || BigInt(100_000);
      } else if (protocol === 'gmx') {
        gasLimit = GAS_LIMIT['PERPETUAL']?.['GMX']?.increaseOrderGasLimit || BigInt(600_000);
      } else if (protocol === 'asterdex') {
        gasLimit = GAS_LIMIT['PERPETUAL']?.['ASTERDEX']?.increaseOrderGasLimit || BigInt(500_000);
      }

      const totalFeeRaw = gasPrice * gasLimit;
      const totalFee = Number(totalFeeRaw) / Math.pow(10, decimals);

      const buffer = BigInt(GAS_BUFFER[chainId]) || BigInt(11000);
      const withBufferRaw = (totalFeeRaw * buffer) / BASIS_POINT_DIVISOR_BIGINT;
      const withBuffer = Number(withBufferRaw) / Math.pow(10, decimals);

      breakdown.gasPrice = gasPriceGwei;
      breakdown.gasPriceUnit = 'gwei';
      breakdown.gasLimit = Number(gasLimit);
      breakdown.baseFee = totalFee;
      breakdown.bufferPercentage = (Number(buffer) - 10000) / 100; // Show as percentage
      breakdown.totalFee = totalFee;
      breakdown.withBuffer = withBuffer;
      breakdown.unit = decimals === 18 ? 'ETH' : 'native';
    }

    return breakdown;
  } catch (err) {
    console.error(`Error getting detailed fee breakdown:`, err);
    breakdown.error = err.message;
    return breakdown;
  }
};