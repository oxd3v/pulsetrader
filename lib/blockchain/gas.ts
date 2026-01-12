import {
  chains,
  chainConfig,
  getConnectionProvider,
} from "@/constants/common/chain";
import {
  GAS_BUFFER,
  GAS_LIMIT,
  DEFAULT_GAS_PRICE,
  SOLANA_BASE_FEE,
} from "@/constants/common/order";

export async function getSolanaPriorityFeeEstimate(accounts = []) {
  let defaultGasFee = DEFAULT_GAS_PRICE[chains.Solana];
  let priorityFee: bigint;
  try {
    const response = await fetch(chainConfig[chains.Solana].rpcUrls[0], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getRecentPrioritizationFees",
        params: accounts.length ? [accounts] : [],
      }),
    });

    const { result: fees } = await response.json();
    if (!fees?.length) return defaultGasFee;

    fees.sort((a: any, b: any) => a.prioritizationFee - b.prioritizationFee);

    priorityFee = BigInt(
      fees[Math.min(fees.length - 1, Math.floor(fees.length * 0.9))]
        .prioritizationFee || defaultGasFee
    );
  } catch (err) {
    priorityFee = defaultGasFee;
  }
  let totalFee = SOLANA_BASE_FEE + priorityFee;
  let gasBuffer =
    (totalFee * BigInt(GAS_BUFFER[chains.Solana] || 15000)) / BigInt(10000);
  return gasBuffer;
}

export async function getEVMSpotGasFee(chainId: number) {
  let gasPrice;
  try {
    let provider: any = getConnectionProvider(chainId);
    let gasObject = await provider.getFeeData();
    gasPrice = gasObject.maxFeePerGas || gasObject.gasPrice;
  } catch (err) {
    gasPrice = DEFAULT_GAS_PRICE[chainId];
  }

  let gasFee = gasPrice * BigInt(GAS_LIMIT["SPOT"][chainId] || 0);
  let gasBuffer =
    (gasFee * BigInt(GAS_BUFFER[chainId] || 15000)) / BigInt(10000);
  return gasBuffer;
}

export const getGasFee = async (chainId:number)=>{
  let gasFee = chainId == chains.Solana ? await getSolanaPriorityFeeEstimate([]) : await getEVMSpotGasFee(chainId);
  return gasFee;
}
