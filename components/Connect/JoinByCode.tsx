'use client'
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { useUserAuth } from '@/hooks/useAuth';
import { NOTIFICATION_CONFIG } from "@/constants/config/notification";
import { motion, AnimatePresence } from 'framer-motion';
import { FiGift, FiArrowRight, FiCheckCircle, FiLoader, FiShield, FiAlertTriangle } from 'react-icons/fi';
import toast from 'react-hot-toast';

// 1. The Inner Component containing the logic
function JoinByCodeInner() {
  const { isMetamaskConnected, metamaskConnectedWallet, connectToMetamask } = useWallet();
  const searchParams = useSearchParams();
  const { joinUser } = useUserAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const invitationCode = searchParams.get('invitation');

  // Handle missing invitation code
  if (!invitationCode) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center p-10 bg-white dark:bg-[#0d1117] rounded-[32px] border border-red-500/20 shadow-2xl max-w-md w-full"
      >
        <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-2xl flex items-center justify-center mb-6">
          <FiAlertTriangle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-black dark:text-white mb-2">Invalid Invite</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          This invitation link is either expired, invalid, or incorrectly formatted.
        </p>
        <button 
          onClick={() => router.push('/')} 
          className="w-full py-4 bg-gray-100 dark:bg-white/5 rounded-2xl font-bold dark:text-white hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
        >
          Return to Terminal <FiArrowRight />
        </button>
      </motion.div>
    );
  }

  const handleJoin = async () => {
    if (!metamaskConnectedWallet) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsSubmitting(true);
    try {
      const result: any = await joinUser({
        account: metamaskConnectedWallet, 
        invitationCode, 
        signUpMethod: 'invitationCode' 
      });

      if (result.joined === false) {
        const nType = NOTIFICATION_CONFIG[result.type];
        toast.error(nType?.message || "Joining failed");
      } else {
        toast.success("Welcome to the protocol!");
        router.push('/');
      }
    } catch (err) {
      toast.error("Unexpected authentication error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full bg-white dark:bg-[#0d1117] p-8 rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/5 relative overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full" />
      
      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex p-4 bg-blue-600/10 rounded-2xl mb-4">
          <FiGift className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-black dark:text-white tracking-tight">Access Granted</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          You have been invited to join the secure protocol network.
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-black/40 p-5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 font-mono text-center mb-8">
        <span className="text-[10px] text-gray-400 block mb-1 uppercase font-bold tracking-[0.2em]">Credential Key</span>
        <span className="text-blue-600 dark:text-blue-400 font-bold text-lg select-all">{invitationCode}</span>
      </div>

      <div className="space-y-4 relative z-10">
        {!isMetamaskConnected ? (
          <button 
            onClick={connectToMetamask}
            className="group w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3"
          >
            <FiShield className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            Connect & Initialize
          </button>
        ) : (
          <button 
            onClick={handleJoin}
            disabled={isSubmitting}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all active:scale-[0.98] flex justify-center items-center gap-3 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isSubmitting ? <FiLoader className="animate-spin" /> : <FiCheckCircle />}
            <span>{isSubmitting ? "Authenticating..." : "Accept Invitation"}</span>
          </button>
        )}
        
        <AnimatePresence>
          {isMetamaskConnected && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                  {metamaskConnectedWallet?.slice(0, 6)}...{metamaskConnectedWallet?.slice(-4)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// 2. The default export that wraps the inner component in Suspense
export default function JoinByInvitationCode() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#050505] p-4">
      <Suspense fallback={
        <div className="max-w-md w-full bg-white dark:bg-[#0d1117] p-12 rounded-[32px] border border-gray-100 dark:border-white/5 text-center">
          <FiLoader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 font-medium animate-pulse">Establishing secure link...</p>
        </div>
      }>
        <JoinByCodeInner />
      </Suspense>
    </div>
  );
}