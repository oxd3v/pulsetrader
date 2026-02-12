// @/hooks/useAuth.ts
import { useCallback } from "react";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";
import Service from "@/service/api-service";
import toast from "react-hot-toast";
import { ethers, verifyMessage } from "ethers";

// Libs
import { decodeText } from "@/lib/crypto-encryption/encryption";
import { encryptAuthToken } from "@/lib/crypto-encryption/authToken";

// Config
import {
  TOKEN_STORAGE_KEY,
  ACCOUNT_STORAGE_KEY,
  SIGN_MESSAGE,
} from "@/constants/config/enviroments";

// Notification Config (Optional: If you want to use it directly in hook for Toast defaults)
import { NOTIFICATION_CONFIG } from "@/constants/config/notification";

export const useUserAuth = () => {
  const {
    isConnected,
    setUser,
    setUserOrders,
    setUserWallets,
    setUserHistories,
    setIsConnected,
    setSignature,
  } = useStore(
    useShallow((state: any) => ({
      isConnected: state.isConnected,
      setUser: state.setUser,
      setUserOrders: state.setUserOrders,
      setUserWallets: state.setUserWallets,
      setUserHistories: state.setUserHistories,
      setIsConnected: state.setIsConnected,
      setSignature: state.setSignature,
    })),
  );

  const notify = useCallback(
    (type: "success" | "error", key: string, fallback?: string) => {
      const config =
        NOTIFICATION_CONFIG[key] ?? NOTIFICATION_CONFIG.SERVER_ERROR;
      const message = fallback || config.message;
      if (type === "success") {
        toast.success(message);
      } else {
        toast.error(message);
      }
    },
    [],
  );

  const resolveErrorKey = useCallback((err: any) => {
    return (
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "SERVER_ERROR"
    );
  }, []);

  const normalizeNotificationKey = useCallback((key: string) => {
    if (key === "USER_ALREADY_EXISTS") return "USER_ALREADY_EXIST";
    if (key === "UNAUTHORIZED_USER") return "UNAUTHORIZED_ACCOUNT";
    if (key === "UNAUTHENTICATED") return "NO_TOKEN_FOUND";
    if (key === "CONNECT_SUCCESS") return "SUCCESSFULLY_CONNECTED";
    return key;
  }, []);

  const setUserState = (userData: any) => {
    setUser({
      account: userData?.account || "",
      status: userData?.status || "silver",
      invites: userData?.invites || [],
      inviter: userData?.inviter || "",
      invitationCodes: userData?.invitationCodes || [],
      isBlocked: userData?.isBlocked || false,
      assetes: userData?.assetes || []
    });
  };

  // --- Internal Helper: Update Global State ---
  const updateGlobalUserState = useCallback(
    (user: any) => {
      if (!user) return;

      // Safely map user data to store
      setUserState(user.userData);

      setUserOrders(Array.isArray(user.orders) ? user.orders : []);
      setUserHistories(Array.isArray(user.histories) ? user.histories : []);
      setUserWallets(Array.isArray(user.wallets) ? user.wallets : []);

      setIsConnected(true);

      if (user.userData?.account) {
        localStorage.setItem(ACCOUNT_STORAGE_KEY, user.userData.account);
      }
    },
    [setUser, setUserOrders, setUserHistories, setUserWallets, setIsConnected],
  );

  // --- Internal Helper: Get Fresh Signer ---
  const getSigner = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return null;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      return signer;
    } catch (e) {
      //console.error("Failed to get signer", e);
      return null;
    }
  }, []);

  // --- 1. Check User Session (Auto-Login) ---
  const checkUser = useCallback(async () => {
    // 3. API Validation
    try {
      const apiResponse: any = await Service.checkUser({});

      if (!apiResponse?.connect || !apiResponse?.user) {
        const key = normalizeNotificationKey(
          apiResponse?.error || apiResponse?.message || "NO_TOKEN_FOUND",
        );
        notify("error", key);
        return { connected: false, type: key };
      }

      if (apiResponse.user?.userData?.isBlocked === true) {
        const key = "BLOCKED_USER";
        notify("error", key, apiResponse.user.userData.blockedReason);
        return {
          connected: false,
          type: key,
          message: apiResponse.user.userData.blockedReason,
        };
      }

      const signature = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (signature) {
        const address = verifyMessage(SIGN_MESSAGE, signature);
        if (
          address.toLowerCase() ==
          apiResponse.user?.userData?.account.toLowerCase()
        ) {
          setSignature(signature);
        }
      }

      updateGlobalUserState(apiResponse.user);
      notify("success", "SUCCESSFULLY_CONNECTED");
      return { connected: true, type: "SUCCESSFULLY_CONNECTED" };
    } catch (err: any) {
      const key = normalizeNotificationKey(resolveErrorKey(err));
      notify("error", key);
      return { connected: false, type: key, message: err.message };
    }
  }, [
    normalizeNotificationKey,
    notify,
    resolveErrorKey,
    updateGlobalUserState,
  ]);

  // --- 2. Connect (Login with Wallet) ---
  const connect = useCallback(async () => {
    const signer = await getSigner();
    if (!signer) {
      notify("error", "WALLET_NOT_CONNECTED");
      return { connection: false, type: "WALLET_NOT_CONNECTED" };
    }

    try {
      const address = (await signer.getAddress()).toLowerCase();

      // 2. Sign Message
      const toastId = toast.loading("Please sign the login request...");
      const signature = await signer.signMessage(SIGN_MESSAGE).catch((e) => {
        // User rejected signature
        return null;
      });

      if (!signature) {
        notify("error", "SIGNATURE_REJECTED");
        toast.dismiss(toastId);
        return { connection: false, type: "SIGNATURE_REJECTED" };
      }
      let encryptedToken = await encryptAuthToken(signature);
      console.log(encryptedToken)
      if (!encryptedToken) {
        notify("error", "TOKEN_ENCRYPTION_FAILED");
        toast.dismiss(toastId);
        return { connection: false, type: "TOKEN_ENCRYPTION_FAILED" };
      }
      toast.dismiss(toastId);

      // 1. Check Existence via API
      const connectRes: any = await Service.connect({
        account: address,
        encryptedToken,
      });

      console.log(connectRes);

      if (!connectRes?.connect || !connectRes?.user) {
        const key = normalizeNotificationKey(
          connectRes?.message || "USER_NOT_FOUND",
        );
        notify("error", key);
        // User needs to Join
        return {
          connection: false,
          type: key,
          message: key,
        };
      }

      if (connectRes.user?.userData?.isBlocked === true) {
        const key = "BLOCKED_USER";
        notify("error", key, connectRes.user.userData.blockedReason);
        return {
          connection: false,
          type: key,
          message: connectRes.user.userData.blockedReason,
        };
      }
      // 4. Persist & Update State
      localStorage.setItem(TOKEN_STORAGE_KEY, signature);
      localStorage.setItem(ACCOUNT_STORAGE_KEY, address);

      setSignature(signature);
      updateGlobalUserState(connectRes.user);
      notify("success", "LOGIN_SUCCESS");

      return { connection: true, message: "Successfully connect the user" };
    } catch (err: any) {
      console.log(err)
      const key = normalizeNotificationKey(resolveErrorKey(err));
      notify("error", key);
      return {
        connection: false,
        type: key,
        message: err.message || "Failed to connect user",
      };
    }
  }, [
    getSigner,
    normalizeNotificationKey,
    notify,
    resolveErrorKey,
    setSignature,
    updateGlobalUserState,
  ]);

  // --- 3. Connect by Auth Token (Manual) ---
  const connectByToken = useCallback(
    async (authToken: string) => {
      try {
        // 1. Decode & Verify
        const decodedStr = decodeText(authToken);
        const payload = JSON.parse(decodedStr);
        const address = payload.address;
        const signature = payload.signature;
        const expireAt = payload.expireAt;

        if (!address || !signature || !expireAt) {
          notify("error", "INVALID_TOKEN_FORMAT");
          return { connection: false, type: "INVALID_CONNECTION_SIGNATURE" };
        }

        if (Date.now() > payload.expireAt) {
          notify("error", "TOKEN_EXPIRED");
          return { connection: false, type: "TOKEN_EXPIRED" };
        }

        const recovered = verifyMessage(SIGN_MESSAGE, signature);

        if (recovered.toLowerCase() !== address.toLowerCase()) {
          notify("error", "INVALID_SIGNATURE");
          return { connection: false, type: "INVALID_SIGNATURE" };
        }

        let encryptedToken = await encryptAuthToken(signature);

        if (!encryptedToken) {
          notify("error", "TOKEN_ENCRYPTION_FAILED");
          return { connection: false, type: "TOKEN_ENCRYPTION_FAILED" };
        }

        // 1. Check Existence via API
        const checkRes: any = await Service.connect({
          account: address,
          encryptedToken,
        });

        if (!checkRes?.connect || !checkRes?.user) {
          const key = normalizeNotificationKey(
            checkRes?.message || "USER_NOT_FOUND",
          );
          notify("error", key);
          // User needs to Join
          return { connection: false, type: key };
        }

        if (checkRes.user?.userData?.isBlocked) {
          const key = "BLOCKED_USER";
          notify("error", key, checkRes.user.userData.blockedReason);
          return {
            connection: false,
            type: key,
            message: checkRes.user.userData.blockedReason,
          };
        }
        // 4. Persist & Update State
        localStorage.setItem(ACCOUNT_STORAGE_KEY, address);
        setSignature(signature);
        updateGlobalUserState(checkRes.user);
        notify("success", "SUCCESSFULLY_CONNECTED");

        return { connection: true, type: "CONNECT_SUCCESS" };
      } catch (e) {
        const key = normalizeNotificationKey(resolveErrorKey(e));
        notify("error", key);
        return { connection: false, type: "DEVICE_CONNECT_FAILED" };
      }
    },
    [
      normalizeNotificationKey,
      notify,
      resolveErrorKey,
      setSignature,
      updateGlobalUserState,
    ],
  );

  // --- 4. Join (Register) ---
  const join = useCallback(
    async ({
      account,
      signUpMethod,
      invitationCode,
    }: {
      account: string;
      signUpMethod: string;
      invitationCode?: string;
    }) => {
      if (isConnected == true) {
        notify("error", "DISCONNECT_USER");
        return { joined: false, message: "Disconnect user" };
      }
      const signer = await getSigner();
      if (!signer) {
        notify("error", "WALLET_NOT_CONNECTED");
        return { joined: false, message: "Wallet not connected" };
      }

      // 1. Sign
      const toastId = toast.loading("Signing registration request...");
      const signature = await signer
        .signMessage(SIGN_MESSAGE)
        .catch(() => null);

      if (!signature) {
        notify("error", "SIGNATURE_REJECTED");
        toast.dismiss(toastId);
        return { joined: false, type: "SIGNATURE_REJECTED" };
      }

      const encryptedToken = await encryptAuthToken(signature);

      if (!encryptedToken) {
        toast.dismiss(toastId);
        notify("error", "TOKEN_ENCRYPTION_FAILED");
        return { joined: false, type: "TOKEN_ENCRYPTION_FAILED" };
      }
      toast.dismiss(toastId);

      // 3. API Call
      try {
        const joinRes: any = await Service.joinUser({
          account,
          signUpMethod,
          invitationCode,
          encryptedToken,
        });

        if (joinRes.connect) {
          localStorage.setItem(TOKEN_STORAGE_KEY, signature);
          localStorage.setItem(ACCOUNT_STORAGE_KEY, account);
          setSignature(signature);
          updateGlobalUserState(joinRes.user);
          notify("success", "JOIN_SUCCESS");
          return { joined: true, type: "JOIN_SUCCESS" };
        } else {
          // Clean up if API fails
          localStorage.removeItem(TOKEN_STORAGE_KEY);

          // Map backend errors to notification keys
          let errorType = normalizeNotificationKey(
            joinRes?.message || "JOINING_FAILED",
          );
          if (
            errorType === "JOINING_FAILED" &&
            joinRes?.message?.includes("invitation")
          ) {
            errorType = "INVALID_INVITATION_CODE";
          }
          notify("error", errorType);

          return { joined: false, type: errorType };
        }
      } catch (err: any) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        const key = normalizeNotificationKey(resolveErrorKey(err));
        notify("error", key);
        return { joined: false, type: key, message: err.message };
      }
    },
    [
      getSigner,
      normalizeNotificationKey,
      notify,
      resolveErrorKey,
      setSignature,
      updateGlobalUserState,
    ],
  );

  // --- 5. Withdraw Balance ---
  const withdrawBalance = useCallback(
    async ({
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
      // Validate inputs locally
      if (!receiver || !tokenAddress || !value || !walletAddress) {
        notify("error", "INVALID_USER");
        return { withdraw: false, message: "INVALID_USER" };
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

        if (withdrawResult.success === true) {
          notify("success", "WITHDRAW_SUCCESS");
          return { withdraw: true, message: "WITHDRAW_SUCCESS" };
        }
        notify("error", "WITHDRAW_FAILED");
        return { withdraw: false, message: "WITHDRAW_FAILED" };
      } catch (err: any) {
        //console.error(err);
        // Safe check for nested error message
        const serverMsg = err?.response?.data?.message || err?.message || "";

        if (serverMsg === "Tx failed" || serverMsg.includes("reverted")) {
          notify("error", "TX_FAILED");
          return { withdraw: false, message: "TX_FAILED" };
        }
        const key = normalizeNotificationKey(resolveErrorKey(err));
        notify("error", key === "SERVER_ERROR" ? "WITHDRAW_FAILED" : key);
        return { withdraw: false, message: "WITHDRAW_FAILED" };
      }
    },
    [normalizeNotificationKey, notify, resolveErrorKey],
  );

  // --- 6. Create Wallets ---
  const createNewWallet = useCallback(
    async ({
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

        if (createWalletRes.wallets) {
          setUserWallets(createWalletRes.wallets);
          notify("success", "WALLET_CREATION_SUCCESS");
          return { creation: true, message: "WALLET_CREATION_SUCCESS" };
        }
        notify("error", "WALLET_CREATION_FAILED");
        return { creation: false, message: "WALLET_CREATION_FAILED" };
      } catch (err: any) {
        const key = normalizeNotificationKey(resolveErrorKey(err));
        notify(
          "error",
          key === "SERVER_ERROR" ? "WALLET_CREATION_FAILED" : key,
        );
        return {
          creation: false,
          message: "WALLET_CREATION_FAILED",
          error: err.message,
        };
      }
    },
    [normalizeNotificationKey, notify, resolveErrorKey, setUserWallets],
  );

  // --- 7. Invitation Codes ---
  const createInvitationCode = useCallback(
    async ({
      expireAt,
      invitedTo,
    }: {
      expireAt: number;
      invitedTo: string;
    }) => {
      let creationResult = {
        created: false,
        code: null,
      };
      try {
        let apiResult: any = await Service.createInvitationCode({
          invitedTo,
          expireAt,
          status: "silver",
        });
        if (apiResult.success == true) {
          notify("success", "INVITATION_CREATED_SUCCESS");
          if (apiResult.data.user) {
            setUserState(apiResult.data.user);
          }
          creationResult.code = apiResult.data.code;
          creationResult.created = true;
          return creationResult;
        } else {
          notify("error", apiResult.message);
          return creationResult;
        }
      } catch (err: any) {
        const key = normalizeNotificationKey(resolveErrorKey(err));
        notify(
          "error",
          key === "SERVER_ERROR" ? "INVITATION_CREATION_FAILED" : key,
        );
        return creationResult;
      }
    },
    [normalizeNotificationKey, notify, resolveErrorKey],
  );

  const removeInvitationCode = useCallback(
    async (code: string) => {
      try {
        await Service.deleteInvitationCode({ code });
        notify("success", "INVITATION_REMOVED_SUCCESS");
        return { removed: true, message: "INVITATION_REMOVED_SUCCESS" };
      } catch (err: any) {
        const key = normalizeNotificationKey(resolveErrorKey(err));
        notify(
          "error",
          key === "SERVER_ERROR" ? "INVITATION_REMOVE_FAILED" : key,
        );
        return {
          removed: false,
          message: "INVITATION_REMOVE_FAILED",
        };
      }
    },
    [normalizeNotificationKey, notify, resolveErrorKey],
  );

  const addToken = async ({
    tokenAddress,
    chainId,
  }: {
    tokenAddress: string;
    chainId: number;
  }) => {
    try {
      let res: any = await Service.addToken({ tokenAddress, chainId });
      if (res.success == true) {
        notify("success", "TOKEN_ADDED");
        if(res.user){
          setUserState(res.user)
        }
        return { success: true };
      } else {
        notify("error", res.message);
        return { success: false };
      }
    } catch (err) {
      notify("error", "SERVER_ERROR");
      return { success: false };
    }
  };

  const getPrivateKey = async (walletAddress: string) => {
    let res = await Service.getPrivateKey({ walletAddress });
    return res;
  };

  // --- 8. Disconnect ---
  const disconnect = useCallback(() => {
    Service.disconnect({})
      .then((data) => {
        setIsConnected(false);
        setSignature("");
        setUser({});
        setUserHistories([]);
        setUserWallets([]);
        // Clear storage
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(ACCOUNT_STORAGE_KEY);

        // Optional: Notify user
        notify("success", "LOGIN_SUCCESS", "Disconnected successfully");
      })
      .catch((err) => {
        const key = normalizeNotificationKey(resolveErrorKey(err));
        notify("error", key);
      });
  }, [
    normalizeNotificationKey,
    notify,
    resolveErrorKey,
    setIsConnected,
    setSignature,
    setUser,
    setUserHistories,
    setUserWallets,
  ]);

  return {
    checkUser,
    connectUserByWallet: connect,
    connectUserByAuth: connectByToken,
    joinUser: join,
    withdrawBalance,
    createNewWallet,
    createInvitationCode,
    removeInvitationCode,
    disconnect,
    connectByToken,
    addToken
  };
};
