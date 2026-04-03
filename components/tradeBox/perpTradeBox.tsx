import { useState, useEffect, useMemo } from "react";
import { useDebounce } from "use-debounce";
import { ORDER_TYPE, OrderTokenType } from "@/type/order";

import { MIN_ORDER_SIZE, MAX_GRID_NUMBER } from "@/constants/common/order";
import { PerpCollateral } from "@/constants/common/tokens";
import { PerpetualStrategies } from "@/constants/common/frontend";
import { FiChevronDown, FiAlertTriangle } from "react-icons/fi";
import { ZeroAddress } from "ethers";

//components
import TechnicalEntry from "./TradeBoxCommon/TechnicalEntry";
import InfoTooltip from "./TradeBoxCommon/BoxTooltip";
import DropDown from "./TradeBoxCommon/BoxDropdown";
import TakeProfitInput from "./TradeBoxCommon/TakeProfit";
import StopLossInput from "./TradeBoxCommon/StopLoss";
import SlippageInput from "./TradeBoxCommon/SlippageTolarence";
import ReEntranceInput from "./TradeBoxCommon/ReEntrance";
import OrderPriority from "./TradeBoxCommon/OrderPriority";
import EntryPriceRendering from "./TradeBoxCommon/EntryPriceRendering";
import OrderNameValidationInput from "./TradeBoxCommon/orderNameValidation";
import GridInput from "./TradeBoxCommon/GridInput";
import NumberInput from "./TradeBoxCommon/NumberInput";
import EstSpotOrders from "@/components/order/estimate/estPerpOrder";
import PerpAccountSelect from "@/components/walletManager/selection/perpAccountSelect";
import ConfirmationModal from "../common/Confirmation/ConfirmationBox";

// hook
import { useOrder } from "@/hooks/useOrder";

//library
import { fetchCodexTokenPrice } from "@/lib/oracle/codex";
import LeverageInput from "./TradeBoxCommon/LeverageInput";
import {
  getOrderIndexTokenAddress,
  getOrderPerpetual,
  getOrderProtocol,
  isActiveClientOrder,
  getDefaultFeeToken,
  shouldRenderFeeTokenSelector,
  calculateEstLiquidationPrice,
} from "@/utility/orderUtility";
import { displayNumber } from "@/utility/displayPrice";
import { BASIS_POINT_DIVISOR } from "@/constants/common/utils";

// Constants
const GRID_MULTIPLIER_OPTIONS = [
  { label: "1x", value: 1 },
  { label: "1.5x", value: 1.5 },
  { label: "2x", value: 2 },
  { label: "2.5x", value: 2.5 },
  { label: "3x", value: 3 },
];

const EST_PERP_MAINTENANCE_BPS = 50;

interface GridsByWallet {
  [walletIndex: number]: any;
}

const renderTokenOption = (token: any) => ({
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
});

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

interface perpTradeBoxProps {
  tokenInfo: any;
  chainId: number;
  isConnected: boolean;
  user?: any;
  userWallets?: any[];
  userPrevOrders?: any[];
  protocol: string;
}

