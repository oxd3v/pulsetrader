import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiCheck, FiRefreshCw, FiAlertCircle, FiClock } from "react-icons/fi";
import toast from "react-hot-toast";
import { formatUnits, parseUnits } from "ethers";
import { WalletConfig } from "@/type/common";
import { getWalletTokenBalance } from "@/lib/blockchain/balance";
import Service from "@/service/api-service";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import { calculateWalletTokenAllocation } from "@/utility/orderUtility";
import { MIN_PERP_DEPOSIT } from "@/constants/common/order";

interface TokenOption {
  symbol: string;
  address: string;
  decimals: number;
  chainId: number;
  isArbUsdc: boolean;
}

interface PerpDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletConfig;
  chainId: number;
  initialDex: string; // 'asterdex' | 'hyperliquid'
}



// Available tokens users can deposit from
const TOKEN_OPTIONS: TokenOption[] = [
  { symbol: "USDC (Arbitrum)", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6, chainId: 42161, isArbUsdc: true },
  { symbol: "USDT (Arbitrum)", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6, chainId: 42161, isArbUsdc: false },
  { symbol: "ETH (Arbitrum)", address: "0x0000000000000000000000000000000000000000", decimals: 18, chainId: 42161, isArbUsdc: false },
];

export default function PerpDepositModal({
  isOpen,
  onClose,
  wallet,
  chainId,
  initialDex,
}: PerpDepositModalProps) {
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState("");
  const [selectedDex, setSelectedDex] = useState(initialDex);
  const [walletBalance, setWalletBalance] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteInfo, setQuoteInfo] = useState<any>(null);

  const [selectedToken, setSelectedToken] = useState<TokenOption>(TOKEN_OPTIONS[0]);

  const { userOrders } = useStore(useShallow((state: any) => ({
    userOrders: state.userOrders || []
  })));
  const [lockedBalance, setLockedBalance] = useState<bigint>(BigInt(0));

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    setSelectedDex(initialDex);
  }, [initialDex]);

  const fetchBalance = useCallback(async () => {
    if (!wallet || !selectedToken) return;
    try {
      const balance = await getWalletTokenBalance({
        walletAddress: wallet.address,
        tokenAddress: selectedToken.address,
        chainId: selectedToken.chainId,
      });
      setWalletBalance(typeof balance === "bigint" ? balance : BigInt(balance));
    } catch {
      setWalletBalance(BigInt(0));
    }
  }, [wallet, selectedToken]);

  useEffect(() => {
    if (isOpen) {
      fetchBalance();
      setQuoteInfo(null);
      setAmount("");
    }
  }, [isOpen, fetchBalance]);

  useEffect(() => {
    if (wallet?._id && selectedToken?.address) {
       const locked = calculateWalletTokenAllocation({
         orders: userOrders,
         walletId: wallet._id,
         tokenAddress: selectedToken.address
       });
       setLockedBalance(locked);
    } else {
       setLockedBalance(BigInt(0));
    }
  }, [wallet?._id, selectedToken?.address, userOrders]);

  const availableBalance = (walletBalance - lockedBalance) > BigInt(0) 
    ? (walletBalance - lockedBalance) 
    : BigInt(0);

  // Validate amount
  const parsedAmount = (() => {
    try {
      if (!amount || Number(amount) <= 0) return null;
      return parseUnits(amount, selectedToken.decimals);
    } catch {
      return null;
    }
  })();

  const isBelowMinimum = parsedAmount !== null && Number(amount) < MIN_PERP_DEPOSIT;
  const isInsufficientBalance = parsedAmount !== null && parsedAmount > availableBalance;
  const needsBridgeOrSwap = !selectedToken.isArbUsdc;

  // Quote deposit (for non-USDC tokens)
  const handleQuote = async () => {
    if (!parsedAmount) return;
    setIsQuoting(true);
    setQuoteInfo(null);
    try {
      const res: any = await Service.quotePerpDeposit({
        walletId: wallet._id,
        tokenAddress: selectedToken.address,
        amount: parsedAmount.toString(),
        chainId: selectedToken.chainId,
        dex: selectedDex,
      });
      if (res?.success || res?.data?.success) {
        setQuoteInfo(res?.data || res);
      } else {
        toast.error(res?.data?.message || res?.message || "Quote failed");
      }
    } catch {
      toast.error("Failed to get deposit quote");
    } finally {
      setIsQuoting(false);
    }
  };

  // Execute deposit
  const handleDeposit = async () => {
    if (!amount || Number(amount) <= 0) return toast.error("Enter a valid amount");
    //if (isBelowMinimum) return toast.error(`Minimum deposit is ${MIN_DEPOSIT_USDC} USDC`);
    if (!parsedAmount) return toast.error("Invalid amount");
    if (isInsufficientBalance) return toast.error("Insufficient balance");

    setIsLoading(true);
    try {
      const res: any = await Service.perpDeposit({
        walletId: wallet._id,
        tokenAddress: selectedToken.address,
        amount: parsedAmount.toString(),
        chainId: selectedToken.chainId,
        dex: selectedDex,
      });
      if (res?.success || res?.data?.success) {
        const notice = res?.data?.notice || res?.data?.data?.notice || "";
        toast.success(`Deposited to ${selectedDex} successfully!${notice ? ` ${notice}` : ""}`);
        onClose();
        setAmount("");
        setQuoteInfo(null);
      } else {
        const msg = res?.data?.message || res?.message || "Deposit failed";
        if (msg === "MINIMUM_DEPOSIT_REQUIRED") {
          toast.error(`Minimum deposit is ${MIN_PERP_DEPOSIT} USDC`);
        } else {
          toast.error(msg);
        }
      }
    } catch {
      toast.error("Error depositing");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted || !isOpen) return null;

  const canDeposit = parsedAmount && !isBelowMinimum && !isInsufficientBalance && !isLoading;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#0d1117] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Deposit to {selectedDex === "asterdex" ? "Asterdex" : "Hyperliquid"}</h2>
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500 mt-1">
                Minimum {MIN_PERP_DEPOSIT} USDC
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-gray-500">
              <FiX size={20} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* DEX Selection */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                Target Protocol
              </label>
              <div className="flex gap-2">
                {["asterdex", "hyperliquid"].map((dex) => (
                  <button
                    key={dex}
                    onClick={() => {
                      setSelectedDex(dex);
                      setQuoteInfo(null);
                    }}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                      selectedDex === dex
                        ? dex === "asterdex"
                          ? "bg-purple-600 text-white"
                          : "bg-blue-600 text-white"
                        : "bg-white/5 text-gray-500 hover:bg-white/10"
                    }`}
                  >
                    {dex === "asterdex" ? "Asterdex" : "Hyperliquid"}
                  </button>
                ))}
              </div>
            </div>

            {/* Token Selection */}
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                Deposit Token
              </label>
              <select
                value={selectedToken.address}
                onChange={(e) => {
                  const token = TOKEN_OPTIONS.find((t) => t.address === e.target.value);
                  if (token) {
                    setSelectedToken(token);
                    setQuoteInfo(null);
                  }
                }}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none text-sm focus:border-blue-500 transition-colors"
              >
                {TOKEN_OPTIONS.map((t) => (
                  <option key={t.address} value={t.address}>
                    {t.symbol}
                  </option>
                ))}
              </select>
            </div>

            {/* Bridge/Swap Notice */}
            {needsBridgeOrSwap && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <FiAlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-amber-400 font-semibold">
                    This token will be swapped to Arbitrum USDC before depositing.
                  </p>
                  <p className="text-[10px] text-amber-400/70 mt-0.5">
                    Only Arbitrum USDC is accepted by perp DEX contracts.
                  </p>
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div className="bg-[#161b22] border border-white/10 rounded-2xl p-4">
              <div className="flex justify-between items-center text-[10px] text-gray-500 mb-2 font-bold uppercase tracking-widest">
                <span>Amount to Deposit</span>
                <div className="flex gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <span>Locked:</span>
                    <span className="text-red-400 normal-case">{formatUnits(lockedBalance, selectedToken.decimals)} {selectedToken.symbol.split(" ")[0]}</span>
                  </div>
                  <button
                    onClick={fetchBalance}
                    className="flex items-center gap-1.5 hover:text-white transition-colors"
                  >
                    <FiRefreshCw className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 normal-case">{formatUnits(availableBalance, selectedToken.decimals)} {selectedToken.symbol.split(" ")[0]}</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setQuoteInfo(null);
                  }}
                  placeholder="0.00"
                  min={MIN_PERP_DEPOSIT}
                  className="bg-transparent outline-none text-2xl font-black text-white w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => {
                    setAmount(formatUnits(availableBalance, selectedToken.decimals));
                    setQuoteInfo(null);
                  }}
                  className="text-xs bg-white/10 px-2.5 py-1.5 rounded-lg text-white font-bold tracking-widest uppercase hover:bg-white/20 transition-all"
                >
                  MAX
                </button>
              </div>

              {/* Validation Messages */}
              {isBelowMinimum && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3" />
                  Minimum deposit is {MIN_PERP_DEPOSIT} USDC
                </p>
              )}
              {isInsufficientBalance && !isBelowMinimum && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <FiAlertCircle className="w-3 h-3" />
                  Insufficient wallet balance
                </p>
              )}
            </div>

            {/* Time Notice */}
            <div className="flex items-center gap-2 text-[10px] text-gray-500 px-1">
              <FiClock className="w-3.5 h-3.5" />
              <span>Funds typically appear in your perp account within 2-3 minutes after deposit.</span>
            </div>

            {/* Quote Button (for non-USDC) */}
            {needsBridgeOrSwap && !quoteInfo && (
              <button
                onClick={handleQuote}
                disabled={!parsedAmount || isBelowMinimum || isInsufficientBalance || isQuoting}
                className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-white bg-white/10 hover:bg-white/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isQuoting ? (
                  <div className="flex items-center justify-center gap-2">
                    <FiRefreshCw className="animate-spin" size={14} />
                    Fetching Quote...
                  </div>
                ) : (
                  "Get Quote"
                )}
              </button>
            )}

            {/* Quote Result */}
            {quoteInfo && needsBridgeOrSwap && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Estimated USDC received</span>
                  <span className="text-emerald-400 font-bold">
                    ~{Number(formatUnits(quoteInfo.estimatedAmount || "0", 6)).toFixed(2)} USDC
                  </span>
                </div>
                {quoteInfo.notice && (
                  <p className="text-[10px] text-gray-500 mt-1">{quoteInfo.notice}</p>
                )}
              </div>
            )}

            {/* Deposit Button */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={!canDeposit || (needsBridgeOrSwap && !quoteInfo)}
              onClick={handleDeposit}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all ${
                selectedDex === "asterdex"
                  ? "bg-gradient-to-r from-purple-600 to-violet-500"
                  : "bg-gradient-to-r from-blue-600 to-cyan-500"
              } ${
                !canDeposit || (needsBridgeOrSwap && !quoteInfo)
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:shadow-lg shadow-blue-500/20"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <FiRefreshCw className="animate-spin" size={18} />
                  Depositing...
                </div>
              ) : (
                "Finalize Deposit"
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
