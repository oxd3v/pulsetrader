import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiCopy, FiCheck, FiRefreshCw } from "react-icons/fi";
import toast from "react-hot-toast";
import { ZeroAddress, formatUnits } from "ethers";

import { WalletConfig } from "@/type/common";
import { OrderTokenType } from "@/type/order";
import { getWalletBalance, getWalletTokenBalance } from "@/lib/blockchain/balance";
import {
  formateAmountWithFixedDecimals,
  safeParseUnits,
} from "@/utility/handy";

interface PerpAccountDepositProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletConfig | null;
  chainId: number;
  protocol: string;
  collateralToken: OrderTokenType;
  perpBalance?: bigint;
  onDeposit?: (params: {
    wallet: WalletConfig;
    amount: string;
    amountInBaseUnits: string;
    protocol: string;
    chainId: number;
    collateralToken: OrderTokenType;
  }) => Promise<void> | void;
}

export default function PerpAccountDeposit({
  isOpen,
  onClose,
  wallet,
  chainId,
  protocol,
  collateralToken,
  perpBalance,
  onDeposit,
}: PerpAccountDepositProps) {
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState("");
  const [walletBalance, setWalletBalance] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const canDeposit = Boolean(onDeposit);

  const isNative = collateralToken.address === ZeroAddress;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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

  const fetchWalletBalance = useCallback(async () => {
    if (!wallet || !onDeposit) return;
    try {
      const balance = isNative
        ? await getWalletBalance({ walletAddress: wallet.address, chainId })
        : await getWalletTokenBalance({
            walletAddress: wallet.address,
            tokenAddress: collateralToken.address,
            chainId,
          });
      setWalletBalance(
        typeof balance === "bigint" ? balance : BigInt(balance),
      );
    } catch (error) {
      setWalletBalance(BigInt(0));
    }
  }, [wallet, chainId, collateralToken.address, isNative]);

  useEffect(() => {
    if (isOpen && wallet) {
      fetchWalletBalance();
    }
  }, [isOpen, wallet, fetchWalletBalance]);

  const handleCopy = useCallback(async () => {
    if (!wallet) return;
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy address");
    }
  }, [wallet]);

  const handleDeposit = useCallback(async () => {
    if (!wallet || !onDeposit) return;
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    let parsedAmount: bigint;
    try {
      parsedAmount = safeParseUnits(amount, collateralToken.decimals);
    } catch (error) {
      toast.error("Invalid amount format");
      return;
    }

    if (parsedAmount > walletBalance) {
      toast.error("Insufficient wallet balance");
      return;
    }

    setIsLoading(true);
    try {
      await onDeposit({
        wallet,
        amount,
        amountInBaseUnits: parsedAmount.toString(),
        protocol,
        chainId,
        collateralToken,
      });
      toast.success("Deposit request submitted");
      onClose();
      setAmount("");
    } catch (error) {
      toast.error("Deposit request failed");
    } finally {
      setIsLoading(false);
    }
  }, [
    wallet,
    amount,
    walletBalance,
    collateralToken,
    protocol,
    chainId,
    onDeposit,
    onClose,
  ]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && wallet && (
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#0d1117] border border-white/10 rounded-[28px] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 text-white">
                  <img
                    src={collateralToken.imageUrl}
                    className="w-5 h-5 rounded-full"
                    alt={collateralToken.symbol}
                  />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">
                    Deposit to {protocol.toUpperCase()} Perp
                  </h2>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">
                    {collateralToken.symbol} collateral
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

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Wallet Address
                </span>
                <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                  <span className="flex-1 font-mono text-[11px] text-blue-400 truncate">
                    {wallet.address}
                  </span>
                  <button
                    onClick={handleCopy}
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

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#161b22] border border-white/10 rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Wallet Balance
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {formateAmountWithFixedDecimals(
                      walletBalance,
                      collateralToken.decimals,
                      4,
                    )}{" "}
                    {collateralToken.symbol}
                  </div>
                </div>
                <div className="bg-[#161b22] border border-white/10 rounded-2xl p-4">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Perp Balance
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {formateAmountWithFixedDecimals(
                      perpBalance ?? BigInt(0),
                      collateralToken.decimals,
                      4,
                    )}{" "}
                    {collateralToken.symbol}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    Deposit Amount
                  </label>
                  <button
                    onClick={() =>
                      setAmount(
                        formatUnits(walletBalance, collateralToken.decimals),
                      )
                    }
                    className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-md transition-all"
                  >
                    MAX
                  </button>
                </div>
                <div className="bg-black/40 rounded-2xl border border-white/10 p-4 transition-all">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-transparent outline-none text-2xl font-black text-white w-full"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <button
                    onClick={fetchWalletBalance}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    <FiRefreshCw className="w-3 h-3" />
                    Refresh balance
                  </button>
                  <span className="font-mono">
                    Available:{" "}
                    {formateAmountWithFixedDecimals(
                      walletBalance,
                      collateralToken.decimals,
                      4,
                    )}{" "}
                    {collateralToken.symbol}
                  </span>
                </div>
              </div>

              {!canDeposit && (
                <div className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                  Deposit action is not wired yet. Provide an onDeposit handler
                  to enable this flow.
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={isLoading || !canDeposit}
                onClick={handleDeposit}
                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all bg-gradient-to-r from-emerald-600 to-teal-500 ${
                  isLoading || !canDeposit
                    ? "opacity-70 cursor-not-allowed"
                    : "hover:shadow-lg hover:shadow-emerald-500/25"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {isLoading ? (
                    <FiRefreshCw className="animate-spin" size={18} />
                  ) : (
                    "Confirm Deposit"
                  )}
                </div>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
