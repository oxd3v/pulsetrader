import { ethers } from "ethers"
import { useEffect, useState } from "react"
import toast from 'react-hot-toast'

export const useWallet = () => {
    const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
    const [isMetamaskConnected, setIsMetamaskConnected] = useState(false);
    const [metamaskConnectedWallet, setMetamaskConnectedWallet] = useState("");
    const [connectedNetwork, setConnectedNetwork] = useState<number>(43114);
    const [metamaskSigner, setMetamaskSigner] = useState<ethers.Signer | null>(null);
    const [error, setError] = useState("");

    // Check if MetaMask is installed
    const checkMetaMaskInstalled = () => {
        return typeof window !== "undefined" && !!window.ethereum;
    };

    // Check if MetaMask is connected
    const checkIsMetamaskConnected = async () => {
        try {
            if (!checkMetaMaskInstalled()) {
                return { isConnected: false, error: "MetaMask is not installed", isMetaMaskInstalled: false };
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress()
            return { isConnected: true, address: address.toLowerCase(), signer: signer };

        } catch (error: any) {
            return { isConnected: false, error: error.message || "Metamask not connected" };
        }
    };

    // Get MetaMask signer
    const handleMetamask = async () => {
        try {
            const isInstalled = checkMetaMaskInstalled();
            setIsMetaMaskInstalled(isInstalled);
            
            if (!isInstalled) {
                return;
            }
            
            // Check if MetaMask is already connected without prompting
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.listAccounts();
            
            if (accounts.length === 0) {
                // MetaMask is not connected, reset states
                setIsMetamaskConnected(false);
                setMetamaskConnectedWallet("");
                setMetamaskSigner(null);
                setConnectedNetwork(0);
                return;
            }

            // MetaMask is connected, get account details
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            const network = await provider.getNetwork();
            
            setConnectedNetwork(Number(network.chainId));
            setMetamaskConnectedWallet(address.toLowerCase());
            setIsMetamaskConnected(true);
            setMetamaskSigner(signer);
            
        } catch (error) {
            setIsMetamaskConnected(false);
            setMetamaskConnectedWallet("");
            setMetamaskSigner(null);
            setConnectedNetwork(0);
        }
    };

    // Connect to MetaMask and get address
    const connectToMetamask = async () => {
        try {
            if (!checkMetaMaskInstalled()) {
                throw new Error("MetaMask is not installed");
            }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            });

            if (accounts.length === 0) {
                throw new Error("No accounts found");
            }

            // Update states after successful connection
            await handleMetamask();
            return accounts[0];

        } catch (error: any) {
            console.error("Error connecting to MetaMask:", error);
            if (error.message == 'Already processing eth_requestAccounts. Please wait.') {
                toast.error('Already processing. Please wait.')
            }
            throw error;
        }
    };

    // Try to auto-switch network if needed
    const handleSwitchNetwork = async (chainId: number) => {
        if (!checkMetaMaskInstalled()) return;
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x' + chainId.toString(16) }],
            });
            // Update states after network switch
            await handleMetamask();
            return { switchSuccess: true, error: '' }
        } catch (err: any) {
            return { switchSuccess: false, error: err.message || 'Failed to switch network. Please switch manually in your wallet.' }
        }
    };

    // Initialize wallet state on mount and setup listeners
    useEffect(() => {
        handleMetamask();
        
        if (!checkMetaMaskInstalled()) return;
        
        window.ethereum.on('accountsChanged', handleMetamask);
        window.ethereum.on('chainChanged', handleMetamask);
        
        return () => {
            window.ethereum.removeListener('accountsChanged', handleMetamask);
            window.ethereum.removeListener('chainChanged', handleMetamask);
        };
    }, []);
 
    return {
        isMetaMaskInstalled,
        isMetamaskConnected,
        metamaskConnectedWallet,
        connectedNetwork,
        metamaskSigner,
        error,
        checkMetaMaskInstalled,
        connectToMetamask,
        handleMetamask,
        handleSwitchNetwork
    }
}