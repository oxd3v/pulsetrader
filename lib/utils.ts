import toast from "react-hot-toast";
// Notification Config (Optional: If you want to use it directly in hook for Toast defaults)
import { NOTIFICATION_CONFIG } from "@/constants/config/notification";
export const handleCopy = (text: string, label: string) => {
  navigator.clipboard.writeText(text);
  toast.success(label);
};

// Solana: Most addresses are 44 characters, but can be shorter.
export function isValidSolWalletFormat(address: string) {
  const regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return regex.test(address);
}

// EVM: Improved to ensure it's exactly 42 characters (0x + 40 hex)
export const isValidEVMWalletAddress = (address: string) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const notify = (
  type: "success" | "error",
  key: string,
  fallback?: string,
) => {
  const config = NOTIFICATION_CONFIG[key] ?? NOTIFICATION_CONFIG.SERVER_ERROR;
  const message = fallback || config.message;
  if (type === "success") {
    toast.success(message);
  } else {
    toast.error(message);
  }
};

export const notifyWithResponseError = (
  type: "success" | "error",
  message: string,
) => {
  if (type === "success") {
    toast.success(message);
  } else {
    toast.error(message);
  }
};

const resolveErrorKey = (err: any) => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "SERVER_ERROR"
  );
};

export const handleServerErrorToast = ({err, messageKey=undefined}:{err: any, messageKey?:string}) => {
  let errDataMessageKey = messageKey || resolveErrorKey(err);
  if (errDataMessageKey == "MISSING_PARAMS") {
    notifyWithResponseError("error", err.response.data?.type || "Missing request params");
  } else {
    notify("error", errDataMessageKey);
  }
  return errDataMessageKey;
};
