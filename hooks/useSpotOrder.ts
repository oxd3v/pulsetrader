import { ORDER_TYPE } from "@/type/order";
import {
  BASIS_POINT_DIVISOR_BIGINT,
  PRECISION_DECIMALS,
} from "@/constants/common/utils";
import { safeParseUnits } from "@/utility/handy";
import TechnicalEntry from "@/components/tradeBox/TradeBoxCommon/TechnicalEntry";

export const useSpotOrder = () => {
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
        orderToken.decimals
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
          entry: {},
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
        collateralToken.decimals
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
          ...(!isSellStrategy && {
            ...(strategy == "algo" && { technicalLogic: entryLogic }),
            ...(strategy != "algo" && {
              priceLogic: {
                type: "Price",
                id: "price",
                operator: "LESS_THAN",
                threshold: safeParseUnits(
                  targetPrice,
                  PRECISION_DECIMALS
                ).toString(),
              },
            }),
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
                collateralToken.decimals
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
            takeProfitPrice: isSellStrategy && !isTechnicalExit && tpPrice
              ? safeParseUnits(tpPrice, PRECISION_DECIMALS).toString()
              : "0",
          },
          stopLoss: {
            isActive: !isSellStrategy && activeStopLoss && !isTechnicalExit,
            save: "0",
            stopLossPercentage: isTechnicalExit ? 0 : Number(slBps),
            stopLossPrice: "0",
          },
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

  return { configureOrder };
};
