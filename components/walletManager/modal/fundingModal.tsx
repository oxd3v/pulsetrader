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
import { ZeroAddress } from "ethers";

interface FundingModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: string;
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
  tokenInfo,
  chainId,
  user,
}: FundingModalProps) {
  const { withdrawBalance } = useUserAuth();
  const [mode, setMode] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [decimalsValue, setDecimalsvalue] = useState("0");
  const [receiverAddress, setReceiverAddress] = useState(user.account || "");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState('0');

  const handleBalance = async ()=>{
    let bal = BigInt(0);
    
    if(isNative){
      bal = await getWalletBalance({walletAddress:wallet, chainId})
    }else{
      
      bal = await getWalletTokenBalance({walletAddress: wallet, tokenAddress: tokenInfo.address, chainId})
    }
    setBalance(bal.toString())
  }

  useEffect(()=>{
    console.log(wallet, tokenInfo, chainId)
    if(wallet && tokenInfo.address){
      handleBalance();
    }
  },[tokenInfo, wallet, chainId])

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

    if (BigInt(balance) < BigInt(decimalsValue)) {
      toast.error("Insufficient balance");
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

      if (withdrawResult?.success === false) {
        // Handle explicit failure
        const type = withdrawResult.type || "DEFAULT_ERROR";
        const tMessage =
          NOTIFICATION_CONFIG[type]?.message || "Withdrawal failed";
        toast.error(tMessage);
      } else {
        // Handle success
        toast.success(`Successfully withdrew ${amount} ${tokenInfo.symbol}`);
        onClose();
        setAmount(""); // Reset form
      }
    } catch (err) {
      console.error("Withdrawal error:", err);
      toast.error("An unexpected error occurred during withdrawal");
    } finally {
      setIsLoading(false); // Stop loading
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
                  {isSolana ? <SiSolana size={20} /> : <SiEthereum size={20} />}
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
                {(["deposit", "withdraw"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${
                      mode === m
                        ? `bg-white/10 text-white ring-1 ring-white/20`
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div className="flex justify-end text-xs font-mono font-medium">
                <span className="text-gray-400 mr-2">Available:</span>
                <span className="text-white">
                  {formateAmountWithFixedDecimals(
                    balance,
                    tokenInfo.decimals || 18,
                    4,
                  )}
                </span>
              </div>

              {mode === "deposit" ? (
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
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className={`bg-[#161b22] rounded-2xl border ${safeFormatNumber(balance, tokenInfo.decimals || 18, 4) < amount ? 'border-red-500' : 'border-white/5 focus-within:border-blue-500/50'}  p-4  transition-all`}>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="bg-transparent outline-none text-2xl font-black text-white w-full"
                      />
                    </div>
                    <div
                      className={`bg-[#161b22] rounded-2xl border ${
                        shouldShowError ? "border-red-500/50" : "border-white/5"
                      } p-4 focus-within:border-blue-500/50 transition-all`}
                    >
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
                        Receiver Address
                      </label>
                      <div className="flex items-center gap-2">
                        <FiUser
                          className={
                            shouldShowError ? "text-red-500" : "text-gray-500"
                          }
                        />
                        <input
                          type="text"
                          value={receiverAddress}
                          onChange={(e) => setReceiverAddress(e.target.value)}
                          placeholder="Enter destination address"
                          className="bg-transparent outline-none text-sm font-mono text-white w-full"
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
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all bg-gradient-to-r ${themeGradient} ${
                      isLoading
                        ? "opacity-70 cursor-not-allowed"
                        : "hover:shadow-lg hover:shadow-purple-500/20"
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
