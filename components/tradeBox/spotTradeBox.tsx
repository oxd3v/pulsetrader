import { useState, useEffect, useMemo } from "react";
import { ORDER_TYPE } from "@/type/order";

import { MIN_ORDER_SIZE, MAX_GRID_NUMBER } from "@/constants/common/order";
import { CollateralTokens } from "@/constants/common/tokens";
import { SpotStrategies } from "@/constants/common/frontend";
import { FiChevronDown, FiInfo } from "react-icons/fi";
import { ZeroAddress } from "ethers";

//components
import { toast } from "react-hot-toast";
import TechnicalEntry from "./TradeBoxCommon/TechnicalEntry";
import InfoTooltip from "./TradeBoxCommon/BoxTooltip";
import DropDown from "./TradeBoxCommon/BoxDropdown";
import TakeProfitInput from "./TradeBoxCommon/TakeProfit";
import StopLossInput from "./TradeBoxCommon/stopLoss2";
import SlippageInput from "./TradeBoxCommon/SlippageTolarence";
import ReEntranceInput from "./TradeBoxCommon/ReEntrance";
import OrderPriority from "./TradeBoxCommon/OrderPriority";
import EntryPriceRendering from "./TradeBoxCommon/EntryPriceRendering";
import OrderNameValidationInput from "./TradeBoxCommon/orderNameValidation";
import GridInput from "./TradeBoxCommon/GridInput";
import NumberInput from "./TradeBoxCommon/NumberInput";
import EstSpotOrders from "@/components/order/estimate/estSpotOrder";
import SelectWallet from "@/components/walletManager/selection/selectWalletToCreateOrder";
import ConfirmationModal from "../common/Confirmation/ConfirmationBox";

// hook
import { useSpotOrder } from "@/hooks/useSpotOrder";

//library
import { fetchCodexTokenPrice } from "@/lib/oracle/codex";

// Constants
const GRID_MULTIPLIER_OPTIONS = [
  { label: "1x", value: 1 },
  { label: "1.5x", value: 1.5 },
  { label: "2x", value: 2 },
  { label: "2.5x", value: 2.5 },
  { label: "3x", value: 3 },
];

interface GridsByWallet {
  [walletIndex: number]: any;
}

