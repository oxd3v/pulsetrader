import { ORDER_TYPE } from "@/type/order";
import { ZeroAddress } from "ethers";
import { ORDER_TRADE_FEE } from "@/constants/common/order";
import { BASIS_POINT_DIVISOR_BIGINT } from "@/constants/common/utils";

export const getTradeFee = (user: any) => {
  if (user.status != "admin") {
    return ORDER_TRADE_FEE;
  } else {
    return BigInt(0);
  }
};
// Helper to calculate costs for a single order
export const getOrderCosts = ({
  order,
  collateralTokenAddress,
  gasFee,
  user,
}: {
  order: ORDER_TYPE;
  collateralTokenAddress: string;
  gasFee: bigint;
  user: any;
}) => {
  
  const isCollateralMatch =
    collateralTokenAddress.toLowerCase() ===
    order.orderAsset.collateralToken.address.toLowerCase();
  
  const isOrderTokenMatch =
    collateralTokenAddress.toLowerCase() ===
    order.orderAsset.orderToken.address.toLowerCase();
  const tradeFee = getTradeFee(user);

  let orderAmount = BigInt(0);
  let orderGasFee = BigInt(0);
  let onlyCollateral = BigInt(0);
  if (order.orderType === "BUY" && order.orderStatus == "PENDING") {
    orderGasFee += gasFee * BigInt(2);
    if (isCollateralMatch) {
      orderAmount += BigInt(order.amount.orderSize);
      onlyCollateral += BigInt(order.amount.orderSize);
    }
  }

  if(order.orderType === "SELL" &&  order.orderStatus == 'PENDING' || order.orderType === "SELL" &&  order.orderStatus == 'OPENED'){
    orderGasFee = gasFee;
    if(isOrderTokenMatch){
      orderAmount += BigInt(order.amount.tokenAmount);
    }
  }

  let tradeAmount = (onlyCollateral * tradeFee) / BASIS_POINT_DIVISOR_BIGINT;
  orderAmount += tradeAmount;
  return { orderAmount, orderGasFee };
};

// Memoized calculation of wallet locked funds (Existing Orders)
export const calculateExistingLockedFunds = (
  orders: ORDER_TYPE[],
  walletId: string,
  collateralTokenAddress: string,
  gasFee: bigint,
  user: any,
) => {
  let totalActiveOrders = 0;
  let lockedFundBalance = BigInt(0);
  let totalCollateralPending = BigInt(0);
  
  orders.forEach((order) => {
    console.log(order.wallet === walletId &&
      order.isActive == true &&
      order.isBusy == false)
    if (
      order.wallet === walletId &&
      order.isActive == true &&
      order.isBusy == false
    ) {
      const costs = getOrderCosts({
        order,
        collateralTokenAddress,
        gasFee,
        user,
      });

      if (collateralTokenAddress !== ZeroAddress) {
        lockedFundBalance += costs.orderGasFee;
        totalCollateralPending += costs.orderAmount;
      } else {
        lockedFundBalance += costs.orderGasFee + costs.orderAmount;
      }
      totalActiveOrders++;
    }
  });

  return { totalActiveOrders, lockedFundBalance, totalCollateralPending };
};
