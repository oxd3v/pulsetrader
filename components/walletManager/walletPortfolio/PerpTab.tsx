import { useState, useCallback } from "react";
import { WalletConfig } from "@/type/common";
import Service from "@/service/api-service";
import toast from "react-hot-toast";
import PerpDepositModal from "@/components/walletManager/modal/PerpDepositModal";
import {
  FiRefreshCw,
  FiShield,
  FiArrowDownCircle,
  FiCopy,
} from "react-icons/fi";
import { safeFormatNumber, safeParseUnits } from "@/utility/handy";
import { PRECISION_DECIMALS } from "@/constants/common/utils";
import { usePerpAccount } from "@/hooks/usePerpAccount";
type DexName = "asterdex" | "hyperliquid";

interface PerpBalances {
  asterdex: string;
  hyperliquid: string;
}

interface PerpTabProps {
  selectedWallet: WalletConfig;
  chainId: number;
  /** Pre-fetched balances passed down from PortfolioMain — avoids a redundant fetch on mount */
  perpBalances: PerpBalances;
  /** Trigger a full refresh in the parent so all tabs stay in sync */
  onRefresh: () => void;
}

type PerpServiceResponse = {
  success?: boolean;
  balance?: number | string;
  message?: string;
  data?: { success?: boolean; balance?: number | string; message?: string };
};

const DEX_CONFIG = {
  asterdex: {
    label: "AsterDEX",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    activeBg: "bg-[#eeb36e]",
    gradient: "bg-[#eeb36e] ",
  },
  hyperliquid: {
    label: "Hyperliquid",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    activeBg: "bg-[#97fce4]",
    gradient: "bg-[#97fce4]",
  },
} as const;

/** Parse any API response shape into a plain number */
function extractBalance(res: PerpServiceResponse | unknown): string {
  if (res == null) return "0";
  const r = res as PerpServiceResponse;
  return String(r?.data?.balance ?? r?.balance ?? 0);
}

