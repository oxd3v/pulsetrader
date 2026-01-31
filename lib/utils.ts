import toast from 'react-hot-toast';
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
}