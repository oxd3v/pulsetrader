import { useState } from "react";
import { useUserAuth } from "@/hooks/useAuth";
import { WalletConfig } from "@/type/common";
import toast from "react-hot-toast";
import {
  FiKey,
  FiCopy,
  FiAlertTriangle,
  FiCheckCircle,
  FiShield,
  FiEye,
  FiEyeOff,
  FiZap,
} from "react-icons/fi";
import { decryptPrivateKey } from "@/lib/crypto-encryption/authToken";

interface WalletSettingsProps {
  wallet: WalletConfig;
}

export default function WalletSettings({ wallet }: WalletSettingsProps) {
  const { getPrivateKey } = useUserAuth();

  // State
  const [isLoadingKey, setIsLoadingKey] = useState(false);
  const [secureKey, setSecureKey] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isDefaultWallet, setIsDefaultWallet] = useState(false); // Mock state for "Default Instant Trade"

  // Handlers
  const handleRevealKey = async () => {
    if (isKeyVisible && privateKey) {
      setIsKeyVisible(!isKeyVisible);
      setPrivateKey(null)
      return;
    }

    setIsLoadingKey(true);
    try {
      if (secureKey) {
        let key = await decryptPrivateKey(secureKey);
        setPrivateKey(key as string);
        setIsKeyVisible(true);
      } else {
        const response: any = await getPrivateKey(wallet.address);
        if (response.decrypted && response.key) {
          setSecureKey(response.key);
          console.log(response.key)
          let pKey = await decryptPrivateKey(response.key as string);
          setPrivateKey(pKey as string);
          setIsKeyVisible(true);
        }
      }
    } catch (error) {
        console.log(error)
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoadingKey(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleToggleDefault = () => {
    // In a real app, this would call an API or Store function like `setDefaultWallet(wallet.id)`
    setIsDefaultWallet(!isDefaultWallet);
    if (!isDefaultWallet) {
      toast.success("Set as default wallet for instant trades");
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Section 1: Preferences */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <FiZap className="w-5 h-5 text-yellow-500" />
          Trading Preferences
        </h3>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-zinc-800 dark:text-zinc-200">
              Default for Instant Trade
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              Use this wallet automatically for one-click swaps and trades.
            </p>
          </div>
          <button
            onClick={handleToggleDefault}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              isDefaultWallet ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isDefaultWallet ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>

      <div className="border-t border-zinc-200 dark:border-zinc-800 my-6" />

      {/* Section 2: Security Zone */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-red-600 dark:text-red-500 flex items-center gap-2">
          <FiShield className="w-5 h-5" />
          Security Zone
        </h3>

        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-4">
            <FiAlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-700 dark:text-red-400">
                Export Private Key
              </h4>
              <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                Warning: Never share your private key with anyone. Anyone with
                this key can steal your funds permanently.
              </p>
            </div>
          </div>

          <div className="mt-4">
            {/* Key Display Area */}
            <div className="relative group">
              <div
                className={`
                w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg p-3 font-mono text-sm break-all
                ${!isKeyVisible ? "blur-sm select-none cursor-not-allowed text-zinc-400" : "text-zinc-800 dark:text-zinc-200"}
              `}
              >
                {privateKey ||
                  "0x0000000000000000000000000000000000000000000000000000000000000000"}
              </div>

              {/* Overlay for hidden state */}
              {!isKeyVisible && !isLoadingKey && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-zinc-500 font-medium bg-white/80 dark:bg-zinc-900/80 px-3 py-1 rounded-md shadow-sm backdrop-blur-sm">
                    Hidden for security
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleRevealKey}
                disabled={isLoadingKey}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg text-sm font-medium transition-all"
              >
                {isLoadingKey ? (
                  <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                ) : isKeyVisible ? (
                  <>
                    <FiEyeOff /> Hide Key
                  </>
                ) : (
                  <>
                    <FiEye /> Reveal Private Key
                  </>
                )}
              </button>

              {isKeyVisible && privateKey && (
                <button
                  onClick={() => handleCopy(privateKey || "")}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-600/20"
                >
                  <FiCopy /> Copy
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
