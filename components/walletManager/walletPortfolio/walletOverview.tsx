import { useState, useEffect, useCallback } from "react";
import { WalletConfig } from "@/type/common";

// UI Icons
import { FiCopy, FiArrowDownLeft, FiArrowUpRight } from "react-icons/fi";
import { IoWallet } from "react-icons/io5";
import toast from "react-hot-toast";
import { chainConfig } from "@/constants/common/chain";
import { formateNumber, safeFormatNumber } from "@/utility/handy";

// Libs & Mock
import RenderWalletFundModal from "@/components/walletManager/modal/fundingModal";
import { PRECISION_DECIMALS } from "@/constants/common/utils";
import { ZeroAddress } from "ethers";
import { getWalletBalance } from "@/lib/blockchain/balance";

interface WalletOverviewProps {
  selectedWallet: WalletConfig;
  chainId: number;
  balanceData: any;
  user: any;
}

export default function WalletOverview({
  selectedWallet,
  balanceData,
  chainId,
  user,
}: WalletOverviewProps) {
  // State
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [fundingMode, setFundingMode] = useState<"deposit" | "withdraw">("deposit");
  const [nativeBalance, setNativeBalance] = useState(balanceData.nativeBalance);
  const [isUpdatingNativeBalance, setIsUpdatingNativeBalance] = useState(false);

  const handleBalance = useCallback(async () => {
    if (!selectedWallet?.address) return;
    
    setIsUpdatingNativeBalance(true);
    try {
      const bal = await getWalletBalance({
        walletAddress: selectedWallet.address,
        chainId,
      });
      setNativeBalance(bal.toString());
    } catch (err) {
      console.error("Failed to fetch native balance:", err);
    } finally {
      setIsUpdatingNativeBalance(false);
    }
  }, [selectedWallet?.address, chainId]);

  const handleCloseFundingModal = useCallback(() => {
    setIsFundingModalOpen(false);
    // Refresh native balance after modal closes
    handleBalance();
  }, [handleBalance]);

  // Update native balance when props change
  useEffect(() => {
    setNativeBalance(balanceData.nativeBalance);
  }, [balanceData.nativeBalance]);

  // Refresh balance when wallet or chain changes
  useEffect(() => {
    if (selectedWallet?.address) {
      handleBalance();
    }
  }, [selectedWallet?.address, chainId, handleBalance]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
        {/* 1. Wallet Selection & Info Card */}
        <div className="bg-white dark:bg-[#12141a] p-6 rounded-[24px] border border-white/5 relative group">
          {/* Active Wallet Display */}
          <div className="flex items-center gap-4 mb-8">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg ${selectedWallet.network === "SVM" ? "bg-gradient-to-br from-purple-500 to-indigo-600" : "bg-gradient-to-br from-blue-500 to-cyan-600"}`}
            >
              <IoWallet className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-black dark:text-white truncate">
                Main Account
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 font-mono truncate">
                  {selectedWallet.address.slice(0, 6)}...
                  {selectedWallet.address.slice(-4)}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedWallet.address);
                    toast.success("Address copied");
                  }}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors"
                >
                  <FiCopy size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setFundingMode("deposit");
                setIsFundingModalOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black dark:hover:bg-gray-200 hover:bg-gray-800 px-4 py-3 rounded-xl font-bold transition-all active:scale-95"
            >
              <FiArrowDownLeft />{" "}
              <span className=" lg:hidden xl:block">Deposit</span>
            </button>
            <button
              onClick={() => {
                setFundingMode("withdraw");
                setIsFundingModalOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-white/5 dark:hover:bg-white/10 hover:bg-dark/10 text-black dark:text-white border border-black/10 dark:border-white/10 px-4 py-3 rounded-xl font-bold transition-all active:scale-95"
            >
              <FiArrowUpRight />{" "}
              <span className=" lg:hidden xl:block">Withdraw</span>
            </button>
          </div>
        </div>

        {/* 2. Balance Breakdown Card */}
        <div className="md:col-span-2 bg-white dark:bg-[#12141a] p-6 rounded-[24px] border border-white/5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                Native Balance
              </h4>
              <div className="flex gap-3 items-center">
                <div className="text-4xl font-black text-black dark:text-white tracking-tight">
                  {formateNumber(
                    Number(
                      safeFormatNumber(
                        nativeBalance,
                        chainConfig[chainId].nativeToken.decimals,
                        5,
                      ),
                    ),
                    4,
                  )}
                  {isUpdatingNativeBalance && (
                    <span className="inline-block ml-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  )}
                </div>
                <img
                  src={chainConfig[chainId].imageUrl}
                  className="w-6 h-6 rounded-full"
                  alt={`${chainConfig[chainId].name} logo`}
                />
              </div>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-bold border ${selectedWallet.network === "SVM" ? "border-purple-500/30 text-purple-400 bg-purple-500/10" : "border-blue-500/30 text-blue-400 bg-blue-500/10"}`}
            >
              {selectedWallet.network === "SVM" ? "Solana" : "Ethereum"}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-8">
            {/* Stat 1 */}
            <div className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-white/5">
              <div className="text-xs text-gray-900 dark:text-gray-500  mb-1">
                Portfolio
              </div>
              <div className="text-lg font-bold text-black dark:text-white">
                $
                {formateNumber(
                  Number(
                    safeFormatNumber(
                      (
                        BigInt(balanceData.totalSpotUsd || "0") +
                        BigInt(balanceData.totalPerpUsd || "0")
                      ).toString(),
                      PRECISION_DECIMALS,
                      4,
                    ),
                  ),
                  4,
                )}
              </div>
            </div>
            {/* Stat 2 */}
            <div className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-white/5">
              <div className="text-xs text-gray-500 mb-1">Spot Value</div>
              <div className="text-lg font-bold text-emerald-400">
                $
                {formateNumber(
                  Number(
                    safeFormatNumber(
                      BigInt(balanceData.totalSpotUsd || "0").toString(),
                      PRECISION_DECIMALS,
                      4,
                    ),
                  ),
                  4,
                )}
              </div>
            </div>
            {/* Stat 3 */}
            <div className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-white/5">
              <div className="text-xs text-gray-500 mb-1">Perps Value</div>
              <div className="text-lg font-bold text-blue-400">
                $
                {formateNumber(
                  Number(
                    safeFormatNumber(
                      BigInt(balanceData.totalPerpUsd || "0").toString(),
                      PRECISION_DECIMALS,
                      4,
                    ),
                  ),
                  4,
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Funding Modal Triggered from here if needed, or pass state up */}
      {isFundingModalOpen && (
        <RenderWalletFundModal
          isOpen={isFundingModalOpen}
          onClose={handleCloseFundingModal}
          isNative={true}
          wallet={selectedWallet.address}
          chainId={chainId}
          user={user}
          // Pass dummy token info, real app should derive from chainId
          tokenInfo={{
            address: ZeroAddress,
            name: selectedWallet.network === "SVM" ? "Solana" : "Ethereum",
            symbol: selectedWallet.network === "SVM" ? "SOL" : "ETH",
            decimals: selectedWallet.network === "SVM" ? 9 : 18,
            imageUrl: "",
          }}
        />
      )}
    </div>
  );
}