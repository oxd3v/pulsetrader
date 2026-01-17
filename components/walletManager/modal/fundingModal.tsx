import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // Import Portal
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiX, FiRefreshCw, FiCopy, FiCheck, FiUser 
} from 'react-icons/fi';
import { SiSolana, SiEthereum } from 'react-icons/si';
import toast from "react-hot-toast";
import QRCodeDisplay from '@/components/common/QRCode/QrCode';

interface FundingModalProps {
    isOpen: boolean;
    onClose: () => void;
    wallet: string; 
    chainId: number;
    isNative: boolean;
    tokenInfo: { address: string, decimals: number, name: string, symbol: string, imageUrl: string };
    user: { account: string }; 
    networkType?: 'EVM' | 'SVM';
}

export default function FundingModal({ 
    isOpen, onClose, wallet, tokenInfo, networkType = 'EVM', user 
}: FundingModalProps) {
    const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
    const [amount, setAmount] = useState('');
    const [receiverAddress, setReceiverAddress] = useState(user.account || '');
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const isSolana = networkType === 'SVM';
    const themeGradient = isSolana ? "from-purple-600 to-fuchsia-500" : "from-blue-600 to-indigo-500";

    const handleCopy = () => {
        navigator.clipboard.writeText(wallet);
        setCopied(true);
        toast.success("Address copied");
        setTimeout(() => setCopied(false), 2000);
    };

    // Use Portal to render at the top level of the DOM
    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
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
                                        {mode === 'deposit' ? `Receive ${tokenInfo.symbol}` : `Withdraw ${tokenInfo.symbol}`}
                                    </h2>
                                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">
                                        {isSolana ? 'Solana' : 'Ethereum'} Network
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                                <FiX className="text-gray-500" size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Mode Toggle */}
                            <div className="flex p-1.5 bg-black/40 rounded-2xl mb-8 border border-white/5">
                                {(['deposit', 'withdraw'] as const).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMode(m)}
                                        className={`flex-1 py-3 text-xs font-black rounded-xl transition-all uppercase tracking-widest ${
                                            mode === m ? `bg-white/10 text-white ring-1 ring-white/20` : "text-gray-500 hover:text-gray-300"
                                        }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>

                            {mode === 'deposit' ? (
                                <div className="space-y-6">
                                    <div className="relative bg-[#161b22] border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-4">
                                        <div className="bg-white p-2 rounded-xl">
                                            <div className="w-32 h-32 bg-gray-200 flex items-center justify-center text-black font-bold text-[10px] text-center p-4">
                                                <QRCodeDisplay value={wallet} size={128}/>
                                            </div>
                                        </div>
                                        <div className="w-full space-y-2">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Bot Deposit Address</span>
                                            <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                                                <span className="flex-1 font-mono text-[11px] text-blue-400 truncate">{wallet}</span>
                                                <button onClick={handleCopy} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all">
                                                    {copied ? <FiCheck className="text-emerald-500" /> : <FiCopy className="text-gray-400" />}
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
                                        <div className="bg-[#161b22] rounded-2xl border border-white/5 p-4 focus-within:border-blue-500/50 transition-all">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Amount</label>
                                            <input 
                                                type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                                                placeholder="0.00" className="bg-transparent outline-none text-2xl font-black text-white w-full"
                                            />
                                        </div>
                                        <div className="bg-[#161b22] rounded-2xl border border-white/5 p-4 focus-within:border-blue-500/50 transition-all">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Receiver Address</label>
                                            <div className="flex items-center gap-2">
                                                <FiUser className="text-gray-500" />
                                                <input 
                                                    type="text" value={receiverAddress} onChange={(e) => setReceiverAddress(e.target.value)}
                                                    placeholder="Enter destination address" className="bg-transparent outline-none text-sm font-mono text-white w-full"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        disabled={isLoading}
                                        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all bg-gradient-to-r ${themeGradient}`}
                                    >
                                        {isLoading ? <FiRefreshCw className="animate-spin" size={18} /> : 'Confirm Withdrawal'}
                                    </motion.button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body // Appends the modal to <body>
    );
}