/** Format a numeric USD value to "1,234.56" */
function fmtUsd(val: string): string {
  let formateVal = safeFormatNumber(String(val), PRECISION_DECIMALS, 4)
  return formateVal;
  // return formateVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PerpTab({ selectedWallet, chainId, perpBalances, onRefresh }: PerpTabProps) {
  const { approveAgent } = usePerpAccount();


  const [activeDex, setActiveDex] = useState<DexName>("asterdex");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);


  // Local override balance — starts from the pre-fetched parent value
  // and is only updated after a manual refresh or deposit
  const [localBalance, setLocalBalance] = useState<Record<DexName, string>>({
    asterdex: String(perpBalances.asterdex),
    hyperliquid: String(perpBalances.hyperliquid),
  });


  const walletState = selectedWallet as WalletConfig & {
    isApproved?: Record<string, boolean>;
    agentWallet?: { address?: string };
  };

  const currentRaw = localBalance[activeDex];
  const hasFunds = Number(currentRaw) > 0;
  const isApproved = !!walletState.isApproved?.[activeDex];
  const dex = DEX_CONFIG[activeDex];



  // ── Manual single-DEX refresh ───────────────────────────────────────────
  const handleRefreshBalance = useCallback(async () => {
    if (!selectedWallet?._id) return;
    setIsRefreshing(true);
    try {
      const res = await Service.getPerpBalance({
        mainWalletId: selectedWallet._id,
        dex: activeDex,
      }) as PerpServiceResponse;
      const raw = safeParseUnits(extractBalance(res), PRECISION_DECIMALS);
      setLocalBalance((prev) => ({ ...prev, [activeDex]: raw }));
    } catch {
      toast.error("Failed to refresh balance");
    } finally {
      setIsRefreshing(false);
    }
  }, [activeDex, selectedWallet?._id]);

  // When switching DEXes use the parent-supplied value immediately (no extra fetch)
  const handleDexSwitch = useCallback((next: DexName) => {
    setActiveDex(next);
    // Sync from parent in case the parent refreshed since mount
    setLocalBalance((prev) => ({
      ...prev,
      [next]: String(perpBalances[next]),
    }));
  }, [perpBalances]);

  // ── Approve agent ────────────────────────────────────────────────────────
  const handleApproveAgent = async () => {
    setIsApproving(true);
    try {
      // const res = await Service.approveAgent({
      //   mainWalletId: selectedWallet._id,
      //   dex: activeDex,
      // }) as PerpServiceResponse;
      await approveAgent({ mainWalletId: selectedWallet._id, dex: activeDex })

    } catch {
      //toast.error(`Error approving agent for ${activeDex}`);
    } finally {
      setIsApproving(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const isFullyReady = selectedWallet.isApproved?.[activeDex];

  return (
    <div className="space-y-4">
      {/* DEX switcher */}
      <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-1.5 flex gap-1">
        {(["asterdex", "hyperliquid"] as DexName[]).map((d) => (
          <button
            key={d}
            onClick={() => handleDexSwitch(d)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeDex === d
              ? DEX_CONFIG[d].activeBg + " text-white shadow-sm"
              : "text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
              }`}
          >
            {DEX_CONFIG[d].label}
          </button>
        ))}
      </div>

      {/* Balance card */}
      <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">Perp Balance</p>
          <div className="flex items-center gap-2">
            <p className={`text-3xl font-black ${dex.color}`}>${fmtUsd(String(currentRaw))}</p>
            <button
              onClick={handleRefreshBalance}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Refresh balance"
            >
              <FiRefreshCw size={13} className={`text-gray-400 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          {!hasFunds && (
            <p className="text-xs text-amber-500 dark:text-amber-400 mt-1 font-medium">
              Deposit at least 10 USDC to start
            </p>
          )}
          {isFullyReady && (
            <p className="text-xs text-emerald-500 dark:text-emerald-400 mt-1 font-semibold">
              ✓ Ready to trade
            </p>
          )}
        </div>
      </div>


      {/* Setup instructions — only show until fully ready */}
      {!isFullyReady && (
        <>
          <div className={`${dex.bg} ${dex.border} border rounded-2xl p-4`}>
            <p className="text-sm font-bold text-black dark:text-white mb-1">Step 1 — Deposit funds</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Deposit USDC into your {DEX_CONFIG[activeDex].label} perp account. Minimum 10 USDC required.
            </p>
          </div>
          <div className={`${dex.bg} ${dex.border} border rounded-2xl p-4`}>
            <p className="text-sm font-bold text-black dark:text-white mb-1">Step 2 — Approve agent</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {hasFunds
                ? `Your account is funded ($${fmtUsd(currentRaw)}). Approve the agent wallet to enable automated order execution.`
                : "Fund your account first, then approve the agent wallet."}
            </p>
          </div>
        </>
      )}

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Agent status */}
        <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiShield size={15} className="text-gray-400" />
            <h3 className="text-sm font-bold text-black dark:text-white">Agent Status</h3>
          </div>

          {!isApproved || !walletState.agentWallet?.address ? (
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Make sure deposit first in perp account. If you have already sent transaction, wait a moment for changes to reflect.
              <p className={`text-sm font-bold ${dex.color}`}>
                {
                  activeDex == 'hyperliquid' ? 'Deposit will be process by the Hyperliquid L1 validator network. This off-chain creation typically takes 1–2 minutes.' :
                    'Processing between Arbitrum and the AsterDEX ledger typically takes 5-30 minutes. Please wait for the protocol to sync your balance before approving the Agent Wallet.'
                }
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              This is your agent wallet address. Please dont use this wallet to send or receive any other asset and purpose.
            </p>
          )}

          {isApproved && walletState.agentWallet?.address ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl px-4 py-3 text-sm font-bold">
              <span>
                {walletState.agentWallet.address.slice(0, 6)}…{walletState.agentWallet.address.slice(-4)}
              </span>
              <FiCopy
                size={15}
                className="cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(walletState.agentWallet!.address as string);
                  toast.success("Copied");
                }}
              />
            </div>
          ) : (
            <button
              onClick={handleApproveAgent}
              disabled={isApproving}
              className={`w-full py-3 rounded-xl text-sm font-bold text-white transition-all bg-gradient-to-r ${dex.gradient} hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isApproving ? (
                <span className="flex items-center justify-center gap-2">
                  <FiRefreshCw size={14} className="animate-spin" /> Approving…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <FiShield size={14} /> Approve Agent
                </span>
              )}
            </button>
          )}
        </div>

        {/* Deposit */}
        <div className="bg-white dark:bg-[#13131a] border border-black/5 dark:border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiArrowDownCircle size={15} className="text-gray-400" />
            <h3 className="text-sm font-bold text-black dark:text-white">Fund Account</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Deposit USDC to your {DEX_CONFIG[activeDex].label} perp account. Min 10 USDC.
          </p>
          {!isApproved && hasFunds && (
            <p className="text-xs text-emerald-500 font-semibold mb-3">
              Funded — approve agent above to start trading
            </p>
          )}
          <button
            onClick={() => setIsDepositing(true)}
            className={`w-full py-3 rounded-xl text-sm font-bold text-white transition-all bg-gradient-to-r ${dex.gradient} hover:opacity-90 active:scale-[0.98]`}
          >
            Deposit Funds
          </button>
        </div>
      </div>

      {/* Deposit modal */}
      <PerpDepositModal
        isOpen={isDepositing}
        onClose={() => {
          setIsDepositing(false);
          // After a deposit: refresh locally then bubble up to parent for full sync
          setTimeout(async () => {
            await handleRefreshBalance();
            onRefresh();
          }, 2000);
        }}
        wallet={selectedWallet}
        chainId={chainId}
        initialDex={activeDex}
      />
    </div>
  );
}