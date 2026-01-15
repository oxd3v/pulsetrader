'use client';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiPieChart, 
    FiShield, 
    FiActivity, 
    FiCreditCard, 
    FiPlus, 
    FiSettings,
    FiGlobe,
    FiCopy,
    FiCheck
} from 'react-icons/fi';
import { chains } from '@/constants/common/chain';
import toast from 'react-hot-toast';

// Types
import { ORDER_TYPE } from '@/type/order';
import { ACTIVITY_TYPE, WalletConfig } from '@/type/common';

// Components
import WalletOverview from './walletOverview';
import MyTokenPortfolio from '@/components/Token/RenderTokenList';
import FundingModal from '@/components/walletManager/modal/fundingModal';
//import RenderWalletAnalytics from "./RenderWalletAnalytics";
import PortfolioSecurity from "./PortfolioSecurity"; 

// Props
interface PortfolioMainProps {
    user: any;
    chainId: number;
    userOrders: ORDER_TYPE[];
    userWallets: WalletConfig[];
    userHistories: ACTIVITY_TYPE[];
    userConnectedWallet: any;
}

export default function PortfolioMain({ 
    user, 
    chainId, 
    userOrders, 
    userWallets, 
    userHistories, 
    userConnectedWallet 
}: PortfolioMainProps) {
    // --- State ---
    const [activeTab, setActiveTab] = useState<'overview' | 'holdings' | 'analytics' | 'security'>('overview');
    const [isFundingOpen, setIsFundingOpen] = useState(false);
    
    
    // Wallet State
    const [selectedWallet, setSelectedWallet] = useState<WalletConfig | null>(null);

    // --- Logic ---
    
    // 1. Filter Wallets based on Active Network Type
    const filteredWallets = useMemo(() => {
        return userWallets.filter(w => chainId == chains.Solana ?  w.network === 'SVM' : w.network == 'EVM');
    }, [userWallets, chainId]);

    // 2. Auto-select first wallet when network changes or wallets load
    useEffect(() => {
        if (filteredWallets.length > 0) {
            // Keep current if valid, else pick first
            const exists = filteredWallets.find(w => w._id === selectedWallet?._id);
            if (!exists) setSelectedWallet(filteredWallets[0]);
        } else {
            setSelectedWallet(null);
        }
    }, [filteredWallets, chainId]);

    // Copy Handler
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Address copied!");
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FiPieChart },
        { id: 'holdings', label: 'Holdings', icon: FiCreditCard },
        { id: 'analytics', label: 'Analytics', icon: FiActivity },
        { id: 'security', label: 'Security', icon: FiShield },
    ] as const;

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-[#08090a] text-white p-4 lg:p-8 font-sans selection:bg-blue-500/30">
            {/* Header Section */}
            <header className="max-w-7xl mx-auto mb-8 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Live Portfolio</span>
                        
                        {/* Network Switcher Pill */}
                        {/* <div className="ml-4 flex items-center bg-white/5 rounded-full p-1 border border-white/10">
                            <button 
                                onClick={() => setActiveNetworkType('EVM')}
                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${activeNetworkType === 'EVM' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <SiEthereum /> EVM
                            </button>
                            <button 
                                onClick={() => setActiveNetworkType('SVM')}
                                className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold transition-all ${activeNetworkType === 'SVM' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <SiSolana /> Solana
                            </button>
                        </div> */}
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r dark:from-white from-black via-gray-200  to-gray-500 bg-clip-text text-transparent">
                        {selectedWallet ? `Wallet ${selectedWallet._id.slice(0,4)}` : 'No Wallet Selected'}
                    </h1>
                    
                    {selectedWallet && (
                        <div 
                            onClick={() => handleCopy(selectedWallet.address)}
                            className="group flex items-center gap-2 mt-2 w-fit cursor-pointer py-1 pr-3 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <p className="text-gray-600 dark:text-gray-400 font-mono text-sm opacity-60 group-hover:opacity-100 transition-opacity">
                                {selectedWallet.address}
                            </p>
                            <FiCopy className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors opacity-0 group-hover:opacity-100" />
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={() => setIsFundingOpen(true)}
                        disabled={!selectedWallet}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 disabled:opacity-50 disabled:grayscale"
                    >
                        <FiPlus className="w-5 h-5" />
                        Add Funds
                    </button>
                    <button className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-colors">
                        <FiSettings className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Navigation Sidebar */}
                <nav className="lg:col-span-3 space-y-4">
                    <div className="dark:bg-[#12141a] bg-white  border border-white/5 p-2 rounded-[24px] flex lg:flex-col gap-1 shadow-xl sticky top-4">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all flex-1 lg:flex-none overflow-hidden ${
                                        isActive 
                                        ? "text-white" 
                                        : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div 
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-blue-600 rounded-xl"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center gap-3">
                                        <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-500"}`} />
                                        <span className="hidden md:block">{tab.label}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Network Status Card */}
                    {/* <div className="hidden lg:block p-6 bg-gradient-to-br from-[#1a1d26] to-[#0d0e12] border border-white/5 rounded-[24px]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Network Status</span>
                            <div className={`h-1.5 w-1.5 rounded-full ${activeNetworkType === 'SVM' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                        </div>
                        <div className="flex items-center gap-2">
                            {activeNetworkType === 'SVM' ? <SiSolana className="text-purple-500" /> : <SiEthereum className="text-blue-500" />}
                            <span className="text-sm font-bold text-gray-200">
                                {activeNetworkType === 'SVM' ? 'Solana Mainnet' : 'Ethereum Mainnet'}
                            </span>
                        </div>
                    </div> */}
                </nav>

                {/* Content Area */}
                <section className="lg:col-span-9 min-h-[600px]">
                    <AnimatePresence mode="wait">
                        {selectedWallet ? (
                            <motion.div
                                key={`${activeTab}-${selectedWallet._id}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {activeTab === 'overview' && (
                                    <WalletOverview 
                                        userOrders={userOrders}
                                        selectedWallet={selectedWallet}
                                        availableWallets={filteredWallets} // Pass filtered list
                                        onSelectWallet={setSelectedWallet} // Pass setter
                                        chainId={chainId}
                                        user={user}
                                    />
                                )}
                                {activeTab === 'holdings' && <MyTokenPortfolio userTokens={[]} walletAddress={selectedWallet.address} chainId={chainId} user={user}/>}
                                {/* {activeTab === 'analytics' && <RenderWalletAnalytics wallet={selectedWallet} />} */}
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-96 text-gray-500 border border-dashed border-gray-800 rounded-3xl bg-white/5">
                                <FiGlobe className="w-12 h-12 mb-4 opacity-50" />
                                <p>No  wallets found.</p>
                                <button className="mt-4 text-blue-500 hover:text-blue-400 text-sm font-bold">Create one now</button>
                            </div>
                        )}
                    </AnimatePresence>
                </section>
            </main>

            {/* Modals */}
            {selectedWallet && (
                <FundingModal 
                    isOpen={isFundingOpen} 
                    onClose={() => setIsFundingOpen(false)}
                    wallet={selectedWallet.address}
                    user={user}
                    chainId={chainId}
                    isNative={true}
                    tokenInfo={{
                        address: '0x0', // Logic inside modal will handle native
                        decimals: chainId === chains.Solana ? 9 : 18,
                        name: chainId === chains.Solana ? 'Solana' : 'Ethereum',
                        symbol: chainId === chains.Solana ? 'SOL' : 'ETH',
                        imageUrl: chainId === chains.Solana ? '/sol.png' : '/eth.png'
                    }}
                />
            )}
        </div>
    );
}