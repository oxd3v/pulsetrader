import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiRefreshCw, FiCopy, FiCheck, FiUser } from "react-icons/fi";
import { SiSolana, SiEthereum } from "react-icons/si";
import { useUserAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { chains } from "@/constants/common/chain";
import { NOTIFICATION_CONFIG } from "@/constants/config/notification";
import QRCodeDisplay from "@/components/common/QRCode/QrCode";
import { isValidEVMWalletAddress, isValidSolWalletFormat } from "@/lib/utils";
import {
  safeParseUnits,
  formateAmountWithFixedDecimals,
  safeFormatNumber,
} from "@/utility/handy";

import { getWalletBalance, getWalletTokenBalance } from "@/lib/blockchain/balance";
import { ZeroAddress, formatUnits } from "ethers";
import ApiService from "@/service/api-service";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import { calculateWalletTokenAllocation } from "@/utility/orderUtility";

interface FundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: string;
  walletId?: string;
  chainId: number;
  isNative: boolean;
  tokenInfo: {
    address: string;
    decimals: number;
    name: string;
    symbol: string;
    imageUrl: string;
  };
  user: { account: string };
}

export default function FundingModal({
  isOpen,
  onClose,
  isNative,
  wallet,
  walletId,
  tokenInfo,
  chainId,
  user,
}: FundingModalProps) {
  const { withdrawBalance } = useUserAuth();
  const [mode, setMode] = useState<"deposit" | "withdraw" | "perp deposit">("deposit");
  const [amount, setAmount] = useState("");
  const [decimalsValue, setDecimalsvalue] = useState("0");
  const [receiverAddress, setReceiverAddress] = useState(user.account || "");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState('0');

  const [perpDex, setPerpDex] = useState<"asterdex" | "hyperliquid">("asterdex");
  const [quoteData, setQuoteData] = useState<any>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  
  const { userOrders } = useStore(useShallow((state: any) => ({
    userOrders: state.userOrders || []
  })));
  const [lockedBalance, setLockedBalance] = useState("0");


  const handleBalance = async () => {
    let bal = BigInt(0);

    if (isNative) {
      bal = await getWalletBalance({ walletAddress: wallet, chainId })
    } else {

      bal = await getWalletTokenBalance({ walletAddress: wallet, tokenAddress: tokenInfo.address, chainId })
    }
    setBalance(bal.toString())
  }

  useEffect(() => {
    if (wallet && tokenInfo.address) {
      handleBalance();
    }
  }, [tokenInfo, wallet, chainId])

  useEffect(() => {
    if (walletId && tokenInfo.address) {
       const locked = calculateWalletTokenAllocation({
         orders: userOrders,
         walletId: walletId,
         tokenAddress: tokenInfo.address
       });
       setLockedBalance(locked.toString());
    } else {
       setLockedBalance("0");
    }
  }, [walletId, tokenInfo.address, userOrders]);

  const availableBalance = (BigInt(balance) - BigInt(lockedBalance)) > BigInt(0) 
    ? (BigInt(balance) - BigInt(lockedBalance)).toString() 
    : "0";

  // Ensure Portal only runs on client-side to prevent hydration errors
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle decimal calculation
  useEffect(() => {
    if (tokenInfo.decimals && amount) {
      const decimalValue = safeParseUnits(amount, tokenInfo.decimals);
      setDecimalsvalue(decimalValue.toString());
    } else {
      setDecimalsvalue("0");
    }
  }, [tokenInfo, amount]);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(wallet);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy address");
    }
  };

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (BigInt(availableBalance) < BigInt(decimalsValue)) {
      toast.error("Insufficient available balance");
      return;
    }

    if (!isAddressValid()) {
      toast.error("Invalid receiver address");
      return;
    }

    setIsLoading(true); // Start loading
    try {
      let withdrawResult: any = await withdrawBalance({
        receiver: receiverAddress,
        walletAddress: wallet,
        tokenAddress: tokenInfo.address,
        chainId,
        value: decimalsValue,
        tokenSymbol: tokenInfo.symbol,
        tokenDecimals: tokenInfo.decimals,
      });

      if (withdrawResult?.success == true) {
        onClose();
        setAmount(""); // Reset form
      }
    } catch (err) {
      //console.error("Withdrawal error:", err);
      //toast.error("An unexpected error occurred during withdrawal");
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (mode === "perp deposit" && amount && parseFloat(amount) > 0) {
      if (!walletId) return;
      setIsQuoting(true);
      setQuoteError("");

      timeoutId = setTimeout(async () => {
        try {
          const res: any = await ApiService.quotePerpDeposit({
            walletId,
            tokenAddress: tokenInfo.address,
            amount: decimalsValue,
            chainId,
            dex: perpDex
          });
          if (res?.success) {
            setQuoteData(res);
          } else {
            setQuoteError(res?.message || res?.detail || "Quote failed.");
          }
        } catch (err: any) {
          setQuoteError("Quote error.");
        } finally {
          setIsQuoting(false);
        }
      }, 500);
    } else {
      setQuoteData(null);
      setQuoteError("");
    }
    return () => clearTimeout(timeoutId);
  }, [amount, perpDex, mode]);

  const handlePerpDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error("Invalid amount");
    if (!walletId) return toast.error("Wallet ID not found");

    if (BigInt(availableBalance) < BigInt(decimalsValue)) {
      return toast.error("Insufficient available balance");
    }

    setIsLoading(true);
    try {
      const res: any = await ApiService.perpDeposit({
        walletId,
        tokenAddress: tokenInfo.address,
        amount: decimalsValue,
        chainId,
        dex: perpDex
      });
      if (res?.success) {
        toast.success(res.message || "Deposit initiated");
        onClose();
        setAmount("");
      } else {
        toast.error(res?.message || res?.detail || "Deposit failed");
      }
    } catch (err: any) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const isSolana = chainId === chains.Solana;
  const themeGradient = isSolana
    ? "from-purple-600 to-fuchsia-500"
    : "from-blue-600 to-indigo-500";

  // Check validity: Returns true if valid, false if invalid
  const isAddressValid = useCallback(() => {
    if (!receiverAddress) return false;
    return isSolana
      ? isValidSolWalletFormat(receiverAddress)
      : isValidEVMWalletAddress(receiverAddress);
  }, [isSolana, receiverAddress]);

  // UI Helper: Returns true if we should show the red error border
  const shouldShowError = receiverAddress.length > 0 && !isAddressValid();

  // If not mounted yet (SSR), return null
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#0d1117] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-white">
                  <img src={tokenInfo.imageUrl} className="w-5 h-5 rounded-full" />
                  {/* {isSolana ? <SiSolana size={20} /> : <SiEthereum size={20} />} */}
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">
                    {mode === "deposit"
                      ? `Receive ${tokenInfo.symbol}`
                      : `Withdraw ${tokenInfo.symbol}`}
                  </h2>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">
                    {isSolana ? "Solana" : "Ethereum"} Network
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <FiX className="text-gray-500" size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* Mode Toggle */}
              <div className="flex p-1.5 bg-black/40 rounded-2xl mb-8 border border-white/5">
                {(["deposit", "withdraw", "perp deposit"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${mode === m
                      ? `bg-white/10 text-white ring-1 ring-white/20`
                      : "text-gray-500 hover:text-gray-300"
                      }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-3 text-[11px] font-mono font-medium">
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Locked:</span>
                  <span className="text-red-400">
                    {formateAmountWithFixedDecimals(lockedBalance, tokenInfo.decimals || 18, 4)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-500">Available:</span>
                  <span className="text-emerald-400 font-bold">
                    {formateAmountWithFixedDecimals(availableBalance, tokenInfo.decimals || 18, 4)}
                  </span>
                </div>
              </div>

              {mode === "perp deposit" ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPerpDex("asterdex")}
                      className={`flex-1 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${perpDex === "asterdex" ? "bg-purple-600 text-white" : "bg-white/5 text-gray-500"}`}
                    > Asterdex </button>
                    <button
                      onClick={() => setPerpDex("hyperliquid")}
                      className={`flex-1 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${perpDex === "hyperliquid" ? "bg-blue-600 text-white" : "bg-white/5 text-gray-500"}`}
                    > Hyperliquid </button>
                  </div>

                  {quoteData && quoteData.routeType !== "DIRECT_DEPOSIT" && (
                    <div className="flex items-start gap-2.5 bg-yellow-500/10 border border-yellow-500/25 rounded-2xl px-4 py-3">
                      <span className="text-base mt-0.5 shrink-0">⚠️</span>
                      <p className="text-[11px] text-yellow-300/90 font-semibold leading-relaxed">
                        {quoteData.message} <br />
                        <span className="opacity-80 break-all text-[9.5px]">Fees: {quoteData.fees} | Out: {formatUnits(quoteData.amountOut || "0", 6)} USDC</span>
                      </p>
                    </div>
                  )}

                  {quoteError && (
                    <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-3">
                      <span className="text-base mt-0.5 shrink-0">❌</span>
                      <p className="text-[11px] text-red-300/90 font-semibold leading-relaxed">
                        {quoteError}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="bg-blue-950/20 rounded-2xl border border-blue-500/20 focus-within:border-blue-400/50 p-4 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-blue-400/70 uppercase tracking-widest">
                          Amount
                        </label>
                        {!isNative && (
                          <button
                            onClick={() =>
                              setAmount(
                                formatUnits(BigInt(availableBalance), tokenInfo.decimals || 18)
                              )
                            }
                            className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-blue-500/20 hover:bg-blue-500/35 text-blue-300 border border-blue-500/30 rounded-md transition-all"
                          >
                            MAX
                          </button>
                        )}
                      </div>
                      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="bg-transparent outline-none text-2xl font-black text-white w-full" />
                    </div>
                  </div>

                  {isQuoting && <p className="text-[10px] text-gray-500 text-center animate-pulse py-1">Calculating optimal bridging route...</p>}

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading || isQuoting || quoteError.length > 0}
                    onClick={handlePerpDeposit}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all bg-gradient-to-r from-blue-600 to-indigo-500 ${(isLoading || isQuoting || quoteError) ? "opacity-70 cursor-not-allowed" : "hover:shadow-lg hover:shadow-blue-500/25"}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isLoading ? <FiRefreshCw className="animate-spin" size={18} /> : (quoteData?.routeType === "DIRECT_DEPOSIT" ? "Confirm Deposit" : "Bridge & Deposit")}
                    </div>
                  </motion.button>
                </div>
              ) : mode === "deposit" ? (
                <div className="space-y-6">
                  <div className="relative bg-[#161b22] border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-4">
                    <div className="bg-white p-2 rounded-xl">
                      <div className="w-32 h-32 bg-gray-200 flex items-center justify-center text-black font-bold text-[10px] text-center p-4">
                        <QRCodeDisplay value={wallet} size={128} />
                      </div>
                    </div>
                    <div className="w-full space-y-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Bot Deposit Address
                      </span>
                      <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                        <span className="flex-1 font-mono text-[11px] text-blue-400 truncate">
                          {wallet}
                        </span>
                        <button
                          onClick={handleCopyAddress}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                        >
                          {copied ? (
                            <FiCheck className="text-emerald-500" />
                          ) : (
                            <FiCopy className="text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-center text-gray-500 px-4">
                    Only send {tokenInfo.symbol} assets to this address.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Risk Warning */}
                  <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-3">
                    <span className="text-base mt-0.5 shrink-0">⚠️</span>
                    <p className="text-[11px] text-red-300/90 font-semibold leading-relaxed">
                      Withdrawing assets might cancel active orders.{" "}
                      <span className="text-red-400 font-black">Withdraw at your own risk.</span>
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Amount input */}
                    <div
                      className={`bg-red-950/20 rounded-2xl border ${safeFormatNumber(balance, tokenInfo.decimals || 18, 4) < amount
                        ? "border-red-500"
                        : "border-red-500/20 focus-within:border-red-400/50"
                        } p-4 transition-all`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-red-400/70 uppercase tracking-widest">
                          Amount
                        </label>
                        {!isNative && (
                          <button
                            onClick={() =>
                              setAmount(
                                formatUnits(BigInt(availableBalance), tokenInfo.decimals || 18)
                              )
                            }
                            className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-red-500/20 hover:bg-red-500/35 text-red-300 border border-red-500/30 rounded-md transition-all"
                          >
                            MAX
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-transparent outline-none text-2xl font-black text-white w-full"
                      />
                    </div>

                    {/* Receiver address */}
                    <div
                      className={`bg-red-950/20 rounded-2xl border ${shouldShowError ? "border-red-500/50" : "border-red-500/20 focus-within:border-red-400/50"
                        } p-4 transition-all`}
                    >
                      <label className="text-[10px] font-bold text-red-400/70 uppercase tracking-widest block mb-1">
                        Receiver Address
                      </label>
                      <div className="flex items-center gap-2">
                        <FiUser
                          className={shouldShowError ? "text-red-500" : "text-red-400/50"}
                        />
                        <input
                          type="text"
                          value={receiverAddress}
                          onChange={(e) => setReceiverAddress(e.target.value)}
                          placeholder="Enter destination address"
                          className="bg-transparent outline-none text-sm font-mono text-white w-full placeholder-white/20"
                        />
                      </div>
                    </div>

                    {shouldShowError && (
                      <p className="text-[10px] text-red-500 font-bold px-2">
                        Invalid {isSolana ? "Solana" : "EVM"} address format
                      </p>
                    )}
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    disabled={isLoading}
                    onClick={handleWithdraw}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all bg-gradient-to-r from-red-600 to-rose-500 ${isLoading
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:shadow-lg hover:shadow-red-500/25"
                      }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isLoading ? (
                        <FiRefreshCw className="animate-spin" size={18} />
                      ) : (
                        "Confirm Withdrawal"
                      )}
                    </div>
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}