export default function PerpTradeBox({
  tokenInfo,
  chainId,
  isConnected,
  user,
  userWallets = [],
  userPrevOrders = [],
  protocol,
}: perpTradeBoxProps) {
  const { configurePerpOrder, submitOrder } = useOrder();

  // UI State
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);
  const [openEstOrderModal, setOpenEstimatedOrderModal] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [creationPending, setCreationPending] = useState(false);

  // Strategy & Token State
  const [isTechnicalExit, setIsTechnicalExit] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState(
    PerpetualStrategies[0],
  );
  const [collateralToken, setCollateralToken] = useState<any>(
    Object.values(PerpCollateral[42161])[0],
  );
  const [outputToken, setOutputToken] = useState<any>(
    Object.values(PerpCollateral[42161])[0],
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
  const [slPercentage, setSlPercentage] = useState<number>(10);
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
  const [perpAccountGateOk, setPerpAccountGateOk] = useState(false);
  const [estOrders, setEstOrders] = useState<ORDER_TYPE[]>([]);
  const feeTokenOptions = useMemo(
    () => Object.values(PerpCollateral[chainId] || {}) as OrderTokenType[],
    [chainId],
  );
  const [feeToken, setFeeToken] = useState<OrderTokenType | null>(
    getDefaultFeeToken(feeTokenOptions),
  );
  const [feeTokenPrice, setFeeTokenPrice] = useState<number>(0);
  const showFeeTokenSelector = shouldRenderFeeTokenSelector(user?.status);

  const [leverage, setLeverage] = useState(1);
  //const [leverageMultiplier, setLevrageMultiplier] = useState(1);
  const [isLong, setIsLong] = useState(false);

  const [debouncedInitialOrderSize] = useDebounce(initialOrderSize, 300);
  const [debouncedEntryPrice] = useDebounce(entryPrice, 300);
  const [debouncedTpPrice] = useDebounce(tpPrice, 300);

  //order submission error
  const [submitText, setSubmitText] = useState("Create Order");
  const [readyToSubmitOrder, setReadyToSubmitOrder] = useState(false);

  // Validation State
  const [isOrderNameValidate, setIsOrderNameValidate] =
    useState<boolean>(false);

  const negativeGridDecrementalPriceProtection = () => {
    if (gridDistance > 0 && gridNumber > 1 && gridMultiplier > 0) {
      let fristCal = gridMultiplier ** (gridNumber - 1) - 1;
      let secounCal = fristCal / (gridMultiplier - 1);
      let lastPercentage = gridDistance * secounCal;
      if (lastPercentage >= 100) {
        return true;
      }
    }
    return false;
  };

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
          const wrappedNative = Object.values(PerpCollateral[chainId]).find(
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

  useEffect(() => {
    const nextPrice = tokenInfo?.priceUsd ? String(tokenInfo.priceUsd) : "";
    setEntryPrice(nextPrice);
    setTpPrice(nextPrice);
  }, [tokenInfo?.address]);

  useEffect(() => {
    const defaultFeeToken = getDefaultFeeToken(feeTokenOptions);
    setFeeToken((prev) => {
      if (!defaultFeeToken) return null;

      const matchedToken = feeTokenOptions.find(
        (token) =>
          token.address.toLowerCase() === prev?.address?.toLowerCase(),
      );

      return matchedToken || defaultFeeToken;
    });
  }, [feeTokenOptions]);

  useEffect(() => {
    const fetchFeeTokenPrice = async () => {
      if (!feeToken) {
        setFeeTokenPrice(0);
        return;
      }

      if (feeToken.isStable) {
        setFeeTokenPrice(1);
        return;
      }

      if (
        tokenInfo?.address &&
        feeToken.address.toLowerCase() === tokenInfo.address.toLowerCase() &&
        tokenInfo?.priceUsd
      ) {
        setFeeTokenPrice(Number(tokenInfo.priceUsd));
        return;
      }

      if (
        collateralToken?.address &&
        feeToken.address.toLowerCase() ===
        collateralToken.address.toLowerCase() &&
        collateralPrice > 0
      ) {
        setFeeTokenPrice(collateralPrice);
        return;
      }

      try {
        let queryAddress = feeToken.address;

        if (queryAddress === ZeroAddress) {
          const wrappedNative = Object.values(PerpCollateral[chainId]).find(
            (token: any) => token.isWrappedNative,
          ) as any;

          if (wrappedNative) {
            queryAddress = wrappedNative.address;
          }
        }

        const price = await fetchCodexTokenPrice({
          tokenAddress: queryAddress,
          chainId,
        });

        setFeeTokenPrice(price ? Number(price) : 0);
      } catch {
        setFeeTokenPrice(0);
      }
    };

    fetchFeeTokenPrice();
  }, [feeToken, tokenInfo?.address, tokenInfo?.priceUsd, collateralPrice, collateralToken, chainId]);

  // ========================================================================
  // Event Handlers
  // ========================================================================

  const handleTrailingMode = (value: boolean) => {
    if (value == true) {
      setIsActiveStopLoss(true);
      if (slPercentage === 0) {
        setSlPercentage(10);
      }
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

  const handleStrategyChange = (strategy: (typeof PerpetualStrategies)[0]) => {
    setSelectedStrategy(strategy);
    setGridNumber(1);
    setShowStrategyDropdown(false);

    // Reset technical entry when switching from algo strategy
    if (selectedStrategy.id === "algo" && strategy.id !== "algo") {
      setTechnicalEntry(null);
    }

    // Set collateral token based on strategy
    if (strategy.id === "sellToken") {
      const tokenFromConstants = Object.values(PerpCollateral[chainId]).find(
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
      setCollateralToken(Object.values(PerpCollateral[chainId])[0]);
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

  const entryForLiquidationUsd = useMemo(() => {
    if (selectedStrategy.id === "sellToken" && !isTechnicalExit) {
      return Number(debouncedTpPrice) || 0;
    }
    if (selectedStrategy.id === "algo") {
      return (
        Number(debouncedEntryPrice) || Number(tokenInfo?.priceUsd) || 0
      );
    }
    return Number(debouncedEntryPrice) || 0;
  }, [
    selectedStrategy.id,
    isTechnicalExit,
    debouncedTpPrice,
    debouncedEntryPrice,
    tokenInfo?.priceUsd,
  ]);

  const estLiquidationPriceUsd = useMemo(() => {
    return calculateEstLiquidationPrice(
      entryForLiquidationUsd,
      leverage,
      isLong,
      EST_PERP_MAINTENANCE_BPS,
    );
  }, [entryForLiquidationUsd, leverage, isLong]);

  const selectedWalletCount = useMemo(() => {
    const walletKeys = Object.values(gridsByWallet)
      .map((wallet: any) => wallet?._id || wallet)
      .filter(Boolean);

    return new Set(walletKeys).size;
  }, [gridsByWallet]);

  const minimumWalletCount = useMemo(() => {
    return estOrders.length > 0 ? 1 : 0;
  }, [estOrders.length]);

  const feeTokenReady = !showFeeTokenSelector || (!!feeToken?.address && feeTokenPrice > 0);

  const strategyLabel = useMemo(() => {
    return (
      selectedStrategy?.name ||
      selectedStrategy?.id ||
      "Perp strategy"
    );
  }, [selectedStrategy]);



  // Replace the old confirmationDescription with this detailed trade summary
  const confirmationDescription = (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
        Please review your perpetual order details before confirming.
      </p>

      {/* Trade Details Receipt Card */}
      <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-5 border border-gray-200 dark:border-white/10 space-y-4 shadow-inner">

        {/* Action Row */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Action</span>
          <span className={`text-base font-bold flex items-center gap-1.5 ${isLong ? 'text-emerald-500' : 'text-rose-500'}`}>
            <div className={`w-2 h-2 rounded-full ${isLong ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            {isLong ? 'Long' : 'Short'} {tokenInfo?.symbol}
          </span>
        </div>

        {/* Size & Leverage Row */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Position Size</span>
          <span className="text-base font-bold text-gray-900 dark:text-white">
            {initialOrderSize || '0'} {tokenInfo?.symbol} <span className="text-gray-400 mx-1 font-normal">×</span> {leverage}x
          </span>
        </div>

        {/* Strategy Row */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Strategy</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white px-2.5 py-1 bg-gray-200/50 dark:bg-white/10 rounded-md">
            {selectedStrategy?.name || 'Manual'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Orders Count</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white px-2.5 py-1 bg-gray-200/50 dark:bg-white/10 rounded-md">
            {estOrders.length}
          </span>
        </div>

        {/* TP / SL Row (Only renders if they are set > 0) */}
        {(Number(tpPercentage) > 0 || Number(slPercentage) > 0) && (
          <div className="pt-4 mt-2 border-t border-gray-200 dark:border-white/10 space-y-3">
            {Number(tpPercentage) > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Take Profit</span>
                <span className="text-sm font-bold text-emerald-500">+{tpPercentage}%</span>
              </div>
            )}
            {Number(slPercentage) > 0 && isActiveStopLoss && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Stop Loss</span>
                <span className="text-sm font-bold text-rose-500">-{slPercentage}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Risk Warning Box */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20 mt-6">
        <FiAlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed text-left">
          Perpetual trading involves significant risk. Ensure you have sufficient margin to avoid liquidation.
        </p>
      </div>
    </div>
  );

  const isReadyToCreateOrder = (): boolean => {
    const withStatus = (isValid: boolean, text: string) => {
      setSubmitText(text);
      return isValid;
    };

    // Validate trailing mode
    let _submitText = "Create Order";
    if (selectedStrategy.id === "algo") {
      if (!technicalEntry) {
        _submitText = "Set entry logic";
        return withStatus(false, _submitText);
      }
    } else {
      if (selectedStrategy.id == "sellToken" && !isTechnicalExit) {
        if (Number(tpPrice) <= 0 || tpPrice === "") {
          _submitText = "Set exit price";
          return withStatus(false, _submitText);
        }
      } else {
        // Validate entry price for other strategies
        if (Number(entryPrice) <= 0 || entryPrice === "") {
          _submitText = "Set entry price";
          return withStatus(false, _submitText);
        }
      }
    }

    if (Number(initialOrderSize) <= 0 || initialOrderSize == "") {
      _submitText = `Enter valid order size`;
      return withStatus(false, _submitText);
    }
    if (
      isTrailingMode &&
      (slPercentage === 0 ||
        slPercentage.toString() === "" ||
        slPercentage == 100)
    ) {
      _submitText = "Slippage required in trailing mode";
      return withStatus(false, _submitText);
    }
    // Validate re-entrance
    if (
      isReEntrance &&
      (reEntrancePercentage <= 0 || reEntrancePercentage.toString() === "")
    ) {
      _submitText = "Set re-entrance % in re-entrance mode";
      return withStatus(false, _submitText);
    }

    if (gridNumber < 1 || gridNumber > MAX_GRID_NUMBER) {
      _submitText = `Grid must be lower then ${MAX_GRID_NUMBER + 1} and not zero`;
      return withStatus(false, _submitText);
    }

    if (selectedStrategy.id == "sellToken" && !isTechnicalExit) {
      if (Number(tpPrice) <= 0 || tpPrice === "") {
        _submitText = `Enter valid TP price`;
        return withStatus(false, _submitText);
      }
    }

    if (isTechnicalExit) {
      if (!technicalExit) {
        _submitText = `Set exit logic`;
        return withStatus(false, _submitText);
      }
    } else {
      if (tpPercentage <= 0) {
        _submitText = `Set TP percentage`;
        return withStatus(false, _submitText);
      }
      if (isActiveStopLoss && slPercentage <= 0) {
        _submitText = `Set SL percentage`;
        return withStatus(false, _submitText);
      }
    }

    // Validate basic order parameters
    if (Number(initialOrderSize) <= 0 || initialOrderSize == "") {
      _submitText = `Enter valid order size`;
      return withStatus(false, _submitText);
    }

    if (slippage.toString() === "" || slippage <= 0.4) {
      _submitText = `Slippage should be greater then 0.4`;
      return withStatus(false, _submitText);
    }

    // Validate Minimum USD Value
    if (estimatedUsdValue < MIN_ORDER_SIZE) {
      _submitText = `Minimum order size $${MIN_ORDER_SIZE} `;
      return withStatus(false, _submitText);
    }

    // Validate grid number for specific strategies
    if (
      ["limit", "scalp", "algo"].includes(selectedStrategy.id) &&
      gridNumber !== 1
    ) {
      _submitText = `Order configuration not metch refresh please`;
      return withStatus(false, _submitText);
    }

    // Validate grid configuration
    if (gridNumber.toString() === "" || gridNumber === 0) {
      _submitText = `Order configuration not metch refresh please`;
      return withStatus(false, _submitText);
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
        _submitText = `Set valid grid configuration`;
        return withStatus(false, _submitText);
      } else {
        if (
          selectedStrategy.id != "sellToken" &&
          negativeGridDecrementalPriceProtection()
        ) {
          _submitText = `Grid multiplier is too high set negative target`;
          return withStatus(false, _submitText);
        }
      }
    }

    if (!isConnected) {
      _submitText = `Connect your wallet`;
      return withStatus(false, _submitText);
    }

    // Validate order name
    if (!isOrderNameValidate || orderName.trim() === "") {
      _submitText = `set Unique name`;
      return withStatus(false, _submitText);
    }

    const hasAssignedWallets = Object.values(gridsByWallet).some(
      (w: any) => w && (w._id || w.address),
    );
    if (hasAssignedWallets && !perpAccountGateOk) {
      _submitText = "Approve Agent & Deposit First";
      return withStatus(false, _submitText);
    }

    if (!areWalletsReady) {
      _submitText = `Select wallet`;
      return withStatus(false, _submitText);
    }

    if (showFeeTokenSelector && !feeToken?.address) {
      _submitText = `Select fee token`;
      return withStatus(false, _submitText);
    }

    if (showFeeTokenSelector && feeTokenPrice <= 0) {
      _submitText = `Fee token price unavailable`;
      return withStatus(false, _submitText);
    }

    // Protocol specific position limits
    const selectedWalletIds = Object.values(gridsByWallet).map((w: any) => w._id);
    const uniqueWallets = Array.from(new Set(selectedWalletIds));
    const currentProtocol = protocol?.toLowerCase();
    const currentIndexToken = (
      tokenInfo?.address ||
      tokenInfo?.symbol ||
      ""
    ).toLowerCase();

    for (const walletId of uniqueWallets) {
      const walletOrders = userPrevOrders.filter(
        (o: any) =>
          isActiveClientOrder(o) &&
          o.category?.toLowerCase() === "perpetual" &&
          (o.wallet?._id === walletId || o.wallet === walletId) &&
          getOrderIndexTokenAddress(o)?.toLowerCase() === currentIndexToken &&
          getOrderProtocol(o)?.toLowerCase() === currentProtocol,
      );

      if (currentProtocol === "hyperliquid") {
        if (walletOrders.length > 0) {
          _submitText = `Hyperliquid: Only 1 position allowed per asset per wallet`;
          return withStatus(false, _submitText);
        }
      } else if (currentProtocol === "asterdex") {
        const sameDirectionCount = walletOrders.filter(
          (o: any) => getOrderPerpetual(o)?.isLong === isLong,
        ).length;
        if (sameDirectionCount >= 1) {
          _submitText = `Asterdex: Max 1 ${isLong ? "Long" : "Short"} position allowed per wallet`;
          return withStatus(false, _submitText);
        }
      }
    }

    return withStatus(true, _submitText);
  };

  useEffect(() => {
    setReadyToSubmitOrder(isReadyToCreateOrder());
  }, [
    areWalletsReady,
    perpAccountGateOk,
    estimatedUsdValue,
    selectedStrategy,
    technicalEntry,
    technicalExit,
    tpPrice,
    entryPrice,
    initialOrderSize,
    isTrailingMode,
    slPercentage,
    isReEntrance,
    reEntrancePercentage,
    gridNumber,
    isTechnicalExit,
    tpPercentage,
    isActiveStopLoss,
    slippage,
    isConnected,
    isOrderNameValidate,
    orderName,
    showFeeTokenSelector,
    feeToken,
    feeTokenPrice,
    gridsByWallet,
    userPrevOrders,
    tokenInfo,
    protocol,
    isLong,
    gridDistance,
    gridMultiplier,
    orderSizeMultiplier,
    collateralPrice,
  ]);

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
      // Build the full orderParams that the backend expects
      const orderParams = {
        gridNumber,
        targetPrice: entryPrice,
        activeStopLoss: isActiveStopLoss,
        entryLogic: technicalEntry,
        exitLogic: technicalExit,
        orderSizeMultiplier,
        initialOrderSize,
        gridMultiplier,
        gridDistance,
        collateralToken,
        outputToken,
        symbolInfo: {
          symbol: tokenInfo.address || tokenInfo.symbol,
          ...tokenInfo,
        },
        orderToken: tokenInfo,
        priority,
        executionSpeed,
        orderName,
        strategy: selectedStrategy.id,
        chainId,
        isTrailingMode,
        tpPrice,
        isTechnicalExit,
        tpPercentage,
        slPercentage,
        isReEntrance,
        reEntrancePercentage,
        slippage,
        leverage,
        isLong,
        protocol,
        indexTokenAddress: tokenInfo.address || tokenInfo.symbol,
        feeToken,
      };

      const result = await submitOrder({
        orderParams,
        gridsByWallet,
        estOrders,
        areWalletsReady,
        category: "perpetual",
        user,
      });

      if (result.added === true) {
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
    const shouldConfigureOrder = () => {
      // Validate technical entry for algo strategy
      if (isTechnicalExit) {
        if (!technicalExit) {
          return false;
        }
      }
      if (selectedStrategy.id === "algo") {
        if (!technicalEntry) {
          return false;
        }
      } else {
        if (selectedStrategy.id == "sellToken" && !isTechnicalExit) {
          if (Number(debouncedTpPrice) <= 0 || debouncedTpPrice === "") {
            return false;
          }
        } else {
          // Validate entry price for other strategies
          if (Number(debouncedEntryPrice) <= 0 || debouncedEntryPrice === "") {
            return false;
          }
        }
      }

      if (
        Number(debouncedInitialOrderSize) <= 0 ||
        debouncedInitialOrderSize == ""
      ) {
        return false;
      }
      return true;
    };
    if (shouldConfigureOrder()) {
      const targetPx =
        selectedStrategy.id === "sellToken" && !isTechnicalExit
          ? debouncedTpPrice
          : debouncedEntryPrice;
      const orderConfig: any = {
        gridNumber,
        targetPrice: targetPx,
        activeStopLoss: isActiveStopLoss,
        entryLogic: technicalEntry,
        exitLogic: technicalExit,
        orderSizeMultiplier,
        initialOrderSize: debouncedInitialOrderSize,
        gridMultiplier,
        gridDistance,
        collateralToken,
        outputToken,
        orderToken: {
          ...tokenInfo
        },
        priority,
        executionSpeed,
        orderName,
        strategy: selectedStrategy.id,
        chainId,
        isTrailingMode,
        tpPrice: debouncedTpPrice,
        slPrice: debouncedEntryPrice,
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
        feeTokenPrice,
        collateralPrice,
        feeTokenRequired: showFeeTokenSelector,
      };
      const _estOrders = configurePerpOrder(orderConfig);

      setEstOrders(_estOrders);
    } else {
      setEstOrders([]);
    }
  }, [
    debouncedInitialOrderSize,
    debouncedEntryPrice,
    debouncedTpPrice,
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
    feeToken,
    feeTokenPrice,
    selectedStrategy,
    priority,
    isTechnicalExit,
    executionSpeed,
    collateralPrice,
    isLong,
    leverage,
    showFeeTokenSelector,
    protocol,
  ]);

  const MemoizedWalletSelector = useMemo(
    () => (
      <PerpAccountSelect
        protocol={protocol}
        category={'perpetual'}
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
        feeToken={showFeeTokenSelector ? feeToken : undefined}
        onPerpTradeGateChange={setPerpAccountGateOk}
      />
    ),
    [
      estOrders,
      userPrevOrders,
      userWallets,
      protocol,
      gridNumber,
      selectedStrategy,
      chainId,
      collateralToken,
      feeToken,
      gridsByWallet,
      areWalletsReady,
      showFeeTokenSelector,
    ],
  );



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
                    className={`px-2 py-0.5 text-xs rounded-full ${selectedStrategy.type === "Basic"
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
              className={`w-5 h-5 text-gray-500 transition-transform ${showStrategyDropdown ? "rotate-180" : ""
                }`}
            />
          </div>
        </div>

        {/* Strategy Dropdown Menu */}
        {showStrategyDropdown && (
          <div className="absolute top-full h-[400px] left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg z-50 overflow-y-auto">
            {PerpetualStrategies.map((strategy) => (
              <div
                key={strategy.id}
                onClick={() => handleStrategyChange(strategy)}
                className={`p-4 cursor-pointer transition-all ${selectedStrategy.id === strategy.id
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
                        className={`px-2 py-0.5 text-xs rounded-full ${strategy.type === "Basic"
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
        <div className="bg-gray-50 dark:bg-gray-900 p-3 2xl:p-6 rounded-xl space-y-3 md:space-y-4 border border-gray-100 dark:border-gray-800">
          <div className="space-y-1 md:space-y-2">
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-lg">
              Perp Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure future order settings
            </p>
          </div>

          <div className="mb-2 md:mb-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-1 sm:p-1.5 rounded-xl flex gap-1 sm:gap-2 shadow-sm">
              <button
                className={`flex-1 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base transition-all duration-200
            ${isLong
                    ? "bg-green-500 text-white shadow-lg scale-[1.02] hover:bg-green-600"
                    : "text-gray-600 hover:bg-gray-100/80"
                  }`}
                onClick={() => setIsLong(true)}
              >
                Long Position
              </button>
              <button
                className={`flex-1 py-2 sm:py-3 rounded-lg font-medium text-sm sm:text-base transition-all duration-200
            ${isLong === false
                    ? "bg-red-500 text-white shadow-lg scale-[1.02] hover:bg-red-600"
                    : "text-gray-600 hover:bg-gray-100/80"
                  }`}
                onClick={() => setIsLong(false)}
              >
                Short Position
              </button>
            </div>
          </div>

          <LeverageInput leverage={leverage} onLeverageChange={setLeverage} />

          {/* <div className="grid 2xl:grid-cols-2 gap-4">
            <NumberInput
              inputLabel="Levrager"
              toolTipMessage="leverage"
              value={leverage}
              onChange={setLeverage}
              notValid={
                leverage <= 0 //||
                // (typeof maxAllowedLeverage === "number" &&
                //   leverage > maxAllowedLeverage)
              }
              //max={maxAllowedLeverage}
            />
            <NumberInput
              inputLabel="Levrager Multiplier"
              toolTipMessage="leverage Multiplier"
              value={leverageMultiplier}
              onChange={setLevrageMultiplier}
              notValid={
                Number(leverageMultiplier) > 1 &&
                (leverageMultiplier === 0 || !leverageMultiplier)
              }
            />
          </div> */}
          {/* <div className="text-xs text-gray-500 dark:text-gray-400">
            {typeof maxAllowedLeverage === "number"
              ? `Max leverage ${maxAllowedLeverage}x. Current margin range: $${formatUsdLimit(minimumMarginUsd)} to $${formatUsdLimit(maximumMarginUsd)}.`
              : `Current margin range: $${formatUsdLimit(minimumMarginUsd)} to $${formatUsdLimit(maximumMarginUsd)}.`}
          </div> */}
          <div className="grid xl:grid-cols-2 gap-4">
            <div className="space-y-1 md:space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
                Margin Type
                <InfoTooltip
                  id={`MarginType-tooltip`}
                  content={"Order Margin type"}
                />
              </label>
              <div className="flex gap-2 font-bold text-md">ISOLATED</div>
            </div>
            <div className="space-y-1 md:space-y-2">
              <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
                Position Mode
                <InfoTooltip
                  id={`PositionMode-tooltip`}
                  content={"Order Margin type"}
                />
              </label>
              <div className="flex gap-2 font-bold text-md">ONE WAY</div>
            </div>
          </div>
          {estLiquidationPriceUsd != null &&
            estLiquidationPriceUsd > 0 &&
            entryForLiquidationUsd > 0 && (
              <div className="mt-3 p-3 rounded-lg border border-amber-200/80 dark:border-amber-700/50 bg-amber-50/80 dark:bg-amber-900/20">
                <div className="text-xs font-medium text-amber-900 dark:text-amber-200">
                  Est. liquidation (isolated, maint. {EST_PERP_MAINTENANCE_BPS}{" "}
                  bps): $
                  {displayNumber(estLiquidationPriceUsd)}
                </div>
              </div>
            )}
        </div>
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
                className={`relative flex focus-within:ring-2 focus-within:ring-blue-500 focus-within:rounded-lg bg-white dark:bg-gray-800 px-1 border ${user?.status !== "admin" &&
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
                  <div className="flex items-center gap-1 text-gray-900 dark:text-gray-200 px-2">
                    <img
                      src={collateralToken.imageUrl}
                      className="w-4 h-4 rounded-full"
                      alt={collateralToken.symbol}
                    />
                    <span>{collateralToken.symbol}</span>
                  </div>
                </div>
              </div>

              {/* USD Value Display */}
              {initialOrderSize && (
                <div
                  className={`mt-1 text-xs text-right px-1 ${estimatedUsdValue < MIN_ORDER_SIZE
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

            {showFeeTokenSelector && feeToken && (
              <div className="space-y-1 md:space-y-2 mt-2">
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
                  Fee Token
                  <InfoTooltip
                    id="fee-token-tooltip"
                    content="Pulse fee will be collected in this token."
                  />
                </label>
                <DropDown
                  options={feeTokenOptions.map(renderTokenOption)}
                  onChange={setFeeToken}
                  value={feeToken}
                />
              </div>
            )}
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
              {selectedStrategy.id != "dca" && (
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
              )}
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
                options={Object.values(PerpCollateral[chainId]).map(
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

        {/* <div className="bg-gray-50 dark:bg-gray-900 p-3 2xl:p-6 rounded-xl space-y-3 md:space-y-4 border border-gray-100 dark:border-gray-800">
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
            //executionSpeed={executionSpeed}
            setPriority={setPriority}
            //setExecutionSpeed={setExecutionSpeed}
            user={user}
          />
        </div> */}

        <div className="bg-gray-50 dark:bg-gray-900 p-3 2xl:p-6 rounded-xl space-y-3 md:space-y-4 border border-gray-100 dark:border-gray-800">


          {estOrders.length > 0 && user?.account && MemoizedWalletSelector}
        </div>
      </div>

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
            className={`grow py-3 md:py-4 ${estOrders.length > 0 ? "rounded-e-xl" : "rounded-xl"
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
              !readyToSubmitOrder
            }
            onClick={() => setIsConfirmationOpen(true)}
            className={`grow py-3 md:py-4 ${estOrders.length > 0 ? "rounded-e-xl" : "rounded-xl"
              } ${!areWalletsReady ||
                estOrders.length === 0 ||
                creationPending ||
                !readyToSubmitOrder
                ? "bg-blue-200 dark:bg-blue-900/30 pointer-events-none opacity-50"
                : "bg-blue-500 hover:bg-blue-600"
              } font-bold text-white transition-all transform hover:scale-[1.02] cursor-pointer`}
          >
            {creationPending ? "Creating..." : submitText}
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
          onClose={() => setIsConfirmationOpen(false)}
          onConfirm={handleOrderSubmit}
          title="Create order"
          description={confirmationDescription}
          confirmText="Confirm"
          cancelText="Cancel"
          variant="default"
        />
      )}
    </div>
  );
}
