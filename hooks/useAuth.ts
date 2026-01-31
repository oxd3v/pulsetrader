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
    setSignature,
  } = useStore(
    useShallow((state: any) => ({
      setUser: state.setUser,
      setUserOrders: state.setUserOrders,
      setUserWallets: state.setUserWallets,
      setUserHistories: state.setUserHistories,
      setIsConnected: state.setIsConnected,
      setSignature: state.setSignature,
    })),
  );

  // --- Internal Helper: Update Global State ---
  const updateGlobalUserState = (user: any) => {
    if (!user) return;
    setUser({
      account: user.userData.account,
      status: user.userData.status || "silver",
      invites: user.userData.invites || [],
      inviter: user.userData.inviter || "",
      invitationCodes: user.userData.invitationCodes || [],
      isBlocked: user.userData.isBlocked || false,
    });

    // Safely handle arrays
    setUserOrders(Array.isArray(user.orders) ? user.orders : []);
    setUserHistories(Array.isArray(user.histories) ? user.histories : []);
    setUserWallets(Array.isArray(user.wallets) ? user.wallets : []);

    setIsConnected(true);
    localStorage.setItem(ACCOUNT_STORAGE_KEY, user.userData.account);
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
  const checkUser = async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedAccount = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    let signature;

    if (!token || !storedAccount)
      return { connected: false, type: "NO_TOKEN_FOUND" };

    // 2. Token Cryptography Validation
    try {
      signature = decryptAuthToken(token);
      if (!signature)
        return { connected: false, type: "TOKEN_DECRYPTION_FAILED" };

      const decoded = JSON.parse(decodeText(signature));

      // Expiry Check
      if (Date.now() > decoded.ExpireAt)
        return { connected: false, type: "TOKEN_EXPIRED" };

      // Signature Check
      const recoveredAddress = verifyMessage(SIGN_MESSAGE, decoded.signature);
      if (recoveredAddress.toLowerCase() !== storedAccount.toLowerCase()) {
        return { connected: false, type: "INVALID_SIGNATURE" };
      }
    } catch (e) {
      //console.log(e)
      return { connected: false, type: "INVALID_TOKEN_FORMAT" };
    }

    // 3. API Validation
    try {
      const apiResponse: any = await Service.checkUser({
        userAccount: storedAccount,
      });
      //console.log(apiResponse);

      if (apiResponse.validation == false) {
        return { connected: false, type: "USER_NOT_FOUND" };
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
      return { connected: true, type: "SUCCESSFULLY_CONNECTED" };
    } catch (err: any) {
      return { connected: false, type: "SERVER_ERROR", message: err.message };
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

      if (!checkRes.validation) {
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
        .catch(() => toast.error("Sign in failed.", { id: toastId }));
      if (!signature) {
        return { connection: false, type: "SIGNATURE_REJECTED" };
      }
      toast.dismiss(toastId);

      // 3. Generate Token
      const tokenPayload = {
        address,
        signature,
        ExpireAt: Date.now() + TOKEN_EXPIRY_DATE,
      };

      const encodeSignature = encodeText(JSON.stringify(tokenPayload));

      const encryptedToken = encryptAuthToken(encodeSignature);

      if (!encryptedToken)
        return { connection: false, type: "TOKEN_ENCRYPTION_FAILED" };

      localStorage.setItem(TOKEN_STORAGE_KEY, encryptedToken);
      localStorage.setItem(ACCOUNT_STORAGE_KEY, address);

      // 4. Update State

      setSignature(encodeSignature);
      updateGlobalUserState(checkRes.user);
      toast.success("Login successful");
      return { connection: true, type: "SUCCESS" };
    } catch (err: any) {
      //console.error(err);
      return { connection: false, type: "SERVER_ERROR" };
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
      const checkRes: any = await Service.checkUser({ userAccount: address }).catch(e=>{
        return { connection: false, type: "SERVER_ERROR" };
      });
      if (checkRes.validation == false) {
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
      //console.log(e);
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
    const signature = await signer.signMessage(SIGN_MESSAGE).catch(() => {
      toast.error("Signing message failed", { id: toastId });
    });

    if (!signature) {
      return { joined: false, type: "SIGNATURE_REJECTED" };
    }
    toast.dismiss(toastId);

    // 2. Create Token
    const tokenPayload = {
      address: account,
      signature,
      ExpireAt: Date.now() + TOKEN_EXPIRY_DATE,
    };

    const encodeSignature = encodeText(JSON.stringify(tokenPayload));

    const encryptedToken = encryptAuthToken(encodeSignature);

    if (!encryptedToken) {
      return { joined: false, type: "TOKEN_ENCRYPTED_FAILED" };
    }
    localStorage.setItem(TOKEN_STORAGE_KEY, encryptedToken);
    // 3. API Call
    try {
      const joinRes: any = await Service.joinUser({
        signUpMethod,
        invitationCode,
      });

      if (joinRes.joining) {
        localStorage.setItem(ACCOUNT_STORAGE_KEY, account);
        setSignature(encodeSignature);
        updateGlobalUserState(joinRes.user);
        return { joined: true, type: "SUCCESS" };
      } else {
        // Clean up if API fails
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(ACCOUNT_STORAGE_KEY);
        if (joinRes.message == "User already exist") {
          return { joined: false, type: "USER_ALREADY_EXIST" };
        } else if (joinRes.message == "Unauthorized account to join") {
          return { joined: false, type: "UNAUTHORIZED_ACCOUNT" };
        } else if (joinRes.message == "Failed to update inviter data") {
          return { joined: false, type: "INVALID_INVITER" };
        } else if (joinRes.message.includes("invitation")) {
          return { joined: false, type: "INVALID_INVITATION_CODE" };
        } else {
          return { joined: false, type: "JOINING_FAILED" };
        }
      }
    } catch (err: any) {
      // Clean up if API fails
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(ACCOUNT_STORAGE_KEY);
      return { joined: false, type: "JOINING_FAILED", message: err.message };
    }
  };

  const withdrawBalance = async ({
    receiver,
    tokenAddress,
    chainId,
    value,
    walletAddress,
    tokenDecimals,
    tokenSymbol,
  }: {
    receiver: string;
    tokenAddress: string;
    chainId: number;
    value: string;
    walletAddress: string;
    tokenDecimals: number;
    tokenSymbol: string;
  }) => {
    if (
      !receiver ||
      !tokenAddress ||
      !chainId ||
      !value ||
      !walletAddress ||
      !tokenDecimals ||
      !tokenSymbol
    ) {
    }
    try {
      let withdrawResult: any = await Service.withdraw({
        receiver,
        tokenAddress,
        chainId,
        value,
        walletAddress,
        tokenDecimals,
        tokenSymbol,
      });
      if (withdrawResult.success == true) {
        return { withdraw: true, message: "WITHDRAW_SUCCESS" };
      }
    } catch (err:any) {
      console.log(err)
      if(err.data.message == 'Tx failed'){
         return { withdraw: false, message: "TX_FAILED" };
      }
      return { withdraw: false, message: "WITHDRAW_FAILED" };
      
    }
  };

  const createNewWallet = async ({
    evmWallets,
    svmWallets,
  }: {
    evmWallets: number;
    svmWallets: number;
  }) => {
    try {
      let createWalletRes: any = await Service.createNewWallet({
        evmWallets,
        svmWallets,
      });
      setUserWallets(createWalletRes.wallets);
      return { creation: true, message: "SUCCESSFULL" };
    } catch (err: any) {
      return {
        creation: false,
        message: "WALLET_CREATION_FAILED",
        error: err.message,
      };
    }
  };

  const createInvitationCode = async ({
    expireAt,
    invitedTo,
  }: {
    expireAt: number;
    invitedTo: string;
  }) => {
    try {
      let creationResult: any = await Service.createInvitationCode({
        invitedTo,
        expireAt,
        status: "silver",
      });
      return {
        creation: true,
        code: creationResult.code,
        message: "Invitation code created successfully",
      };
    } catch (err: any) {
      console.log(err);
      return {
        creation: false,
        message: err.message || "Invitation code cration failed",
      };
    }
  };

  const removeInvitationCode = async (code: string) => {
    try {
      await Service.deleteInvitationCode({ code });
      return { removed: true, message: "Invitation code removed successfully" };
    } catch (err: any) {
      //console.log(err)
      return {
        removed: false,
        message: err.message || "Invitation code remove failed",
      };
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setSignature("");
    setUser({});
    setUserHistories([]);
    setUserWallets([]);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(ACCOUNT_STORAGE_KEY);
  };

  return {
    withdrawBalance,
    removeInvitationCode,
    createInvitationCode,
    createNewWallet,
    checkUser,
    connectByToken,
    connectUserByWallet: connect,
    connectUserByAuth: connectByToken,
    joinUser: join,
    disconnect,
  };
};
