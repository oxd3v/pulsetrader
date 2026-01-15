import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion";
import { WalletConfig, } from "@/type/common";
import { ORDER_TYPE } from "@/type/order";

// UI Icons
import { RiArrowDropDownLine } from 'react-icons/ri'
import { FiCopy, FiArrowDownLeft, FiArrowUpRight, FiKey, FiMoreHorizontal } from 'react-icons/fi'
import { IoWallet } from "react-icons/io5";
import toast from "react-hot-toast"

// Libs & Mock
import { formateAmountWithFixedDecimals } from "@/utility/handy";
import { PRECISION_DECIMALS } from "@/constants/common/utils";
import RenderWalletFundModal from "@/components/walletManager/modal/fundingModal"

interface WalletOverviewProps {
  userOrders: ORDER_TYPE[],
  selectedWallet: WalletConfig,
  availableWallets: WalletConfig[], // New Prop
  onSelectWallet: (wallet: WalletConfig) => void, // New Prop
  chainId: number,
  user: any
}

export default function WalletOverview({ 
    userOrders, 
    selectedWallet, 
    availableWallets, 
    onSelectWallet,
    chainId, 
    user 
}: WalletOverviewProps) {
  
  // State
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [fundingMode, setFundingMode] = useState<'deposit'|'withdraw'>('deposit');
  
  // Mock Data Placeholders (Connect these to your real fetch logic)
  const [balanceData, setBalanceData] = useState({
    totalUsd: '12450.32',
    native: '4.2',
    spotUsd: '8200.50',
    perpUsd: '1420.00'
  });

  // Mock Fetch Effect
  useEffect(() => {
    // In real app: fetchWalletPortfolioValue(selectedWallet.address)
    // Simulate loading/change
    setBalanceData(prev => ({...prev, totalUsd: (Math.random() * 10000).toFixed(2) }));
  }, [selectedWallet]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
        
        {/* 1. Wallet Selection & Info Card */}
        <div className="bg-white dark:bg-[#12141a] p-6 rounded-[24px] border border-white/5 relative group">
            {/* Dropdown Header */}
            <div className="relative mb-6 z-20">
                <button 
                    onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
                    className="w-full flex justify-between items-center text-gray-300 hover:text-white transition-colors"
                >
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-500">Selected Wallet</span>
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                        <span className="text-xs font-mono">{availableWallets.length} Available</span>
                        <RiArrowDropDownLine size={20} className={`transform transition-transform ${isWalletDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                    {isWalletDropdownOpen && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-8 left-0 w-full bg-[#1a1d26] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-[200px] overflow-y-auto custom-scrollbar"
                        >
                            {availableWallets.map(wallet => (
                                <button
                                    key={wallet._id}
                                    onClick={() => {
                                        onSelectWallet(wallet);
                                        setIsWalletDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 border-b border-white/5 last:border-0 flex items-center gap-3 ${selectedWallet._id === wallet._id ? 'bg-blue-500/10 text-blue-400' : 'text-gray-300'}`}
                                >
                                    <IoWallet />
                                    <div className="flex-1 truncate">
                                        <div className="font-bold">Wallet {wallet._id.slice(0,4)}</div>
                                        <div className="text-[10px] font-mono opacity-60 truncate">{wallet.address}</div>
                                    </div>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Active Wallet Display */}
            <div className="flex items-center gap-4 mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg ${selectedWallet.network === 'SVM' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'}`}>
                    <IoWallet className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-black dark:text-white truncate">
                        Main Account
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 font-mono truncate">
                            {selectedWallet.address.slice(0, 6)}...{selectedWallet.address.slice(-4)}
                        </span>
                        <button 
                            onClick={() => {navigator.clipboard.writeText(selectedWallet.address); toast.success("Copied")}}
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
                    onClick={() => { setFundingMode('deposit'); setIsFundingModalOpen(true); }}
                    className="flex-1 flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black dark:hover:bg-gray-200 hover:bg-gray-800 px-4 py-3 rounded-xl font-bold transition-all active:scale-95"
                >
                    <FiArrowDownLeft /> Deposit
                </button>
                <button
                    onClick={() => { setFundingMode('withdraw'); setIsFundingModalOpen(true); }}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 dark:hover:bg-white/10 hover:bg-dark/10 text-black dark:text-white border border-black/10 dark:border-white/10 px-4 py-3 rounded-xl font-bold transition-all active:scale-95"
                >
                    <FiArrowUpRight /> Withdraw
                </button>
            </div>
        </div>

        {/* 2. Balance Breakdown Card */}
        <div className="md:col-span-2 bg-white dark:bg-[#12141a] p-6 rounded-[24px] border border-white/5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
                <div>
                    <h4 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Balance</h4>
                    <div className="text-4xl font-black text-black dark:text-white tracking-tight">
                        ${balanceData.totalUsd}
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${selectedWallet.network === 'SVM' ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' : 'border-blue-500/30 text-blue-400 bg-blue-500/10'}`}>
                    {selectedWallet.network === 'SVM' ? 'Solana' : 'Ethereum'}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8">
                {/* Stat 1 */}
                <div className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-white/5">
                    <div className="text-xs text-gray-900 dark:text-gray-500  mb-1">Native Token</div>
                    <div className="text-lg font-bold text-black dark:text-white">{balanceData.native}</div>
                </div>
                {/* Stat 2 */}
                <div className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-white/5">
                    <div className="text-xs text-gray-500 mb-1">Spot Value</div>
                    <div className="text-lg font-bold text-emerald-400">${balanceData.spotUsd}</div>
                </div>
                {/* Stat 3 */}
                <div className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-white/5">
                    <div className="text-xs text-gray-500 mb-1">Perps Value</div>
                    <div className="text-lg font-bold text-blue-400">${balanceData.perpUsd}</div>
                </div>
            </div>
        </div>
      </div>

      {/* Funding Modal Triggered from here if needed, or pass state up */}
      {isFundingModalOpen && (
        <RenderWalletFundModal
          isOpen={isFundingModalOpen}
          onClose={() => setIsFundingModalOpen(false)}
          isNative={true}
          wallet={selectedWallet.address}
          chainId={chainId}
          user={user}
          // Pass dummy token info, real app should derive from chainId
          tokenInfo={{
            address: '0x0',
            name: selectedWallet.network === 'SVM' ? 'Solana' : 'Ethereum',
            symbol: selectedWallet.network === 'SVM' ? 'SOL' : 'ETH',
            decimals: selectedWallet.network === 'SVM' ? 9 : 18,
            imageUrl: ''
          }}
        />
      )}
    </div>
  )
}