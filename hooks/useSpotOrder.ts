import { ORDER_TYPE } from "@/type/order";
import { WalletConfig } from "@/type/common";
import {
  BASIS_POINT_DIVISOR_BIGINT,
  PRECISION_DECIMALS,
} from "@/constants/common/utils";
import { safeParseUnits } from "@/utility/handy";
import { chains } from "@/constants/common/chain";
import { userDeafultTokens } from "@/constants/common/tokens";
import { USER_LEVEL } from "@/constants/common/user";
import OrderService from "@/service/order-service";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";

import {
  handleServerErrorToast,
  notify,
  notifyWithResponseError,
} from "@/lib/utils";

interface AddOrderProps {
  estOrders: ORDER_TYPE[];
  areWalletsReady: boolean;
  name: string;
  gridsByWallet: Record<number, WalletConfig>;
  chainId: number;
  strategy: string;
  indexToken: string;
  category: string;
  isLong?: boolean;
  protocol?: string;
  user: any;
}

export const useSpotOrder = () => {
  const { setUserOrders } = useStore(
    useShallow((state: any) => ({
      setUserOrders: state.setUserOrders,
    })),
  );
  const configureOrder = (config: any): ORDER_TYPE[] => {
    const {
      gridNumber,
      targetPrice,
      activeStopLoss,
      entryLogic,
      exitLogic,
      orderSizeMultiplier,
      initialOrderSize,
      gridMultiplier,
      gridDistance,
      collateralToken,
      outputToken,
      orderToken,
      priority,
      executionSpeed,
      orderName,
      strategy,
      chainId,
      isTrailingMode,
      tpPrice,
      slPrice,
      isTechnicalExit,
      tpPercentage,
      slPercentage,
      isReEntrance,
      reEntrancePercentage,
      slippage,
    } = config;

    const estOrders: ORDER_TYPE[] = [];

    if (
      gridNumber > 1 &&
      strategy == "sellToken" &&
      tpPrice &&
      Number(tpPrice) > 0
    ) {
      const parsedEntryPrice = safeParseUnits(tpPrice, PRECISION_DECIMALS);
      let lastPriceDistanceRate = 0;
      const CollateralParseOrderSize = safeParseUnits(
        initialOrderSize,
        orderToken.decimals,
      );
      for (let i = 0; i < gridNumber; i++) {
        const sizeMultiplier = Math.pow(orderSizeMultiplier, i);
        const rawSize = CollateralParseOrderSize * BigInt(sizeMultiplier);
        let targetedPrice = BigInt(0);
        if (i === 0) {
          targetedPrice = parsedEntryPrice;
        } else {
          const distMultiplier = Math.pow(gridMultiplier, i - 1);
          const currentStepDistance = gridDistance * distMultiplier;
          lastPriceDistanceRate += currentStepDistance;
          const bpsChange = BigInt(Math.floor(lastPriceDistanceRate * 100));
          targetedPrice =
            parsedEntryPrice +
            (parsedEntryPrice * bpsChange) / BASIS_POINT_DIVISOR_BIGINT;
        }
        estOrders.push({
          user: {},
          wallet: {},
          chainId,
          name: orderName,
          strategy,
          category: "spot",
          orderType: "SELL",
          orderStatus: "PENDING",
          entry: {
            isTechnicalEntry: false,
          },
          orderAsset: {
            orderToken: orderToken,
            collateralToken: collateralToken,
            outputToken: outputToken,
            pairAddress: orderToken.pairAddress,
          },
          amount: {
            orderSize: "0",
            tokenAmount: rawSize.toString(),
          },
          slippage,
          sl: slPercentage,
          isTrailingMode,
          exit: {
            takeProfit: {
              profit: "0",
              takeProfitPercentage: tpPercentage,
              takeProfitPrice: "0",
            },
            stopLoss: {
              isActive: false,
              save: "0",
              stopLossPercentage: slPercentage,
              stopLossPrice: slPrice,
            },
            isTechnicalExit: false,
          },
          isActive: true,
          isBusy: false,
          priority: Number(priority),
          executionSpeed,
          reEntrance: {
            isReEntrance,
            reEntranceLimit: Math.floor(reEntrancePercentage * 100),
          },
          executionFee: {
            payInUsd: "0",
            feeInUsd: "0",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } else if (
      gridNumber > 1 &&
      ["grid", "multiScalp", "dca"].includes(strategy) &&
      targetPrice &&
      Number(targetPrice) > 0
    ) {
      const parsedEntryPrice = safeParseUnits(targetPrice, PRECISION_DECIMALS);
      let lastPriceDistanceRate = 0;
      const CollateralParseOrderSize = safeParseUnits(
        initialOrderSize,
        collateralToken.decimals,
      );
      const slBps = BigInt(Math.floor(slPercentage * 100));
      const tpBps = BigInt(Math.floor(tpPercentage * 100));
      for (let i = 0; i < gridNumber; i++) {
        const sizeMultiplier = Math.pow(orderSizeMultiplier, i);
        const rawSize = CollateralParseOrderSize * BigInt(sizeMultiplier);
        let targetedPrice = BigInt(0);
        if (i === 0) {
          targetedPrice = parsedEntryPrice;
        } else {
          const distMultiplier = Math.pow(gridMultiplier, i - 1);
          const currentStepDistance = gridDistance * distMultiplier;
          lastPriceDistanceRate += currentStepDistance;
          const bpsChange = BigInt(Math.floor(lastPriceDistanceRate * 100));
          targetedPrice =
            parsedEntryPrice -
            (parsedEntryPrice * bpsChange) / BASIS_POINT_DIVISOR_BIGINT;
        }
        estOrders.push({
          user: {},
          wallet: {},
          chainId,
          name: orderName,
          strategy,
          category: "spot",
          orderType: "SELL",
          orderStatus: "PENDING",
          entry: {
            isTechnicalEntry: false,
            priceLogic: {
              type: "Price",
              id: "price",
              operator: "LESS_THAN",
              threshold: targetedPrice.toString(),
            },
          },
          orderAsset: {
            orderToken: orderToken,
            collateralToken: collateralToken,
            outputToken: outputToken,
            pairAddress: orderToken.pairAddress,
          },
          amount: {
            orderSize: rawSize.toString(),
            tokenAmount: "0",
          },
          slippage,
          sl: i + 1,
          isTrailingMode,
          exit: {
            takeProfit: {
              profit: "0",
              takeProfitPercentage: Number(tpBps),
              takeProfitPrice: "0",
            },
            stopLoss: {
              isActive: true,
              save: "0",
              stopLossPercentage: Number(slBps),
              stopLossPrice: "0",
            },
            isTechnicalExit: false,
          },
          isActive: true,
          isBusy: false,
          priority: Number(priority),
          executionSpeed,
          reEntrance: {
            isReEntrance,
            reEntranceLimit: Math.floor(reEntrancePercentage * 100),
          },
          executionFee: {
            payInUsd: "0",
            feeInUsd: "0",
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } else {
      let isSellStrategy = strategy == "sellToken";

      const slBps = BigInt(Math.floor(slPercentage * 100));
      const tpBps = BigInt(Math.floor(tpPercentage * 100));
      estOrders.push({
        user: {},
        wallet: {},
        chainId,
        name: orderName,
        strategy,
        category: "spot",
        orderType: isSellStrategy ? "SELL" : "BUY",
        orderStatus: "PENDING",
        entry: {
          isTechnicalEntry:
            !isSellStrategy && strategy == "algo" ? true : false,
          ...(strategy == "algo" && { technicalLogic: entryLogic }),
          ...(!isSellStrategy &&
            strategy != "algo" && {
              priceLogic: {
                type: "Price",
                id: "price",
                operator: "LESS_THAN",
                threshold: safeParseUnits(
                  targetPrice,
                  PRECISION_DECIMALS,
                ).toString(),
              },
            }),
        },
        orderAsset: {
          orderToken: orderToken,
          collateralToken: collateralToken,
          outputToken: outputToken,
          pairAddress: orderToken.pairAddress,
        },
        amount: {
          orderSize: isSellStrategy
            ? "0"
            : safeParseUnits(
                initialOrderSize,
                collateralToken.decimals,
              ).toString(),
          tokenAmount: isSellStrategy
            ? safeParseUnits(initialOrderSize, orderToken.decimals).toString()
            : "0",
        },
        slippage,
        sl: 1,
        isTrailingMode,
        exit: {
          takeProfit: {
            profit: "0",
            takeProfitPercentage: isTechnicalExit ? 0 : Number(tpBps),
            takeProfitPrice:
              isSellStrategy && !isTechnicalExit && tpPrice
                ? safeParseUnits(tpPrice, PRECISION_DECIMALS).toString()
                : "0",
          },
          stopLoss: {
            isActive: !isSellStrategy && activeStopLoss && !isTechnicalExit,
            save: "0",
            stopLossPercentage: isTechnicalExit ? 0 : Number(slBps),
            stopLossPrice: "0",
          },
          isTechnicalExit: isTechnicalExit,
          ...(isTechnicalExit && { technicalLogic: exitLogic }),
        },
        isActive: true,
        isBusy: false,
        priority: Number(priority),
        executionSpeed,
        reEntrance: {
          isReEntrance,
          reEntranceLimit: Math.floor(reEntrancePercentage * 100),
        },
        executionFee: {
          payInUsd: "0",
          feeInUsd: "0",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return estOrders;
  };

  const addSpotOrder = async ({
    estOrders,
    areWalletsReady,
    gridsByWallet,
    name,
    chainId,
    strategy,
    indexToken,
    category,
    isLong,
    user,
  }: AddOrderProps) => {
    let orderAddResult = { added: false, error: null as string | null };
    try {
      // Validate inputs
      if (estOrders.length == 0 || !areWalletsReady) {
        let key = "INVALID_EST_ORDERS";
        notify("error", key);
        orderAddResult.error = key;
        return orderAddResult;
      }

      if(!chainId){
        let key = "INVALID_NETWORK";
        notify("error", key);
        orderAddResult.error = key;
        return orderAddResult;
      }else{
        if(!Object.values(chains).includes(chainId)){
          let key = "UNSUPPORTED_NETWORK";
          notify("error", key);
          orderAddResult.error = key;
          return orderAddResult;
        }
      }

      if(!name){
        let key = "INVALID_ORDER_NAME";
          notify("error", key);
          orderAddResult.error = key;
          return orderAddResult;
      }

      if(!strategy){
        let key = "INVALID ORDER_STRATEGY";
          notify("error", key);
          orderAddResult.error = key;
          return orderAddResult;
      }

      if (category != "perpetual") {
        let userAddedAssetes = user.assetes || [];
        let userTokens = [...userAddedAssetes, ...userDeafultTokens]
          .filter((t) => t.split(":")[1] == chainId)
          .map((t) => t.toLowerCase());
        if (!userTokens.includes((`${indexToken}:${chainId}`).toLowerCase())) {
          let key = "TOKEN_NOT_ADDED";
          notify("error", key);
          orderAddResult.error = key;
          return orderAddResult;
        }
      }

      if (user.status != "admin") {
        const state = USER_LEVEL[user.status.toUpperCase()];
        if (!state) {
          let key = "USER_NOT_ELIGIBLE";
          notify("error", key);
          orderAddResult.error = key;
          return orderAddResult;
        }

        if (!state.benefits.supportStrategy.includes(strategy)) {
          let key = "UNSUPPORTED_STRATEGY";
          notify("error", key);
          orderAddResult.error = key;
          return orderAddResult;
        }
      }

      // Process grids
      const _gridsByWallet: Record<number, string> = {};
      for (const key in gridsByWallet) {
        if (gridsByWallet[key]?._id) {
          _gridsByWallet[key] = gridsByWallet[key]._id;
        }
      }

      // Submit order
      const apiResponse: any = await OrderService.addOrder({
        orders: estOrders,
        chainId,
        strategy,
        gridsByWallet: _gridsByWallet,
        indexToken,
        category,
        name,
        isLong,
      });

      if (!apiResponse.success) {
        let key = apiResponse.success || "SERVER_ERROR";
        notify("error", key);
        orderAddResult.error = key;
        return orderAddResult;
      }

      notify("success", "ORDER_CREATION_SUCCESS");

      if (apiResponse.data.orders) {
        setUserOrders(apiResponse.data.orders);
      } else {
        notifyWithResponseError("error", "Network congested. Refresh the page");
      }
      orderAddResult.added = true;
      return orderAddResult;
    } catch (error: any) {
      let key = handleServerErrorToast({ err: error });
      orderAddResult.error = key;
      return orderAddResult;
    }
  };

  const deleteOrder = async (order: ORDER_TYPE) => {
    let deleteResult = { deleted: false, error: null as string | null };
    if (!order._id) {
      let key = "INVALID_ORDER";
      notify("error", key);
      deleteResult.error = key;
      return deleteResult;
    }
    try {
      let apiResponse: any = await OrderService.deleteOrde({
        orderId: order._id,
      });
      if (!apiResponse.deleted) {
        let key = apiResponse.message || "SERVER_ERROR";
        notify("error", key);
        deleteResult.error = key;
        return deleteResult;
      }
      notify("success", "ORDER_DELETE_SUCCESS");

      if (apiResponse.data.orders) {
        setUserOrders(apiResponse.data.orders);
      } else {
        notifyWithResponseError("error", "Network congested. Refresh the page");
      }
      deleteResult.deleted = true;
      return deleteResult;
    } catch (err: any) {
      let key = handleServerErrorToast({ err });
      deleteResult.error = key;
      return deleteResult;
    }
  };

  const closeOrder = async (order: ORDER_TYPE) => {
    let closedResult = { deleted: false, error: null as string | null };
    if (!order._id) {
      let key = "INVALID_ORDER";
      notify("error", key);
      closedResult.error = key;
      return closedResult;
    }
    try {
      let apiResponse: any = await OrderService.closeOrder({
        orderId: order._id,
      });
      if (!apiResponse.closed) {
        let key = apiResponse.message || "SERVER_ERROR";
        notify("error", key);
        closedResult.error = key;
        return closedResult;
      }
      notify("success", "ORDER_DELETE_SUCCESS");

      if (apiResponse.data.orders) {
        setUserOrders(apiResponse.data.orders);
      } else {
        notifyWithResponseError("error", "Network congested. Refresh the page");
      }
      closedResult.deleted = true;
      return closedResult;
    } catch (err: any) {
      let key = handleServerErrorToast({ err });
      closedResult.error = key;
      return closedResult;
    }
  };

  const closeStrategy = async ({
    strategyName,
    category,
    strategy,
  }: {
    strategyName: string;
    category: string;
    strategy: string;
  }) => {};
  const deleteStrategy = async ({
    strategyName,
    category,
    strategy,
  }: {
    strategyName: string;
    category: string;
    strategy: string;
  }) => {};

  const getOrders = async () => {
    try {
      let apiResponse: any = await OrderService.getOrder({});
      if (!apiResponse.success) {
        let key = apiResponse.message || "SERVER_ERROR";
        notify("error", key);
        return false;
      }
      notify("success", "ORDER_FETCH_SUCCESS");
      setUserOrders(apiResponse.data.orders);
      return true;
    } catch (err) {
      let key = handleServerErrorToast({ err });
      return false;
    }
  };

  return {
    configureOrder,
    addSpotOrder,
    closeOrder,
    deleteOrder,
    getOrders,
    deleteStrategy,
    closeStrategy,
  };
};
