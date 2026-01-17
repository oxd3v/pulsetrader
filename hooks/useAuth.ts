import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import Service from "@/service/api-service";
import toast from "react-hot-toast";
import { ethers, verifyMessage } from "ethers";

// Libs
import {
  decodeText,
  encodeText,
  encryptAuthToken,
  decryptAuthToken,
} from "@/lib/encryption";

// Config
import {
  TOKEN_STORAGE_KEY,
  ACCOUNT_STORAGE_KEY,
  SIGN_MESSAGE,
  TOKEN_EXPIRY_DATE,
} from "@/constants/config/enviroments";

export const useUserAuth = () => {
  const {
    setUser,
    setUserOrders,
    setUserWallets,
    setUserHistories,
    setIsConnected,
    setSignature
  } = useStore(
    useShallow((state: any) => ({
      setUser: state.setUser,
      setUserOrders: state.setUserOrders,
      setUserWallets: state.setUserWallets,
      setUserHistories: state.setUserHistories,
      setIsConnected: state.setIsConnected,
      setSignature: state.setSignature
    }))
  );

  // --- Internal Helper: Update Global State ---
  const updateGlobalUserState = (userData: any) => {
    if (!userData) return;
    setUser({
      account: userData.account,
      status: userData.status || "silver",
      invites: userData.invites || [],
      inviter: userData.inviter || "",
      invitationCodes: userData.invitationCodes || [],
      isBlocked: userData.isBlocked || false,
    });

    // Safely handle arrays
    setUserOrders(Array.isArray(userData.orders) ? userData.orders : []);
    setUserHistories(
      Array.isArray(userData.histories) ? userData.histories : []
    );
    setUserWallets(Array.isArray(userData.wallets) ? userData.wallets : []);

    setIsConnected(true);
    localStorage.setItem(ACCOUNT_STORAGE_KEY, userData.account);
  };

  // --- Internal Helper: Get Fresh Signer ---
  const getSigner = async () => {
    if (typeof window === "undefined" || !window.ethereum) return null;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      return signer;
    } catch (e) {
      console.error("Failed to get signer", e);
      return null;
    }
  };

  // --- 1. Check User Session (Auto-Login) ---
  const checkUser = async ({ userAddress }: { userAddress: string }) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedAccount = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    let signature
    // 1. Basic LocalStorage Validation
    if (
      !storedAccount ||
      storedAccount.toLowerCase() !== userAddress.toLowerCase()
    ) {
      return { connected: false, type: "ACCOUNT_MISMATCH" };
    }
    if (!token) return { connected: false, type: "NO_TOKEN_FOUND" };

    // 2. Token Cryptography Validation
    try {
      const signature = decryptAuthToken(token);
      if (!signature)
        return { connected: false, type: "TOKEN_DECRYPTION_FAILED" };

      const decoded = JSON.parse(decodeText(signature));

      // Expiry Check
      if (Date.now() > decoded.ExpireAt)
        return { connected: false, type: "TOKEN_EXPIRED" };

      // Signature Check
      const recoveredAddress = verifyMessage(SIGN_MESSAGE, decoded.signature);
      if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
        return { connected: false, type: "INVALID_SIGNATURE" };
      }
    } catch (e) {
      return { connected: false, type: "INVALID_TOKEN_FORMAT" };
    }

    // 3. API Validation
    try {
      const apiResponse: any = await Service.checkUser({
        userAccount: userAddress,
      });

      if (!apiResponse.validation?.isValid) {
        return { connected: false, type: "USER_NOT_FOUND_ON_SERVER" };
      }

      if (apiResponse.user?.isBlocked) {
        return {
          connected: false,
          type: "BLOCKED_USER",
          message: apiResponse.user.blockedReason,
        };
      }
      setSignature(signature);
      updateGlobalUserState(apiResponse.user);
      return { connected: true, type: "SESSION_RESTORED" };
    } catch (err: any) {
      return { connected: false, type: "API_ERROR", message: err.message };
    }
  };

  // --- 2. Connect (Login with Wallet) ---
  const connect = async () => {
    const signer = await getSigner();
    if (!signer) {
      return { connection: false, type: "WALLET_NOT_CONNECTED" };
    }

    const address = (await signer.getAddress()).toLowerCase();

    // 1. Check Existence
    try {
      const checkRes: any = await Service.checkUser({ userAccount: address });

      if (!checkRes.validation?.isValid) {
        // This specific return type tells the UI to show JoinBox
        return { connection: false, type: "USER_NOT_FOUND" };
      }

      if (checkRes.user?.isBlocked) {
        return {
          connection: false,
          type: "BLOCKED_USER",
          message: checkRes.user.blockedReason,
        };
      }

      // 2. Sign Message
      const toastId = toast.loading("Please sign the login request...");
      const signature = await signer
        .signMessage(SIGN_MESSAGE)
        .catch(() => null);
      toast.dismiss(toastId);

      if (!signature) {
        return { connection: false, type: "SIGNATURE_REJECTED" };
      }

      // 3. Generate Token
      const tokenPayload = {
        address,
        signature,
        ExpireAt: Date.now() + TOKEN_EXPIRY_DATE,
      };

      const encryptedToken = encryptAuthToken(
        encodeText(JSON.stringify(tokenPayload))
      );
      if (!encryptedToken)
        return { connection: false, type: "ENCRYPTION_FAILED" };

      localStorage.setItem(TOKEN_STORAGE_KEY, encryptedToken);
      localStorage.setItem(ACCOUNT_STORAGE_KEY, address);

      // 4. Update State
      setSignature(signature);
      updateGlobalUserState(checkRes.user);
      toast.success("Login successful");
      return { connection: true, type: "SUCCESS" };
    } catch (err: any) {
      //console.error(err);
      return { connection: false, type: "API_ERROR" };
    }
  };

  // --- 3. Connect by Auth Token (Manual) ---
  const connectByToken = async (authToken: string) => {
    try {
      // 1. Decode & Verify
      const decodedStr = decodeText(authToken);
      const payload = JSON.parse(decodedStr);
      const address = payload.address;

      if (Date.now() > payload.ExpireAt) {
        return { connection: false, type: "TOKEN_EXPIRED" };
      }

      const recovered = verifyMessage(SIGN_MESSAGE, payload.signature);
      if (recovered.toLowerCase() !== address.toLowerCase()) {
        return { connection: false, type: "INVALID_SIGNATURE" };
      }

      // 2. Check API
      const checkRes: any = await Service.checkUser({ userAccount: address });
      if (!checkRes.validation?.isValid) {
        return { connection: false, type: "USER_NOT_FOUND" };
      }

      // 3. Store
      const encryptedToken = encryptAuthToken(authToken);
      if (encryptedToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, encryptedToken);
        localStorage.setItem(ACCOUNT_STORAGE_KEY, address);
        setSignature(authToken);
        updateGlobalUserState(checkRes.user);
        toast.success("Login successful");
        return { connection: true, type: "SUCCESS" };
      } else {
        return { connection: true, type: "TOKEN_ENCRYPTION_FAILED" };
      }
    } catch (e) {
      //console.error(e);
      return { connection: false, type: "INVALID_TOKEN" };
    }
  };

  // --- 4. Join (Register) ---
  const join = async ({
    account,
    signUpMethod,
    invitationCode,
  }: {
    account: string;
    signUpMethod: string;
    invitationCode?: string;
  }) => {
    const signer = await getSigner();
    if (!signer) {
      return { joined: false, type: "WALLET_NOT_CONNECTED" };
    }

    // 1. Sign
    const toastId = toast.loading("Signing registration request...");
    const signature = await signer.signMessage(SIGN_MESSAGE).catch(() => null);
    toast.dismiss(toastId);

    if (!signature) {
      return { joined: false, type: "SIGNATURE_REJECTED" };
    }

    // 2. Create Token
    const tokenPayload = {
      address: account,
      signature,
      ExpireAt: Date.now() + TOKEN_EXPIRY_DATE,
    };

    const encryptedToken = encryptAuthToken(
      encodeText(JSON.stringify(tokenPayload))
    );

    if (!encryptedToken) {
      return { joined: false, type: "TOKEN_ENCRYPTED_FAILED" };
    }

    // 3. API Call
    try {
      const joinRes: any = await Service.joinUser({
        account,
        signUpMethod,
        invitationCode,
      });

      if (joinRes.joining) {
        localStorage.setItem(TOKEN_STORAGE_KEY, encryptedToken);
        localStorage.setItem(ACCOUNT_STORAGE_KEY, account);
        setSignature(signature);
        updateGlobalUserState(joinRes.user);
        return { joined: true, type: "SUCCESS" };
      } else {
        return { joined: false, type: "JOINING_FAILED" };
      }
    } catch (err: any) {
      // Clean up if API fails
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(ACCOUNT_STORAGE_KEY);
      return { joined: false, type: "JOINING_FAILED", message: err.message };
    }
  };

  const disconnect = () => {
        setIsConnected(false);
        setSignature('');
        setUser({});
        setUserHistories([]);
        setUserWallets([]);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(ACCOUNT_STORAGE_KEY);
    };

  return {
    checkUser,
    connectByToken,
    connectUserByWallet: connect,
    connectUserByAuth: connectByToken,
    joinUser: join,
    disconnect
  };
};
