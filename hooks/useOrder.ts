import { ORDER_TYPE } from "@/type/order";
import { WalletConfig } from "@/type/common";
import { BASIS_POINT_DIVISOR_BIGINT, PRECISION_DECIMALS } from "@/constants/common/utils";
import { safeFormatNumber, safeParseUnits } from "@/utility/handy";
import { chains } from "@/constants/common/chain";
import { userDeafultTokens } from "@/constants/common/tokens";
import { USER_LEVEL } from "@/constants/common/user";
import OrderService from "@/service/order-service";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import {
  handleServerErrorToast,
  notify,
  notifyFromApiError,
  notifyWithResponseError,
} from "@/lib/utils";
import {
  isTradeFeeExemptStatus,
  getGridMultiplierNthValue,
  getGridNthPrice,
  ORDER_TRADE_FEE_BIGINT,
  validateCollateralIsStable,
} from "@/utility/orderUtility";
import { convertToUsd } from "@/utility/number";

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

export const useOrder = () => {
  const { setUserOrders } = useStore(
    useShallow((state: any) => ({
      setUserOrders: state.setUserOrders,
    })),
  );


  const configurePerpOrder = (config: any): ORDER_TYPE[] => {
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
      isTechnicalExit,
      tpPercentage,
      slPercentage,
      isReEntrance,
      reEntrancePercentage,
      slippage,
      leverage,
      isLong,
      protocol,
      feeToken,
      collateralPrice,
    } = config;

    const estOrders: ORDER_TYPE[] = [];

    const parsedBaseEntryPrice = safeParseUnits(targetPrice, PRECISION_DECIMALS);
    const parsedBaseAmount = safeParseUnits(
      initialOrderSize,
      collateralToken.decimals,
    );
    const slBps = BigInt(Math.floor(slPercentage * 100));
    const tpBps = BigInt(Math.floor(tpPercentage * 100));
    if (gridNumber > 1) {
      for (let i = 0; i < gridNumber; i++) {
        const orderIndex = i + 1;
        const parsedRawSize = getGridMultiplierNthValue({
          initialValue: parsedBaseAmount,
          multiplier: orderSizeMultiplier,
          n: orderIndex,
        });
        const parsedTragetPrice = getGridNthPrice({
          entryPrice: parsedBaseEntryPrice,
          gridDistance,
          gridMultiplier,
          n: orderIndex,
          decrement: isLong,
        });

        const feeTokenAmount = (parsedRawSize * ORDER_TRADE_FEE_BIGINT) / BASIS_POINT_DIVISOR_BIGINT;
        estOrders.push({
          // ... (order object unchanged) ...
          protocol,
          indexTokenAddress: orderToken.address || orderToken.symbol,
          user: {},
          wallet: {},
          chainId,
          name: orderName,
          strategy,
          category: "perpetual",
          orderType: "BUY",
          orderStatus: "PENDING",
          entry: {
            isTechnicalEntry: false,
            priceLogic: {
              type: "Price",
              id: "price",
              operator: isLong ? "LESS_THAN" : "GREATER_THAN",
              threshold: parsedTragetPrice.toString(),
            },
          },
          perp: {
            quantity: '0',
            isLong,
            leverage: Number(leverage),
            positionMode: "ONE_WAY",
            iswalletBasedContract: false,
            protocol,
            orderAsset: {
              collateralToken,
              outputToken,
              parsedSymbolInfo: orderToken,
              symbol: orderToken.symbol,
            },
            amount: {
              orderSize: parsedRawSize.toString(),
              marginSizeUsd: (convertToUsd(parsedRawSize, collateralToken.decimals, safeParseUnits(collateralPrice, PRECISION_DECIMALS)) || 0).toString(),
            }
          },
          feeToken: {
            ...feeToken,
            amount: feeTokenAmount.toString()
          },
          slippage,
          sl: i + 1,
          isTrailingMode,
          exit: {
            takeProfit: {
              profit: "0",
              takeProfitPercentage: Number(tpBps),
              takeProfitPrice: "0",
              operator: isLong ? "GREATER_THAN" : "LESS_THAN",
            },
            stopLoss: {
              isActive: activeStopLoss,
              save: "0",
              stopLossPercentage: Number(slBps),
              stopLossPrice: "0",
              operator: isLong ? "LESS_THAN" : "GREATER_THAN",
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
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } else {
      const feeTokenAmount = (parsedBaseAmount * ORDER_TRADE_FEE_BIGINT) / BASIS_POINT_DIVISOR_BIGINT;
      estOrders.push({
        // ... (order object unchanged) ...
        protocol,
        indexTokenAddress: orderToken.address || orderToken.symbol,
        user: {},
        wallet: {},
        chainId,
        name: orderName,
        strategy,
        category: "perpetual",
        orderType: "BUY",
        orderStatus: "PENDING",
        entry: {
          isTechnicalEntry: strategy == 'algo' ? true : false,
          ...(strategy == "algo" && { technicalLogic: entryLogic }),
          ...(strategy != "algo" && {
            priceLogic: {
              type: "Price",
              id: "price",
              operator: isLong ? "LESS_THAN" : "GREATER_THAN",
              threshold: parsedBaseEntryPrice.toString(),
            },
          })
        },
        perp: {
          quantity: '0',
          isLong,
          leverage: Number(leverage),
          positionMode: "ONE_WAY",
          iswalletBasedContract: false,
          protocol,
          orderAsset: {
            collateralToken,
            outputToken,
            parsedSymbolInfo: orderToken,
            symbol: orderToken.symbol,
          },
          amount: {
            orderSize: parsedBaseAmount.toString(),
            marginSizeUsd: (convertToUsd(parsedBaseAmount, collateralToken.decimals, safeParseUnits(collateralPrice, PRECISION_DECIMALS)) || 0).toString(),
          }
        },
        feeToken: {
          ...feeToken,
          amount: feeTokenAmount.toString()
        },
        slippage,
        sl: 1,
        isTrailingMode,
        exit: {
          takeProfit: {
            profit: "0",
            takeProfitPercentage: Number(tpBps),
            takeProfitPrice: "0",
            operator: isLong ? "GREATER_THAN" : "LESS_THAN",
          },
          stopLoss: {
            isActive: activeStopLoss,
            save: "0",
            stopLossPercentage: Number(slBps),
            stopLossPrice: "0",
            operator: isLong ? "LESS_THAN" : "GREATER_THAN",
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return estOrders;
  };

  const configureSpotOrder = (config: any): ORDER_TYPE[] => {
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
      feeToken,
      feeTokenPrice,
      collateralPrice,
      orderTokenPrice,
      feeTokenRequired,
    } = config;

    const estOrders: ORDER_TYPE[] = [];
    const isSellStrategy = strategy == "sellToken";
    let parsedBaseTragetPrice = safeParseUnits(targetPrice, PRECISION_DECIMALS);
    let parsedBaseAmount = safeParseUnits(initialOrderSize, collateralToken.decimals);

    if (isSellStrategy) {
      parsedBaseTragetPrice = safeParseUnits(tpPrice, PRECISION_DECIMALS);
      parsedBaseAmount = safeParseUnits(initialOrderSize, orderToken.decimals);
    }

    const slBps = BigInt(Math.floor(slPercentage * 100));
    const tpBps = BigInt(Math.floor(tpPercentage * 100));
    if (gridNumber > 1) {
      for (let i = 0; i < gridNumber; i++) {
        const orderIndex = i + 1;
        const parsedRawSize = getGridMultiplierNthValue({
          initialValue: parsedBaseAmount,
          multiplier: orderSizeMultiplier,
          n: orderIndex,
        });
        const parsedTargetedPrice = getGridNthPrice({
          entryPrice: parsedBaseTragetPrice,
          gridDistance,
          gridMultiplier,
          n: orderIndex,
          decrement: !isSellStrategy,
        });
        estOrders.push({
          // ... (order object unchanged) ...
          user: {},
          wallet: {},
          indexTokenAddress: orderToken.address,
          chainId,
          name: orderName,
          strategy,
          category: "spot",
          orderType: isSellStrategy ? "SELL" : "BUY",
          orderStatus: "PENDING",
          entry: {
            isTechnicalEntry: false,
            priceLogic: {
              type: "Price",
              id: "price",
              operator: "LESS_THAN",
              threshold: parsedTargetedPrice.toString(),
            },
          },
          spot: {
            orderAsset: {
              orderToken,
              collateralToken,
              outputToken,
              ...(orderToken.pairAddress && {
                pairAddress: orderToken.pairAddress,
              }),
            },
            amount: {
              orderSize: isSellStrategy ? "0" : parsedRawSize.toString(),
              tokenAmount: isSellStrategy ? parsedRawSize.toString() : "0",
              orderSizeUsd: convertToUsd(parsedRawSize, collateralToken.decimals, safeParseUnits(collateralPrice, PRECISION_DECIMALS))?.toString() || '0',
            },
          },
          feeToken,
          slippage,
          sl: i + 1,
          isTrailingMode,
          exit: {
            takeProfit: {
              profit: "0",
              takeProfitPercentage: Number(tpBps),
              takeProfitPrice: isSellStrategy ? parsedTargetedPrice.toString() : "0",
              operator: 'GREATER_THAN'
            },
            stopLoss: {
              isActive: activeStopLoss,
              save: "0",
              stopLossPercentage: Number(slBps),
              stopLossPrice: "0",
              operator: 'LESS_THAN'
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
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } else {
      estOrders.push({
        // ... (order object unchanged) ...
        user: {},
        wallet: {},
        indexTokenAddress: orderToken.address,
        chainId,
        name: orderName,
        strategy,
        category: "spot",
        orderType: isSellStrategy ? "SELL" : "BUY",
        orderStatus: "PENDING",
        entry: {
          isTechnicalEntry:
            !isSellStrategy && strategy == "algo" ? true : false,
          ...(!isSellStrategy &&
            strategy == "algo" && { technicalLogic: entryLogic }),
          ...(strategy != "algo" &&
            !isSellStrategy && {
            priceLogic: {
              type: "Price",
              id: "price",
              operator: "LESS_THAN",
              threshold: parsedBaseTragetPrice.toString(),
            },
          }),
        },
        spot: {
          orderAsset: {
            orderToken,
            collateralToken,
            outputToken,
            ...(orderToken.pairAddress && {
              pairAddress: orderToken.pairAddress,
            }),
          },
          amount: {
            orderSize: isSellStrategy ? "0" : parsedBaseAmount.toString(),
            tokenAmount: isSellStrategy ? parsedBaseAmount.toString() : "0",
            orderSizeUsd: convertToUsd(parsedBaseAmount, collateralToken.decimals, safeParseUnits(collateralPrice, PRECISION_DECIMALS))?.toString() || '0',
          },
        },
        feeToken,
        slippage,
        sl: 1,
        isTrailingMode,
        exit: {
          takeProfit: {
            profit: "0",
            takeProfitPercentage: isTechnicalExit ? 0 : Number(tpBps),
            takeProfitPrice:
              !isTechnicalExit && isSellStrategy
                ? parsedBaseTragetPrice.toString()
                : "0",
          },
          stopLoss: {
            isActive: activeStopLoss && !isTechnicalExit,
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
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return estOrders;
  };

  /**
   * createOrder — unified order submission for both spot and perpetual.
   * Sends { orderParams, gridsByWallet } to POST /create-order.
   * The backend rebuilds orders server-side from orderParams.
   */
  const submitOrder = async ({
    orderParams,
    gridsByWallet,
    estOrders,
    areWalletsReady,
    category,
    user,
  }: {
    orderParams: any;
    gridsByWallet: Record<number, WalletConfig>;
    estOrders: ORDER_TYPE[];
    areWalletsReady: boolean;
    category: "spot" | "perpetual";
    user: any;
  }) => {
    let orderAddResult = { added: false, error: null as string | null };
    try {
      // ── Client-side pre-validation ──
      if (estOrders.length === 0 || !areWalletsReady) {
        notify("error", "INVALID_EST_ORDERS");
        orderAddResult.error = "INVALID_EST_ORDERS";
        return orderAddResult;
      }

      const { chainId, strategy, orderName, indexTokenAddress } = orderParams;

      if (!chainId || !Object.values(chains).includes(chainId)) {
        notify("error", "UNSUPPORTED_NETWORK");
        orderAddResult.error = "UNSUPPORTED_NETWORK";
        return orderAddResult;
      }

      if (!orderName) {
        notify("error", "INVALID_ORDER_NAME");
        orderAddResult.error = "INVALID_ORDER_NAME";
        return orderAddResult;
      }

      if (!strategy) {
        notify("error", "INVALID_ORDER_STRATEGY");
        orderAddResult.error = "INVALID_ORDER_STRATEGY";
        return orderAddResult;
      }

      // deprecated
      // Spot-only: verify user has the token added
      // if (category === "spot" && indexTokenAddress) {
      //   const userAddedAssets = user.assets || [];
      //   const userTokens = [...userAddedAssetes, ...userDeafultTokens]
      //     .filter((t: string) => t.split(":")[1] == chainId)
      //     .map((t: string) => t.toLowerCase());
      //   if (!userTokens.includes(`${indexTokenAddress}:${chainId}`.toLowerCase())) {
      //     notify("error", "TOKEN_NOT_ADDED");
      //     orderAddResult.error = "TOKEN_NOT_ADDED";
      //     return orderAddResult;
      //   }
      // }

      // Strategy support check
      if (user.status !== "admin") {
        const state = USER_LEVEL[user.status.toUpperCase()];
        if (!state) {
          notify("error", "USER_NOT_ELIGIBLE");
          orderAddResult.error = "USER_NOT_ELIGIBLE";
          return orderAddResult;
        }
        if (!state.benefits.supportStrategy.includes(strategy)) {
          notify("error", "UNSUPPORTED_STRATEGY");
          orderAddResult.error = "UNSUPPORTED_STRATEGY";
          return orderAddResult;
        }
      }

      if (!isTradeFeeExemptStatus(user?.status)) {
        if (
          !orderParams.feeToken?.address ||
          orderParams.feeToken?.decimals == null
        ) {
          notify("error", "INVALID_FEE_TOKEN");
          orderAddResult.error = "INVALID_FEE_TOKEN";
          return orderAddResult;
        }
      }

      // ── Collateral token must always be a stable token ──
      // The fee token is unrestricted (stable or volatile), but collateral
      // must be stable so that margin / sizing math is predictable and the
      // protocol can safely liquidate / settle positions.
      if (orderParams.collateralToken && category == 'perpetual' && !validateCollateralIsStable(orderParams.collateralToken)) {
        notify("error", "COLLATERAL_MUST_BE_STABLE_TOKEN");
        orderAddResult.error = "COLLATERAL_MUST_BE_STABLE_TOKEN";
        return orderAddResult;
      }

      // ── Convert gridsByWallet: WalletConfig objects → wallet ID strings ──
      const _gridsByWallet: Record<number, string> = {};
      for (const key in gridsByWallet) {
        if (gridsByWallet[key]?._id) {
          _gridsByWallet[key] = gridsByWallet[key]._id;
        }
      }

      // ── Build payload matching backend: { orderParams, gridsByWallet } ──
      // Backend validateParams checks for "name", creation functions use "orderName"
      // So we send both to satisfy both
      const { orderNetworkFee: _omitNetworkFee, ...orderParamsRest } = orderParams;
      const payload = {
        orderParams: {
          ...orderParamsRest,
          category,
          name: orderParams.orderName, // validateParams checks "name"
        },
        gridsByWallet: _gridsByWallet,
      };

      const apiResponse: any = await OrderService.createOrder(payload);

      if (!apiResponse.success) {
        const key = notifyFromApiError(apiResponse.message);
        orderAddResult.error = key;
        return orderAddResult;
      }

      notify("success", "ORDER_CREATION_SUCCESS");

      if (apiResponse.data?.orders) {
        setUserOrders(apiResponse.data.orders);
      } else {
        notifyWithResponseError("error", "Network congested. Refresh the page");
      }
      orderAddResult.added = true;
      return orderAddResult;
    } catch (error: any) {
      const key = handleServerErrorToast({ err: error });
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
        let key = notifyFromApiError(apiResponse.message);
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
        let key = notifyFromApiError(apiResponse.message);
        closedResult.error = key;
        return closedResult;
      }
      notify("success", "ORDER_CLOSED_SUCCESS");

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
  }) => { };
  const deleteStrategy = async ({
    strategyName,
    category,
    strategy,
  }: {
    strategyName: string;
    category: string;
    strategy: string;
  }) => { };

  const getOrders = async () => {
    try {
      let apiResponse: any = await OrderService.getOrder({});
      if (!apiResponse.success) {
        notifyFromApiError(apiResponse.message);
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
    configurePerpOrder,
    configureSpotOrder,
    submitOrder,
    closeOrder,
    deleteOrder,
    getOrders,
    deleteStrategy,
    closeStrategy,
  };
};
