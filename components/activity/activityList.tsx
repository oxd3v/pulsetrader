import { memo } from "react";
import Link from "next/link";
import { ACTIVITY_TYPE } from "@/type/common";
import {
  FiRepeat,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiExternalLink,
} from "react-icons/fi";
import { formatUnits } from "ethers";
import { displayNumber } from "@/utility/displayPrice";
import { PRECISION_DECIMALS } from "@/constants/common/utils";
import { chainConfig } from "@/constants/common/chain";

// ── Helpers ──────────────────────────────────────────────────────────────────

const shortenHash = (hash: string, front = 6, back = 4) =>
  hash ? `${hash.slice(0, front)}…${hash.slice(-back)}` : "—";

const formatDate = (date: Date | string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatUsd = (amountInUsd: string) =>
  displayNumber(
    Number(formatUnits(BigInt(amountInUsd || "0"), PRECISION_DECIMALS)),
  );

const formatAmount = (amount: string, decimals: number) =>
  displayNumber(Number(formatUnits(BigInt(amount || "0"), decimals)));

// ── Type Config ───────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string; label: string }
> = {
  SWAP: {
    icon: <FiRepeat className="w-3.5 h-3.5" />,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800",
    label: "Swap",
  },
  TRANSFER: {
    icon: <FiArrowUpRight className="w-3.5 h-3.5" />,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800",
    label: "Send",
  },
  SEND: {
    icon: <FiArrowUpRight className="w-3.5 h-3.5" />,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800",
    label: "Send",
  },
  RECEIVE: {
    icon: <FiArrowDownLeft className="w-3.5 h-3.5" />,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800",
    label: "Receive",
  },
};

const getTypeConfig = (type: string) =>
  TYPE_CONFIG[type?.toUpperCase()] ?? {
    icon: <FiClock className="w-3.5 h-3.5" />,
    color: "text-zinc-500",
    bg: "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700",
    label: type ?? "—",
  };

// ── Status Config ─────────────────────────────────────────────────────────────

const getStatusConfig = (status: string) => {
  switch (status?.toLowerCase()) {
    case "success":
      return {
        icon: <FiCheckCircle className="w-3 h-3" />,
        class:
          "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
        label: "Success",
      };
    case "failed":
      return {
        icon: <FiXCircle className="w-3 h-3" />,
        class:
          "text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
        label: "Failed",
      };
    default:
      return {
        icon: <FiClock className="w-3 h-3" />,
        class:
          "text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
        label: status ?? "Pending",
      };
  }
};

// ── Component ─────────────────────────────────────────────────────────────────

interface ActivityListItemProps {
  activityDetails: ACTIVITY_TYPE;
  isEven?: boolean;
}

const ActivityListItem = memo(
  ({ activityDetails, isEven = false }: ActivityListItemProps) => {
    const {
      type,
      status,
      walletAddress,
      createdAt,
      payToken,
      receiveToken,
      txHash,
      chainId,
      wallet,
      txFee,
    } = activityDetails;

    const typeConfig = getTypeConfig(type);
    const statusConfig = getStatusConfig(status);

    const explorerLink = chainConfig?.[chainId]?.explorerUrl
      ? `${chainConfig[chainId].explorerUrl}tx/${txHash}`
      : "#";

    return (
      <tr
        className={`
        group border-b border-zinc-100 dark:border-zinc-800/60 transition-colors duration-150
        ${isEven ? "bg-zinc-50/40 dark:bg-zinc-900/40" : "bg-white dark:bg-zinc-950"}
        hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10
      `}
      >
        {/* Type */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold uppercase tracking-wide ${typeConfig.color} ${typeConfig.bg}`}
          >
            {typeConfig.icon}
            {typeConfig.label}
          </span>
        </td>

        {/* Pay Token */}
        <td className="px-4 py-3">
          {payToken?.amount ? (
            <div className="flex flex-col">
              <span className="flex gap-1 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {formatAmount(payToken.amount, payToken.decimals)}{" "}
                <span className="text-zinc-400 font-normal">
                  {payToken.symbol}
                </span>
              </span>
              <span className="flex gap-1 text-[10px] text-zinc-400">
                ${formatUsd(payToken.amountInUsd || "0")}
              </span>
            </div>
          ) : (
            <span className="text-zinc-300 dark:text-zinc-700">—</span>
          )}
        </td>

        {/* Receive Token */}
        <td className="px-4 py-3">
          {receiveToken?.amount ? (
            <div className="flex flex-col">
              <span className="flex gap-1 text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                {formatAmount(receiveToken.amount, receiveToken.decimals)}{" "}
                <span className="text-indigo-400/60 font-normal">
                  {receiveToken.symbol}
                </span>
              </span>
              <span className="flex gap-1 text-[10px] text-indigo-400/70">
                ${formatUsd(receiveToken.amountInUsd || "0")}
              </span>
            </div>
          ) : (
            <span className="text-zinc-300 dark:text-zinc-700">—</span>
          )}
        </td>

        {/* Fee */}
        <td className="px-4 py-3 whitespace-nowrap">
          {txFee?.feeAmount ? (
            <div className="flex flex-col">
              <span className="flex gap-1 text-sm font-semibold text-indigo-700 dark:text-indigo-400">
                {formatAmount(
                  txFee?.feeAmount,
                  chainConfig[chainId].nativeToken.decimals,
                )}{" "}
                <span className="text-indigo-400/60 font-normal">
                  {chainConfig[chainId].symbol}
                </span>
              </span>
              <span className="flex gap-1 text-[10px] text-indigo-400/70">
                ${formatUsd(txFee.feeInUsd || "0")}
              </span>
            </div>
          ) : (
            <span className="text-zinc-300 dark:text-zinc-700">—</span>
          )}
          {/* {txFee?.feeInUsd ? (
            <span className="flex gap-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              ${formatUsd(txFee.feeInUsd)}
            </span>
          ) : (
            <span className="text-zinc-300 dark:text-zinc-700">—</span>
          )} */}
        </td>

        {/* Wallet */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex flex-col">
            <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
              {shortenHash((wallet?.address || walletAddress) ?? "", 6, 4)}
            </span>
            {/* {wallet?.network && (
            <span className="text-[9px] text-zinc-400 uppercase tracking-wider">{wallet.network}</span>
          )} */}
          </div>
        </td>

        {/* Tx Hash */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="flex flex-col justify-center items-center gap-1">
            <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
              <Link
                href={explorerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 dark:hover:bg-zinc-100 dark:hover:text-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-700 transition-all duration-150 uppercase tracking-wider"
              >
                {shortenHash(txHash ?? "", 8, 6)}{" "}
                <FiExternalLink className="w-2.5 h-2.5" />
              </Link>
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
              {formatDate(createdAt)}
            </span>
          </span>
        </td>

        {/* Status */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusConfig.class}`}
          >
            {statusConfig.icon}
            {/* {statusConfig.label} */}
          </span>
        </td>

        {/* Explorer Link */}
        {/* <td className="px-4 py-3 whitespace-nowrap">
          <Link
            href={explorerLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 dark:hover:bg-zinc-100 dark:hover:text-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-700 transition-all duration-150 uppercase tracking-wider"
          >
            TX <FiExternalLink className="w-2.5 h-2.5" />
          </Link>
        </td> */}
      </tr>
    );
  },
);

ActivityListItem.displayName = "ActivityListItem";
export default ActivityListItem;