const RenderingTechnicalExit = ({
  isTechnicalExit,
  setIsTechnicalExit,
  technicalExit,
  setTechnicalExit,
}: {
  isTechnicalExit: boolean;
  setIsTechnicalExit: (b: boolean) => void;
  technicalExit: any;
  setTechnicalExit: any;
}) => {
  return (
    <div className="space-y-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
          Technical Exit
          <InfoTooltip
            id="reentrance-tooltip"
            content="Automatically re-enter position after being stopped out"
          />
        </label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isTechnicalExit}
            onChange={(e) => setIsTechnicalExit(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {isTechnicalExit && (
        <TechnicalEntry
          technicalEntries={technicalExit}
          setTechnicalEntries={setTechnicalExit}
          title={"Technical Exit condition"}
        />
      )}
    </div>
  );
};

interface DefinedTradeBoxProps {
  tokenInfo: any;
  chainId: number;
  isConnected: boolean;
  user?: any;
  userWallets?: any[];
  userPrevOrders?: any[];
}

export default function DefinedTradeBox({
  tokenInfo,
  chainId,
  isConnected,
  user,
  userWallets = [],
  userPrevOrders = [],
}: DefinedTradeBoxProps) {
  const { configureOrder, addSpotOrder } = useSpotOrder();

  // UI State
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);
  const [openEstOrderModal, setOpenEstimatedOrderModal] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [creationPending, setCreationPending] = useState(false);

  // Strategy & Token State
  const [isTechnicalExit, setIsTechnicalExit] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState(SpotStrategies[0]);
  const [collateralToken, setCollateralToken] = useState<any>(
    CollateralTokens[chainId][ZeroAddress],
  );
  const [outputToken, setOutputToken] = useState<any>(
    CollateralTokens[chainId][ZeroAddress],
  );
  const [collateralPrice, setCollateralPrice] = useState<number>(0);

  // Order Configuration State
  const [initialOrderSize, setInitialOrderSize] = useState<string>("");
  const [entryPrice, setEntryPrice] = useState<string>(tokenInfo?.priceUsd);
  const [tpPrice, setTpPrice] = useState(tokenInfo?.priceUsd);
  const [technicalEntry, setTechnicalEntry] = useState<any>(null);
  const [technicalExit, setTechnicalExit] = useState<any>(null);
  const [orderName, setOrderName] = useState<string>("");
  const [slippage, setSlippage] = useState<number>(1);

  // Grid Configuration State
  const [gridNumber, setGridNumber] = useState<number>(1);
  const [gridDistance, setGridDistance] = useState<number>(1);
  const [gridMultiplier, setGridMultiplier] = useState<number>(1);
  const [orderSizeMultiplier, setOrderSizeMultiplier] = useState<number>(1);

  // Risk Management State
  const [tpPercentage, setTpPercentage] = useState<number>(10);
  const [slPercentage, setSlPercentage] = useState<number>(30);
  const [isActiveStopLoss, setIsActiveStopLoss] = useState<boolean>(false);

  const [isTrailingMode, setIsTrailingMode] = useState<boolean>(false);
  const [isReEntrance, setIsReEntrance] = useState<boolean>(false);
  const [reEntrancePercentage, setReEntrancePercentage] = useState<number>(1);

  // Advanced Settings State
  const [priority, setPriority] = useState<number>(2);
  const [executionSpeed, setExecutionSpeed] = useState<string>("standard");

  // Wallet & Order State
  const [gridsByWallet, setGridsByWallet] = useState<GridsByWallet>({});
  const [areWalletsReady, setWalletsReady] = useState<boolean>(false);
  const [estOrders, setEstOrders] = useState<ORDER_TYPE[]>([]);

  // Validation State
  const [isOrderNameValidate, setIsOrderNameValidate] =
    useState<boolean>(false);

  // ========================================================================
  // Effects
  // ========================================================================

  // Fetch Collateral Price
  useEffect(() => {
    const fetchCollateralPrice = async () => {
      // 1. If Stablecoin, assume $1
      if (collateralToken.isStable) {
        setCollateralPrice(1);
        return;
      }

      // 2. If collateral matches the current page token (assuming tokenInfo has current price)
      if (
        collateralToken.address.toLowerCase() ===
          tokenInfo?.address?.toLowerCase() 
      ) {
        if (tokenInfo?.priceUsd) {
          setCollateralPrice(Number(tokenInfo.priceUsd));
          return;
        }
      }

      // 3. Fetch from API for other tokens
      try {
        let queryAddress = collateralToken.address;

        // Handle Native Token (convert to Wrapped for API query)
        if (collateralToken.address === ZeroAddress) {
          const wrappedNative = Object.values(CollateralTokens[chainId]).find(
            (t: any) => t.isWrappedNative,
          ) as any;
          if (wrappedNative) {
            queryAddress = wrappedNative.address;
          }
        }

        const price = await fetchCodexTokenPrice({
          tokenAddress: queryAddress,
          chainId,
        });
        if (price) {
          setCollateralPrice(price);
        } else {
          // Fallback if fetch fails but we suspect it might be the main token
          setCollateralPrice(0);
        }
      } catch (error) {
        //console.error("Failed to fetch collateral price", error);
        setCollateralPrice(0);
      }
    };

    fetchCollateralPrice();
  }, [collateralToken, tokenInfo, chainId]);

  // ========================================================================
  // Event Handlers
  // ========================================================================

  const handleTrailingMode = (value: boolean) => {
    if (value && slPercentage === 0) {
      setSlPercentage(10);
    }
    setIsTrailingMode(value);
  };

  const handleOrderSize = (value: string) => {
    // if (value === "") {
    //   setInitialOrderSize(value);
    // } else {
    //   const numValue = Math.abs(parseFloat(value));
    //   setInitialOrderSize(numValue.toString());
    // }
    setInitialOrderSize(value);
  };

  const handleStrategyChange = (strategy: (typeof SpotStrategies)[0]) => {
    setSelectedStrategy(strategy);
    setGridNumber(1);
    setShowStrategyDropdown(false);

    // Reset technical entry when switching from algo strategy
    if (selectedStrategy.id === "algo" && strategy.id !== "algo") {
      setTechnicalEntry(null);
    }

    // Set collateral token based on strategy
    if (strategy.id === "sellToken") {
      const tokenFromConstants = Object.values(CollateralTokens[chainId]).find(
        (t: any) =>
          t.address.toLowerCase() === tokenInfo.address?.toLowerCase(),
      ) as any;

      if (tokenFromConstants) {
        setCollateralToken(tokenFromConstants);
      } else {
        // Fallback: create a complete token object with required properties
        setCollateralToken({
          address: tokenInfo.address,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          imageUrl: tokenInfo.imageUrl || "/tokenLogo.png",
        } as any);
      }
    } else {
      // Reset to default collateral token
      setCollateralToken(CollateralTokens[chainId][ZeroAddress]);
    }
  };

  // ========================================================================
  // Validation Logic
  // ========================================================================

  // Helper to calculate estimated USD value
  const estimatedUsdValue = useMemo(() => {
    if (!initialOrderSize || !collateralPrice) return 0;
    return Number(initialOrderSize) * collateralPrice;
  }, [initialOrderSize, collateralPrice]);

  const isReadyToCreateOrder = (): boolean => {
    // Validate trailing mode
    if (
      isTrailingMode &&
      (slPercentage === 0 ||
        slPercentage.toString() === "" ||
        slPercentage == 100)
    ) {
      return false;
    }
    // Validate re-entrance
    if (
      isReEntrance &&
      (reEntrancePercentage <= 0 || reEntrancePercentage.toString() === "")
    ) {
      return false;
    }

    if (gridNumber < 1 || gridNumber > MAX_GRID_NUMBER) {
      return false;
    }

    // Validate technical entry for algo strategy
    if (selectedStrategy.id === "algo") {
      if (!technicalEntry) {
        return false;
      }
    } else {
      if (selectedStrategy.id != "sellToken") {
        // Validate entry price for other strategies
        if (Number(entryPrice) <= 0 || entryPrice === "") {
          return false;
        }
      }
    }

    if (selectedStrategy.id == "sellToken" && !isTechnicalExit) {
      if (Number(tpPrice) <= 0 || tpPrice === "") {
        return false;
      }
    }

    if (isTechnicalExit) {
      if (!technicalExit) {
        return false;
      }
    }

    // Validate basic order parameters
    if (
      Number(initialOrderSize) <= 0 ||
      initialOrderSize == "" ||
      slippage.toString() === "" ||
      slippage <= 0.4
    ) {
      return false;
    }

    // Validate Minimum USD Value
    if (estimatedUsdValue < MIN_ORDER_SIZE) {
      return false;
    }

    // Validate grid number for specific strategies
    if (
      ["limit", "scalp", "algo"].includes(selectedStrategy.id) &&
      gridNumber !== 1
    ) {
      return false;
    }

    // Validate grid configuration
    if (gridNumber.toString() === "" || gridNumber === 0) {
      return false;
    }

    if (Number(gridNumber) > 1) {
      if (
        gridDistance <= 0 ||
        gridMultiplier <= 0 ||
        orderSizeMultiplier <= 0 ||
        gridDistance.toString() === "" ||
        gridMultiplier.toString() === "" ||
        orderSizeMultiplier.toString() === ""
      ) {
        return false;
      }
    }

    // Validate order name
    if (!isOrderNameValidate || orderName.trim() === "") {
      return false;
    }

    return true;
  };

  // ========================================================================
  // Order Management Handlers
  // ========================================================================

  const handleUpdateOrder = (orderId: string, updatedOrder: any) => {
    setEstOrders((prev) =>
      prev.map((order, index) => {
        // Handle both ID formats used in EstSpotOrders component
        const idFromTable = order._id || `temp-${order.sl}-${index}`; // Used in table view
        const idFromEdit = order._id || `temp-${order.sl}`; // Used in edit mode

        if (idFromTable === orderId || idFromEdit === orderId) {
          return updatedOrder;
        }
        return order;
      }),
    );
  };

  const handleDeleteOrder = (orderId: string) => {
    setEstOrders((prev) =>
      prev.filter((order, index) => {
        const idFromTable = order._id || `temp-${order.sl}-${index}`;
        const idFromEdit = order._id || `temp-${order.sl}`;
        return idFromTable !== orderId && idFromEdit !== orderId;
      }),
    );
  };

  // ========================================================================
  // Order Submission
  // ========================================================================

  const handleOrderSubmit = async () => {
    setCreationPending(true);

    try {
      const submitOrder = await addSpotOrder({
        estOrders,
        areWalletsReady,
        gridsByWallet,
        chainId,
        name: orderName,
        strategy: selectedStrategy.id,
        indexToken: tokenInfo.address,
        category: "Spot",
        user,
      });

      if (submitOrder.added == true) {
        // Reset form
        setGridNumber(1);
        setEstOrders([]);
        setInitialOrderSize("");
        setOrderName("");
        setTechnicalEntry(null);
        setIsConfirmationOpen(false);
        setIsOrderNameValidate(false);
      }
    } catch (error) {
      //console.error("Order submission failed:", error);
    } finally {
      setCreationPending(false);
    }
  };

  // ========================================================================
  // Order Configuration Effect
  // ========================================================================

  useEffect(() => {
    if (isReadyToCreateOrder()) {
      const orderConfig: any = {
        gridNumber,
        targetPrice: entryPrice,
        activeStopLoss: true,
        entryLogic: technicalEntry,
        exitLogic: technicalExit,
        orderSizeMultiplier,
        initialOrderSize,
        gridMultiplier,
        gridDistance,
        collateralToken,
        outputToken,
        orderToken: {
          address: tokenInfo.address,
          decimals: tokenInfo.decimals,
          symbol: tokenInfo.symbol,
        },
        priority,
        executionSpeed,
        orderName,
        strategy: selectedStrategy.id,
        chainId,
        isTrailingMode,
        tpPrice: entryPrice,
        slPrice: entryPrice,
        isTechnicalExit,
        tpPercentage,
        slPercentage,
        isReEntrance,
        reEntrancePercentage,
        slippage,
      };
      const _estOrders = configureOrder(orderConfig);
      
      setEstOrders(_estOrders);
    } else {
      setEstOrders([]);
    }
  }, [
    initialOrderSize,
    entryPrice,
    technicalEntry,
    technicalExit,
    orderName,
    gridNumber,
    gridDistance,
    gridMultiplier,
    orderSizeMultiplier,
    isTrailingMode,
    isReEntrance,
    reEntrancePercentage,
    tpPercentage,
    slPercentage,
    slippage,
    collateralToken,
    selectedStrategy,
    priority,
    isTechnicalExit,
    executionSpeed,
    isOrderNameValidate,
    estimatedUsdValue, // added dependency
  ]);

   
  // const MemoizedWalletSelector = useMemo(
  //     () => (
  //         <WalletSelector
  //             availableWallets={wallets}
  //             orders={userPrevOrders}
  //             gridsByWallet={gridsByWallet}
  //             setGridsByWallet={setGridsByWallet}
  //             areWalletsReady={areWalletsReady}
  //             setWalletsReady={setWalletsReady}
  //             chainId={chainId}
  //             collateralToken={collateralToken}
  //             selectedStrategy={selectedStrategy}
  //             estOrders={estOrders}
  //             category="spot"
  //         />
  //     ),
  //     [
  //         estOrders,
  //         gridNumber,
  //         selectedStrategy,
  //         initialOrderSize,
  //         orderSizeMultiplier,
  //         chainId,
  //         collateralToken,
  //         gridsByWallet,
  //         areWalletsReady
  //     ]
  // );

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg p-1 sm:p-3 lg:p-4 space-y-2 md:space-y-4 max-w-2xl mx-auto h-full flex flex-col">
      {/* Strategy Selection */}
      <div className="relative">
        <div
          className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          onClick={() => setShowStrategyDropdown(!showStrategyDropdown)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedStrategy.icon}
              <div>
                <div className="flex gap-1 items-center">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {selectedStrategy.name}
                  </h3>
                  <div
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      selectedStrategy.type === "Basic"
                        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        : selectedStrategy.type === "Premium"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    }`}
                  >
                    {selectedStrategy.type}
                  </div>
                </div>
                <p className="text-xs xl:text-sm text-gray-600 dark:text-gray-300">
                  {selectedStrategy.description}
                </p>
              </div>
            </div>
            <FiChevronDown
              className={`w-5 h-5 text-gray-500 transition-transform ${
                showStrategyDropdown ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>

        {/* Strategy Dropdown Menu */}
        {showStrategyDropdown && (
          <div className="absolute top-full h-[400px] left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg z-50 overflow-y-auto">
            {SpotStrategies.map((strategy) => (
              <div
                key={strategy.id}
                onClick={() => handleStrategyChange(strategy)}
                className={`p-4 cursor-pointer transition-all ${
                  selectedStrategy.id === strategy.id
                    ? "bg-blue-50 dark:bg-gray-700"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  {strategy.icon}
                  <div>
                    <div className="flex gap-1 items-center">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                        {strategy.name}
                      </h3>
                      <div
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          strategy.type === "Basic"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : strategy.type === "Premium"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        }`}
                      >
                        {strategy.type}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {strategy.description}
                    </p>
                  </div>
                </div>
                <div className="mt-2 pl-8">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Features:
                    </span>{" "}
                    {strategy.features?.join(" • ") || ""}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Recommended for:
                    </span>{" "}
                    {strategy.recommendedFor || ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* Scrollable Form Section */}
      {/* ============================================================ */}

      <div className="w-full grow overflow-y-auto space-y-2 scrollbar-track-transparent [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-200 dark:[&::-webkit-scrollbar-track]:bg-gray-600 [&::-webkit-scrollbar-thumb]:bg-white dark:[&::-webkit-scrollbar-thumb]:bg-gray-800 [&::-webkit-scrollbar-thumb]:rounded-full">
        {/* ======================================================== */}
        {/* Initial Setup Section */}
        {/* ======================================================== */}

        <div className="bg-gray-50 dark:bg-gray-900 p-3 2xl:p-6 rounded-xl space-y-3 md:space-y-4 border border-gray-100 dark:border-gray-800">
          <div className="space-y-1 md:space-y-2">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
              Initial Setup
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure your base trading parameters
            </p>
          </div>

          {/* Entry Price or Technical Entry */}
          {selectedStrategy.id != "sellToken" && (
            <div>
              {selectedStrategy.id === "algo" ? (
                <TechnicalEntry
                  technicalEntries={technicalEntry}
                  setTechnicalEntries={setTechnicalEntry}
                  title={"Technical Entry condition"}
                />
              ) : (
                <EntryPriceRendering
                  setEntryPrice={setEntryPrice}
                  chainId={chainId}
                  label={"Entry Price"}
                  tooltipText={"Price at which to enter the position"}
                  type={selectedStrategy.id !== "sellToken"}
                  tokenInfo={tokenInfo}
                />
              )}
            </div>
          )}

          {/* Order Size Input */}
          <div className="space-y-1 md:space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
              {Number(gridNumber) > 1 && orderSizeMultiplier > 1 && "Initial"}{" "}
              Order Size
              <InfoTooltip
                id="order-size-tooltip"
                content="The initial size of your order"
              />
            </label>
            <div className="relative">
              <div
                className={`relative flex focus-within:ring-2 focus-within:ring-blue-500 focus-within:rounded-lg bg-white dark:bg-gray-800 px-1 border ${
                  user?.status !== "admin" &&
                  initialOrderSize &&
                  estimatedUsdValue < MIN_ORDER_SIZE
                    ? "border-red-200 dark:border-red-700"
                    : "border-gray-200 dark:border-gray-700"
                } rounded-lg`}
              >
                <input
                  type="number"
                  min="0"
                  onWheel={(e: any) => e.target.blur()}
                  value={initialOrderSize}
                  onChange={(e) => handleOrderSize(e.target.value)}
                  className="w-full placeholder:text-sm px-3 md:px-4 py-2 md:py-3 transition-all outline-none rounded-r-none border-r-0 bg-transparent text-gray-900 dark:text-white"
                  placeholder="Enter Amount"
                />
                <div className="relative flex items-center pr-1">
                  {selectedStrategy.id !== "sellToken" ? (
                    tokenInfo?.token?.launchpad == null ||
                    tokenInfo?.token?.launchpad?.graduationPercent === 100 ? (
                      <DropDown
                        options={Object.values(CollateralTokens[chainId])
                          .filter(
                            (t) =>
                              t.address.toLowerCase() !=
                              tokenInfo.address.toLowerCase(),
                          )
                          .map((token: any) => ({
                            label: (
                              <div className="flex items-center gap-1 text-gray-900 dark:text-gray-200">
                                <img
                                  src={token.imageUrl}
                                  className="w-4 h-4 rounded-full"
                                  alt={token.symbol}
                                />
                                <span>{token.symbol}</span>
                              </div>
                            ),
                            value: token,
                          }))}
                        onChange={setCollateralToken}
                        value={collateralToken}
                      />
                    ) : (
                      <div className="flex items-center gap-1 text-gray-900 dark:text-gray-200 px-2">
                        <img
                          src={collateralToken.imageUrl}
                          className="w-4 h-4 rounded-full"
                          alt={collateralToken.symbol}
                        />
                        <span>{collateralToken.symbol}</span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-1 text-gray-900 dark:text-gray-200 px-2">
                      <img
                        src={collateralToken.imageUrl}
                        className="w-4 h-4 rounded-full"
                        alt={collateralToken.symbol}
                      />
                      <span>{collateralToken.symbol}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* USD Value Display */}
              {initialOrderSize && (
                <div
                  className={`mt-1 text-xs text-right px-1 ${
                    estimatedUsdValue < MIN_ORDER_SIZE
                      ? "text-red-500 font-medium"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {estimatedUsdValue < MIN_ORDER_SIZE && (
                    <span className="mr-2">Min. order $5 USD</span>
                  )}
                  ≈ $
                  {estimatedUsdValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Order Name Validation */}
          <OrderNameValidationInput
            name={orderName}
            onChange={setOrderName}
            isOrderNameValidate={isOrderNameValidate}
            setIsOrderNameValidate={setIsOrderNameValidate}
            isConnected={isConnected}
          />
        </div>

        {/* ======================================================== */}
        {/* Grid Configuration Section */}
        {/* ======================================================== */}

        {!["limit", "scalp", "algo"].includes(selectedStrategy.id) &&
          !isTechnicalExit && (
            <div className="bg-gray-50 dark:bg-gray-900 p-3 2xl:p-6 rounded-xl space-y-3 md:space-y-4 border border-gray-100 dark:border-gray-800">
              <div className="space-y-1 md:space-y-2">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
                  Grid Configuration
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configure your grid trading parameters
                </p>
              </div>

              <div className="grid xl:grid-cols-2 gap-2">
                <GridInput
                  gridValue={gridNumber}
                  onChange={setGridNumber}
                  user={user}
                />
                <NumberInput
                  inputLabel="Grid Distance"
                  toolTipMessage="Percentage distance between each grid level"
                  value={gridDistance}
                  onChange={setGridDistance}
                  notValid={
                    Number(gridNumber) > 1 &&
                    (gridDistance === 0 || !gridDistance)
                  }
                  selectTagOptions={GRID_MULTIPLIER_OPTIONS}
                />
              </div>

              <div className="grid xl:grid-cols-2 gap-4">
                <NumberInput
                  inputLabel="Grid Multiplier"
                  toolTipMessage="Multiplier for increasing grid size at each level"
                  value={gridMultiplier}
                  onChange={setGridMultiplier}
                  notValid={
                    Number(gridNumber) > 1 &&
                    (gridMultiplier === 0 || !gridMultiplier)
                  }
                  selectTagOptions={GRID_MULTIPLIER_OPTIONS}
                />
                <NumberInput
                  inputLabel="Collateral Multiplier"
                  toolTipMessage="Multiplier for increasing collateral at each grid level"
                  value={orderSizeMultiplier}
                  onChange={setOrderSizeMultiplier}
                  notValid={
                    Number(gridNumber) > 1 &&
                    (orderSizeMultiplier === 0 || !orderSizeMultiplier)
                  }
                  selectTagOptions={GRID_MULTIPLIER_OPTIONS}
                />
              </div>
            </div>
          )}

        {/* ======================================================== */}
        {/* Risk Management Section */}
        {/* ======================================================== */}

        <div className="bg-gray-50 dark:bg-gray-900 p-3 2xl:p-6 rounded-xl space-y-3 md:space-y-4 border border-gray-100 dark:border-gray-800">
          <div className="space-y-1 md:space-y-2">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
              Risk Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure your risk management parameters
            </p>
          </div>

          {selectedStrategy.id != "sellToken" && (
            <TakeProfitInput
              takeProfitPercentage={tpPercentage}
              onTakeProfitPercentageChange={setTpPercentage}
              isTrailingMode={isTrailingMode}
              handleTrailingMode={handleTrailingMode}
              initialOrderSize={initialOrderSize}
              collateralToken={collateralToken}
            />
          )}

          {selectedStrategy.id != "sellToken" && (
            <StopLossInput
              isActive={isActiveStopLoss}
              setIsActive={setIsActiveStopLoss}
              isTrailingMode={isTrailingMode}
              stopLossPercentage={slPercentage}
              setStopLossPercentage={setSlPercentage}
              notValid={isTrailingMode && slPercentage === 0}
            />
          )}

          {selectedStrategy.id == "sellToken" && !isTechnicalExit && (
            <EntryPriceRendering
              setEntryPrice={setTpPrice}
              chainId={chainId}
              label={"Exit Price"}
              tooltipText={"Price at which to exit the position"}
              type={selectedStrategy.id == "sellToken"}
              tokenInfo={tokenInfo}
            />
          )}

          <SlippageInput slippage={slippage} onChange={setSlippage} />

          {selectedStrategy.id != "sellToken" && (
            <ReEntranceInput
              isReEntrance={isReEntrance}
              setIsReEntrance={setIsReEntrance}
              reEntrancePercentage={reEntrancePercentage}
              setReEntrancePercentage={setReEntrancePercentage}
              user={user}
            />
          )}

          {(selectedStrategy.id == "algo" ||
            selectedStrategy.id == "sellToken") && (
            <RenderingTechnicalExit
              isTechnicalExit={isTechnicalExit}
              setIsTechnicalExit={setIsTechnicalExit}
              technicalExit={technicalExit}
              setTechnicalExit={setTechnicalExit}
            />
          )}

          {/* Output Token Selection */}
          <div className="space-y-1 md:space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
              Output Token
              <InfoTooltip
                id="output-token-tooltip"
                content="The token you'll receive when closing positions"
              />
            </label>
            <div className="relative">
              <DropDown
                options={Object.values(CollateralTokens[chainId]).map(
                  (token: any) => ({
                    label: (
                      <div className="flex items-center gap-1 text-gray-900 dark:text-gray-200">
                        <img
                          src={token.imageUrl}
                          className="w-4 h-4 rounded-full"
                          alt={token.symbol}
                        />
                        <span>{token.symbol}</span>
                      </div>
                    ),
                    value: token,
                  }),
                )}
                onChange={setOutputToken}
                value={outputToken}
              />
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* Advanced Settings Section */}
        {/* ======================================================== */}

        <div className="bg-gray-50 dark:bg-gray-900 p-3 2xl:p-6 rounded-xl space-y-3 md:space-y-4 border border-gray-100 dark:border-gray-800">
          <div className="space-y-1 md:space-y-2">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
              Advanced Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure priority and execution settings
            </p>
          </div>

          <OrderPriority
            priority={priority}
            executionSpeed={executionSpeed}
            setPriority={setPriority}
            setExecutionSpeed={setExecutionSpeed}
            user={user}
          />
        </div>
      </div>

      {estOrders.length > 0 && user.account && (
        <SelectWallet
          category="spot"
          orders={userPrevOrders}
          availableWallets={userWallets}
          gridsByWallet={gridsByWallet}
          setGridsByWallet={setGridsByWallet}
          areWalletsReady={areWalletsReady}
          setWalletsReady={setWalletsReady}
          chainId={chainId}
          collateralToken={collateralToken}
          selectedStrategy={selectedStrategy}
          estOrders={estOrders}
          user={user}
        />
      )}

      {/* ============================================================ */}
      {/* Action Buttons */}
      {/* ============================================================ */}

      {isConnected == false ? (
        <div className="flex gap-0.5 items-center">
          {estOrders.length > 0 && (
            <button
              className="w-8 py-3 md:py-4 rounded-s-xl bg-blue-500 font-bold text-white transition-all transform hover:scale-[1.02] flex justify-center items-center cursor-pointer"
              onClick={() => setOpenEstimatedOrderModal(true)}
            >
              📋
            </button>
          )}
          <button
            className={`grow py-3 md:py-4 ${
              estOrders.length > 0 ? "rounded-e-xl" : "rounded-xl"
            } bg-gray-50 dark:bg-gray-900 font-bold text-black dark:text-white transition-all transform hover:scale-[1.02] cursor-pointer`}
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="flex gap-0.5 items-center">
          {estOrders.length > 0 && (
            <button
              className="w-8 py-3 md:py-4 rounded-s-xl bg-blue-500 font-bold text-white transition-all transform hover:scale-[1.02] flex justify-center items-center cursor-pointer"
              onClick={() => setOpenEstimatedOrderModal(true)}
            >
              📋
            </button>
          )}
          <button
            disabled={
              !areWalletsReady ||
              estOrders.length === 0 ||
              creationPending ||
              !isReadyToCreateOrder()
            }
            onClick={() => setIsConfirmationOpen(true)}
            className={`grow py-3 md:py-4 ${
              estOrders.length > 0 ? "rounded-e-xl" : "rounded-xl"
            } ${
              !areWalletsReady ||
              estOrders.length === 0 ||
              creationPending ||
              !isReadyToCreateOrder()
                ? "bg-blue-200 dark:bg-blue-900/30 pointer-events-none opacity-50"
                : "bg-blue-500 hover:bg-blue-600"
            } font-bold text-white transition-all transform hover:scale-[1.02] cursor-pointer`}
          >
            {creationPending ? "Creating..." : "Create Order"}
          </button>
        </div>
      )}

      {openEstOrderModal && estOrders.length > 0 && (
        <EstSpotOrders
          selectedStrategy={selectedStrategy}
          onUpdateOrder={handleUpdateOrder}
          onDeleteOrder={handleDeleteOrder}
          estOrders={estOrders}
          onClose={() => setOpenEstimatedOrderModal(false)}
          gridsByWallet={gridsByWallet}
          collateralToken={collateralToken}
          chainId={chainId}
          indexTokenInfo={tokenInfo}
        />
      )}

      {/* Confirmation Modal */}
      {isConfirmationOpen && (
        <ConfirmationModal 
        isOpen={isConfirmationOpen} 
        onClose={()=>setIsConfirmationOpen(false)} 
        onConfirm={handleOrderSubmit} 
        title="Create order" 
        description='Are you sure to create order?' 
        confirmText="Confirm" 
        cancelText="Cancel"
        variant="default"
        />
      )}
    </div>
  );
}
