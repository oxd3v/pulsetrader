import { ORDER_TYPE } from "@/type/order";
import { GAS_BUFFER, GAS_LIMIT } from "@/constants/common/order";
import { BASIS_POINT_DIVISOR_BIGINT } from "@/constants/common/utils";
import { chains } from "@/constants/common/chain";
import { getSolanaPriorityFeeEstimate, getGasFee } from "@/lib/blockchain/gas";

export const calculateFundInUse = async ({orders, chainId, gasPrice, collateralTokenAddress}:{orders: ORDER_TYPE[], chainId:number, gasPrice:bigint, collateralTokenAddress?:string})=>{
    
  let onlyPendingOrders = orders.filter((o:ORDER_TYPE)=>{
    if(o.orderStatus == 'PENDING' && o.orderType == 'BUY' && o.chainId == chainId){
        if(collateralTokenAddress){
          if(o.orderAsset.collateralToken.address.toLowerCase() == collateralTokenAddress.toLowerCase()){
            return true
          }else{
            return false;
          }
        }
        return true;
    }
  });
  let totalCollateralPending = BigInt(0);
  let gasLimit:bigint = GAS_LIMIT['SPOT'][chainId];
  let buffer:bigint = BigInt(GAS_BUFFER[chainId]);
  let gasFee;
  if(chainId == chains.Solana){
    let priorityFee = await getSolanaPriorityFeeEstimate([]);
    gasFee = ((BigInt(5000) + priorityFee)*buffer)/BASIS_POINT_DIVISOR_BIGINT;
  }else{
    let gasPrice = await getGasFee(chainId);
    let gas:bigint = gasLimit*gasPrice;
    gasFee = (gas*buffer)/BASIS_POINT_DIVISOR_BIGINT;
  }
  let totalCollateralGas = gasFee * BigInt(onlyPendingOrders.length);
  onlyPendingOrders.forEach((o:ORDER_TYPE)=>{
    totalCollateralPending += BigInt(o.amount.orderSize);
  });
  return {
    gasFee: totalCollateralGas,
    pendingBalance: totalCollateralPending,
    orderCount: onlyPendingOrders.length,
    collateralAddress: collateralTokenAddress
  }
}

export const calculateOrderFundInUsd = async ({order, chainId, gasFee, collateralTokenAddress}:{order:ORDER_TYPE, chainId:number, gasFee:number, collateralTokenAddress?:string})=>{
    if(order.orderAsset.collateralToken.address.toLowerCase() == collateralTokenAddress?.toLowerCase()){
        return {
            
        }
    }
}

