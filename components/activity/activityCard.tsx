import {memo} from 'react';
import { ACTIVITY_TYPE } from "@/type/common";
import { 
  FiRepeat, 
  FiArrowUpRight, 
  FiArrowDownLeft, 
  FiClock, 
  FiCheckCircle, 
  FiXCircle, 
  FiExternalLink 
} from "react-icons/fi";
import { FaWallet } from "react-icons/fa";
import { formatUnits } from "ethers";
import { displayNumber } from "@/utility/displayPrice";
import { PRECISION_DECIMALS } from "@/constants/common/utils";
import { chainConfig } from '@/constants/common/chain';
import Link from 'next/link';

/**
 * Enhanced Activity Card
 * - Uses react-icons for a modern look
 * - Formats amounts and USD values using provided utility helpers
 * - Provides dynamic explorer links based on network (EVM/SVM)
 */

const shortenAddress = (addr: string) => 
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

const formatDate = (date: Date | string) => 
  new Date(date).toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

// Formatting Helpers using your custom logic
const formatUsd = (amountInUsd: string) => {
  return displayNumber(
    Number(formatUnits(BigInt(amountInUsd || "0"), PRECISION_DECIMALS))
  );
};

const formatAmount = (amount: string, decimals: number) => {
  return displayNumber(
    Number(formatUnits(BigInt(amount || "0"), decimals))
  );
};

const ActivityCard = memo(({ activityDetails }: { activityDetails: ACTIVITY_TYPE })=>{
     const { 
    type, 
    status, 
    createdAt, 
    payToken, 
    receiveToken, 
    txHash, 
    chainId,
    wallet,
    txFee 
  } = activityDetails;
  

  // Configuration for Activity Types
  const getTypeConfig = (type: string) => {
    switch (type.toUpperCase()) {
      case 'SWAP':
        return { icon: <FiRepeat className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600', label: 'Swap' };
      case 'TRANSFER':
      case 'SEND':
        return { icon: <FiArrowUpRight className="w-5 h-5" />, color: 'bg-orange-100 text-orange-600', label: 'Sent' };
      case 'RECEIVE':
        return { icon: <FiArrowDownLeft className="w-5 h-5" />, color: 'bg-green-100 text-green-600', label: 'Received' };
      default:
        return { icon: <FiClock className="w-5 h-5" />, color: 'bg-gray-100 text-gray-600', label: type };
    }
  };

  const typeConfig = getTypeConfig(type);

  // Status Badge Logic
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success': return 'text-green-500 bg-green-50 border-green-200';
      case 'failed': return 'text-red-500 bg-red-50 border-red-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  // Dynamic Explorer Link
  const getExplorerLink = () => {
    return `${chainConfig[chainId].explorerUrl}tx/${txHash}`
    // if (wallet?.network === 'EVM') return `https://etherscan.io/tx/${txHash}`;
    // if (wallet?.network === 'SVM') return `https://solscan.io/tx/${txHash}`;
    // return "#";
  };

  return (
    <div className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:border-indigo-500/40">
      
      {/* Header: Icon & Status */}
      <div className="flex justify-between items-start mb-5">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl shadow-sm ${typeConfig.color}`}>
            {typeConfig.icon}
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
              {typeConfig.label}
            </h3>
            <span className="text-[11px] text-zinc-500 font-medium">
              {formatDate(createdAt)}
            </span>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5 uppercase tracking-wider ${getStatusStyle(status)}`}>
          {status.toLowerCase() === 'success' ? <FiCheckCircle /> : 
           status.toLowerCase() === 'failed' ? <FiXCircle /> : 
           <FiClock />}
          {status}
        </div>
      </div>

      {/* Asset Display: Both Amount and USD */}
      <div className="space-y-3 mb-5">
        {payToken?.amount  && (
          <div className="flex justify-between items-end bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1">Sent</p>
              <div className="flex gap-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {formatAmount(payToken.amount, payToken.decimals)} {payToken.symbol}
              </div>
            </div>
            <div className="flex gap-1 text-xs text-zinc-500">
              ${formatUsd(payToken.amountInUsd || "0")}
            </div>
          </div>
        )}

        {receiveToken?.amount  && (
         <div className="flex justify-between items-end bg-indigo-50/30 dark:bg-indigo-900/10 p-3 rounded-lg border border-indigo-100/50 dark:border-indigo-900/20">
          <div>
            <p className="text-[10px] text-indigo-400 uppercase font-bold mb-1">Received</p>
            <div className="flex gap-1 text-sm font-bold text-indigo-700 dark:text-indigo-400">
              {formatAmount(receiveToken.amount, receiveToken.decimals)} {receiveToken.symbol}
            </div>
          </div>
          <div className="flex gap-1 text-xs font-medium text-indigo-600/80">
            ${formatUsd(receiveToken.amountInUsd || "0")}
          </div>
        </div>
        )}
      </div>

      {/* Footer: Wallet Info & Link */}
      <div className="flex justify-between items-center pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 group/wallet">
          <FaWallet className="text-zinc-400 group-hover/wallet:text-indigo-500 transition-colors" />
          <div className="flex flex-col">
            <span className="text-[11px] font-mono font-medium text-zinc-600 dark:text-zinc-400">
              {shortenAddress(wallet?.address)}
            </span>
            <span className="text-[9px] text-zinc-400 uppercase tracking-tighter">
              {wallet?.network} Network
            </span>
          </div>
        </div>

        <Link 
          href={getExplorerLink()}
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-zinc-500 hover:text-white hover:bg-zinc-900 dark:hover:bg-zinc-100 dark:hover:text-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-all"
        >
          EXPLORER <FiExternalLink className="text-xs" />
        </Link>
      </div>
      
      {/* Interactive Fee Tag (Hover) */}
      {txFee && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
          <div className="bg-white dark:bg-zinc-800 shadow-xl border border-zinc-100 dark:border-zinc-700 px-2 py-1 rounded-md">
             <div className="text-[9px] text-zinc-400 font-bold whitespace-nowrap">
               FEE: ${formatUsd(txFee.feeInUsd)}
             </div>
          </div>
        </div>
      )}
    </div>
  );
})
export default ActivityCard;