import { ORDER_TYPE } from "@/type/order";
import { WalletConfig } from "@/type/common";
import {
  BASIS_POINT_DIVISOR_BIGINT,
  PRECISION_DECIMALS,
} from "@/constants/common/utils";
import { safeParseUnits } from "@/utility/handy";
import { userDeafultTokens } from "@/constants/common/tokens";
import { USER_LEVEL } from "@/constants/common/user";
import TechnicalEntry from "@/components/tradeBox/TradeBoxCommon/TechnicalEntry";
import OrderService from "@/service/order-service";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";

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

  const addOrder = async ({
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
    try {
      // Validate inputs
      if (estOrders.length == 0 || !areWalletsReady) {
        return {
          added: false,
          message: "Please selects wallet and create order properly",
        };
      }
      
      let userAddedAssetes= user.assetes || []
      let userTokens = [...userAddedAssetes, ...userDeafultTokens]
        .filter((t) => t.split(":")[1] == chainId)
        .map((t) => t.split(":")[0].toLowerCase());

      if (
        category != "perpetual" &&
        !userTokens.includes(indexToken.toLowerCase())
      ) {
        return {
          added: false,
          message: "Please add this token from explorer",
        };
      }

      if (category == "perpetual" && typeof isLong != "boolean") {
        return {
          added: false,
          message: "Please select position type",
        };
      }

      if (user.status != "admin") {
        const state = USER_LEVEL[user.status.toUpperCase()];
        if (!state) {
          return {
            added: false,
            message: "User status not found!",
          };
        }

        if (!state.benefits.supportTrading.includes(category)) {
          return {
            added: false,
            message: "You are not allowed to create order on this category",
          };
        }

        if (!state.benefits.supportStrategy.includes(strategy)) {
          return {
            added: false,
            message: "You are not allowed to create order on this strategy",
          };
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
      const response: any = await OrderService.addOrder({
        orders: estOrders,
        chainId,
        strategy,
        gridsByWallet: _gridsByWallet,
        indexToken,
        category,
        name,
        isLong,
      }).catch((err) => {
        //console.log(err)
        let message = err.response.data.message || "Failed to create Order.";
        if(message == 'EXIST_ORDER_NAME'){
          throw new Error('Order name already exist')
        }else if ("ORDERS_WALLET_NOT_MATCHED" == message){
          throw new Error('Insufficient wallet selection')
        }else if(message = 'No valid wallets selected'){
          throw new Error('Invalid wallet selection')
        }else if (message == 'ONLY_SINGLE_WALLET'){
          throw new Error('Only single wallet can select')
        }else if(message == 'ASSET_NOT_ADDED'){
          throw new Error('Asset not add by user')
        }else if(message == 'EXCEED_ORDER_LIMIT'){
          throw new Error('Exceed order limit')
        }else{
          throw new Error("Failed to create Order.")
        }
        ;
      });

      setUserOrders(response.allOrders);
      return {
        added: true,
        message: "Successfully create the order",
      };
    } catch (error: any) {
      return {
        added: false,
        message: "Failed to create the order  ",
        error: error.message,
      };
    }
  };

  const deleteOrder = async (order:ORDER_TYPE)=>{
    console.log(order)
  }

  const closeOrder = async (order:ORDER_TYPE)=>{
    console.log(order)
  }

  const closeStrategy = async ({strategyName, category, strategy}:{strategyName:string, category: string, strategy:string})=>{

  }
  const deleteStrategy = async ({strategyName, category, strategy}:{strategyName:string, category: string, strategy:string})=>{
    
  }

  const getOrders = async ()=>{
    try{
      let orders = await OrderService.getOrder({});
      
    }catch(err){

    }
  }

  return { configureOrder, addOrder, closeOrder, deleteOrder, getOrders, deleteStrategy,  closeStrategy};
};
