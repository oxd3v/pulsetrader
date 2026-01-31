'use client';
import { useState } from 'react';
import { useUserAuth } from "@/hooks/useAuth";
import { toast } from 'react-hot-toast';
// Using React Icons
import { RiWallet3Line, RiCloseLine, RiShieldKeyholeLine } from 'react-icons/ri';
import { IoAddOutline, IoRemoveOutline } from 'react-icons/io5';
import { CgSpinner } from 'react-icons/cg';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CreateWalletModal({ isOpen, onClose }: ModalProps) {
    const { createNewWallet } = useUserAuth();
    const [evmWalletCount, setEvmWalletCount] = useState(1);
    const [svmWalletCount, setSvmWalletCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleCreateWallet = async () => {
        if (evmWalletCount === 0 && svmWalletCount === 0) {
            return toast.error('Select at least one wallet type.');
        }

        setIsLoading(true);
        try {
            const result = await createNewWallet({ 
                evmWallets: evmWalletCount, 
                svmWallets: svmWalletCount 
            });

            if (result.creation === true) {
                toast.success('Wallets generated successfully!');
                onClose(); // Close modal on success
            } else {
                toast.error(result.message || 'Generation failed');
            }
        } catch (error) {
            toast.error('Connection error');
        } finally {
            setIsLoading(false);
        }
    };

    const CounterRow = ({ label, sub, count, setCount }: any) => (
        <div className="flex items-center justify-between p-3 sm:p-4 bg-white/5 border border-white/10 rounded-2xl">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                    <RiShieldKeyholeLine size={20} />
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-100">{label}</p>
                    <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-tighter">{sub}</p>
                </div>
            </div>
            <div className="flex items-center gap-3 bg-black/40 p-1 rounded-xl border border-white/5">
                <button 
                    onClick={() => setCount(Math.max(0, count - 1))}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
                >
                    <IoRemoveOutline size={18} />
                </button>
                <span className="text-sm font-mono font-bold w-5 text-center">{count}</span>
                <button 
                    onClick={() => setCount(count + 1)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                >
                    <IoAddOutline size={18} />
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop Blur/Overlay */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300" 
                onClick={onClose} 
            />

            {/* Modal Container */}
            <div className="relative w-full max-w-md bg-[#0f111a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="relative p-6 pb-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl">
                            <RiWallet3Line size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Generate Wallets</h2>
                            <p className="text-xs text-gray-500">Secure Vault Generation</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full text-gray-500 transition-colors"
                    >
                        <RiCloseLine size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="space-y-3">
                        <CounterRow 
                            label="EVM Network" 
                            sub="ETH, BSC, BASE, POLY" 
                            count={evmWalletCount} 
                            setCount={setEvmWalletCount} 
                        />
                        <CounterRow 
                            label="SVM Network" 
                            sub="SOLANA MAINNET" 
                            count={svmWalletCount} 
                            setCount={setSvmWalletCount} 
                        />
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-xl">
                        <p className="text-[11px] text-blue-300/80 leading-relaxed text-center italic">
                            All private keys are encrypted on-device before being saved to your secure vault.
                        </p>
                    </div>

                    <button
                        onClick={handleCreateWallet}
                        disabled={isLoading || (evmWalletCount === 0 && svmWalletCount === 0)}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10"
                    >
                        {isLoading ? (
                            <CgSpinner className="animate-spin" size={20} />
                        ) : (
                            "Confirm & Generate"
                        )}
                    </button>
                </div>

                {/* Footer */}
                <div className="bg-black/20 p-4 border-t border-white/5 flex justify-center">
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                        End-to-End Encrypted
                    </p>
                </div>
            </div>
        </div>
    );
}