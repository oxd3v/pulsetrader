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

import {
  handleServerErrorToast,
  notifyWithResponseError,
  notify,
} from "@/lib/utils";

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

  const setUserState = (userData: any) => {
    setUser({
      account: userData?.account || "",
      status: userData?.status || "silver",
      invites: userData?.invites || [],
      inviter: userData?.inviter || "",
      invitationCodes: userData?.invitationCodes || [],
      isBlocked: userData?.isBlocked || false,
      assetes: userData?.assetes || [],
    });
  };

  // --- Internal Helper: Update Global State ---
  const updateGlobalUserState = useCallback(
    (user: any) => {
      if (!user) return;

      // Safely map user data to store
      setUserState(user.userData);

      setUserOrders(Array.isArray(user.orders) ? user.orders : []);
      //setUserHistories(Array.isArray(user.histories) ? user.histories : []);
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
    let checkResult = { connected: false, error: null as string | null };
    try {
      const apiResponse: any = await Service.checkUser({});

      if (!apiResponse?.connect || !apiResponse?.data?.userData?.account) {
        const key = apiResponse.message || "SERVER_ERROR";
        notify("error", key);
        checkResult.error = key;
        return checkResult;
      }

      if (apiResponse.data?.userData?.isBlocked === true) {
        const key = "BLOCKED_USER";
        notifyWithResponseError(
          "error",
          apiResponse.data?.userData.blockedReason || "User blocked",
        );
        checkResult.error = key;
        return checkResult;
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

      updateGlobalUserState(apiResponse.data);
      notify("success", "SUCCESSFULLY_CONNECTED");
      return checkResult;
    } catch (fGlobalError: any) {
      const key = handleServerErrorToast({ err: fGlobalError });
      checkResult.error = key;
      return checkResult;
    }
  }, [notify, updateGlobalUserState]);

  // --- 2. Connect (Login with Wallet) ---
  const connect = useCallback(async () => {
    let connectionResult = { connection: false, error: null as string | null };
    const signer = await getSigner();
    if (!signer) {
      let key = "WALLET_NOT_CONNECTED";
      notify("error", key);
      connectionResult.error = key;
      return connectionResult;
    }

    try {
      const address = (await signer.getAddress()).toLowerCase();

      // 2. Sign Message
      const toastId = toast.loading("Please sign the login request...");
      const signature = await signer.signMessage(SIGN_MESSAGE).catch((e) => {
        // User rejected signature
        // let key = "USER_REJECTED_SIGNATURE";
        // notify("error", key);
        // connectionResult.error = key;
        // return connectionResult;
        return null;
      });

      if (!signature) {
        let key = "SIGNATURE_FAILED";
        notify("error", key);
        connectionResult.error = key;
        return connectionResult;
      }
      let encryptedToken = await encryptAuthToken(signature as string).catch(
        (err) => {
          // let key = "SIGNATURE_AUTHENTICATION_FAILED";
          // notify("error", key);
          // connectionResult.error = key;
          // return connectionResult;
          return null;
        },
      );

      if (!encryptedToken) {
        let key = "SIGNATURE_AUTHENTICATION_FAILED";
        notify("error", key);
        connectionResult.error = key;
        return connectionResult;
      }
      toast.dismiss(toastId);

      // 1. Check Existence via API
      const apiResponse: any = await Service.connect({
        account: address,
        encryptedToken,
      });

      if (!apiResponse?.connect || !apiResponse?.data?.userData?.account) {
        let key = apiResponse.message || "SERVER_ERROR";
        notify("error", key);
        connectionResult.error = key;
        return connectionResult;
      }

      if (apiResponse.data?.userData?.isBlocked === true) {
        const key = "BLOCKED_USER";
        notifyWithResponseError(
          "error",
          apiResponse.data?.userData.blockedReason || "User blocked",
        );
        connectionResult.error = key;
        return connectionResult;
      }
      // 4. Persist & Update State
      localStorage.setItem(TOKEN_STORAGE_KEY, signature as string);
      localStorage.setItem(ACCOUNT_STORAGE_KEY, address);

      setSignature(signature);
      updateGlobalUserState(apiResponse.data);
      notify("success", "LOGIN_SUCCESS");
      connectionResult.connection = true;
      return connectionResult;
    } catch (apiError: any) {
      let key = handleServerErrorToast({ err: apiError });
      connectionResult.error = key;
      return connectionResult;
    }
  }, [getSigner, notify, setSignature, updateGlobalUserState]);

  // --- 3. Connect by Auth Token (Manual) ---
  const connectByToken = useCallback(
    async (authToken: string) => {
      let connectionResult = {
        connection: false,
        error: null as string | null,
      };
      try {
        // 1. Decode & Verify
        const decodedStr = decodeText(authToken);
        const payload = JSON.parse(decodedStr);
        const address = payload.address;
        const signature = payload.signature;
        const expireAt = payload.expireAt;

        if (!address || !signature || !expireAt) {
          let key = "INVALID_TOKEN_FORMAT";
          notify("error", key);
          connectionResult.error = key;
          return connectionResult;
        }

        if (Date.now() > payload.expireAt) {
          let key = "TOKEN_EXPIRED";
          notify("error", key);
          connectionResult.error = key;
          return connectionResult;
        }

        const recovered = verifyMessage(SIGN_MESSAGE, signature);

        if (recovered.toLowerCase() !== address.toLowerCase()) {
          let key = "INVALID_SIGNATURE";
          notify("error", key);
          connectionResult.error = key;
          return connectionResult;
        }

        let encryptedToken = await encryptAuthToken(signature as string).catch(
          (err) => {
            // let key = "SIGNATURE_AUTHENTICATION_FAILED";
            // notify("error", key);
            // connectionResult.error = key;
            // return connectionResult;
            return null;
          },
        );

        if (!encryptedToken) {
          let key = "SIGNATURE_AUTHENTICATION_FAILED";
          notify("error", key);
          connectionResult.error = key;
          return connectionResult;
        }

        // 1. Check Existence via API
        const apiResponse: any = await Service.connect({
          account: address,
          encryptedToken,
        });

        if (!apiResponse?.connect || !apiResponse?.data?.userData?.account) {
          const key = apiResponse.message || "SERVER_ERROR";
          notify("error", key);
          connectionResult.error = key;
          return connectionResult;
        }

        if (apiResponse.data?.userData?.isBlocked) {
          const key = "BLOCKED_USER";
          notifyWithResponseError(
            "error",
            apiResponse.user?.userData.blockedReason || "User blocked",
          );
          connectionResult.error = key;
          return connectionResult;
        }
        // 4. Persist & Update State
        localStorage.setItem(ACCOUNT_STORAGE_KEY, address);
        setSignature(signature);
        updateGlobalUserState(apiResponse.data);
        notify("success", "SUCCESSFULLY_CONNECTED");
        connectionResult.connection = true;
        return connectionResult;
      } catch (apiError) {
        let key = handleServerErrorToast({ err: apiError });
        connectionResult.error = key;
        return connectionResult;
      }
    },
    [notify, setSignature, updateGlobalUserState],
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
      let joinedResult = {
        joined: false,
        error: null as string | null,
      };
      if (isConnected == true) {
        let key = "DISCONNECT_USER";
        notify("error", key);
        joinedResult.error = key;
        return joinedResult;
      }
      const signer = await getSigner();
      if (!signer) {
        let key = "WALLET_NOT_CONNECTED";
        notify("error", key);
        joinedResult.error = key;
        return joinedResult;
      }

      const address = (await signer.getAddress()).toLowerCase();

      // 1. Sign
      const toastId = toast.loading("Signing registration request...");
      const signature = await signer
        .signMessage(SIGN_MESSAGE)
        .catch((sigError) => {
          // User rejected signature
          // let key = "USER_REJECTED_SIGNATURE";
          // notify("error", key);
          // joinedResult.error = key;
          // return joinedResult;
          return null;
        });

      if (!signature) {
        toast.dismiss(toastId);
        let key = "SIGNATURE_FAILED";
        notify("error", key);
        joinedResult.error = key;
        return joinedResult;
      }
      let encryptedToken = await encryptAuthToken(signature as string).catch(
        (err) => {
          // let key = "SIGNATURE_AUTHENTICATION_FAILED";
          // notify("error", key);
          // joinedResult.error = key;
          // return joinedResult;
          return null;
        },
      );

      if (!encryptedToken) {
        let key = "SIGNATURE_AUTHENTICATION_FAILED";
        notify("error", key);
        joinedResult.error = key;
        return joinedResult;
      }
      toast.dismiss(toastId);

      // 3. API Call
      try {
        const apiResponse: any = await Service.joinUser({
          account: account || address,
          signUpMethod,
          invitationCode,
          encryptedToken,
        });
        console.log(apiResponse, !apiResponse.joined, !apiResponse?.data?.userData?.account);
        console.log(!apiResponse.joined || !apiResponse?.data?.userData?.account)

        if (!apiResponse.joined || !apiResponse?.data?.userData?.account) {
          // Clean up if API fails
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          let key = apiResponse.message || "SERVER_ERROR";
          notify("error", key);
          joinedResult.error = key;
          return joinedResult;
        }
        
        localStorage.setItem(TOKEN_STORAGE_KEY, signature);
        localStorage.setItem(ACCOUNT_STORAGE_KEY, account);
        setSignature(signature);
        updateGlobalUserState(apiResponse.data);
        notify("success", "JOIN_SUCCESS");
        joinedResult.joined = true;
        return joinedResult;
      } catch (err: any) {
        //console.log(err)
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        const key = handleServerErrorToast({ err });
        joinedResult.error = key;
        return joinedResult;
      }
    },
    [getSigner, notify, setSignature, updateGlobalUserState],
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
      let withdrawResult = {
        success: false,
        signature: null,
        fee: null,
        error: null as string | null,
      };

      if (!receiver) {
        let key = "INVALID_RECEIVER";
        notifyWithResponseError("error", "Receiver required");
        withdrawResult.error = key;
        return withdrawResult;
      }

      if (!value) {
        let key = "INVALID_WITHDRAW_AMOUNT";
        notifyWithResponseError("error", "Enter valid withdraw amount");
        withdrawResult.error = key;
        return withdrawResult;
      }

      if (!tokenAddress) {
        let key = "INVALID_WITHDRAW_ASSET_ADDRESS";
        notifyWithResponseError("error", "Invalid token address");
        withdrawResult.error = key;
        return withdrawResult;
      }

      if (!walletAddress) {
        let key = "INVALID_WITHDRAW_WALLET_ADDRESS";
        notifyWithResponseError("error", "Invalid wallet address");
        withdrawResult.error = key;
        return withdrawResult;
      }

      try {
        let apiResponse: any = await Service.withdraw({
          receiver,
          tokenAddress,
          chainId,
          value,
          walletAddress,
          tokenDecimals,
          tokenSymbol,
        });

        if (!apiResponse.success || !apiResponse?.data?.signature) {
          let key = apiResponse.message || "SERVER_ERROR";
          notify("success", key);
          withdrawResult.error = key;
          return withdrawResult;
        }
        notify("success", "WITHDRAW_SUCCESS");
        withdrawResult.success = true;
        withdrawResult.signature = apiResponse?.data?.signature;
        return withdrawResult;
      } catch (err: any) {
        let key = handleServerErrorToast({ err });
        withdrawResult.error = key;
        return withdrawResult;
      }
    },
    [notify],
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
      let creationResult = { created: false, error: null as string | null };
      try {
        let apiResponse: any = await Service.createNewWallet({
          evmWallets,
          svmWallets,
        });

        if (!apiResponse.success) {
          let key = apiResponse.message || "SERVER_ERROR";
          notify("error", key);
          creationResult.error = key;
          return creationResult;
        }
        notify("success", "WALLET_CREATION_SUCCESS");
        creationResult.created = true;
        if (apiResponse?.data?.wallets) {
          setUserWallets(apiResponse.data.wallets);
        } else {
          notifyWithResponseError("success", "Network congested refresh page");
        }
        return creationResult;
      } catch (err: any) {
        let key = handleServerErrorToast({ err });
        creationResult.error = key;
        return creationResult;
      }
    },
    [notify, setUserWallets],
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
        error: null as string | null,
      };
      if (!invitedTo) {
        let key = "INVALID_INVITED_TO";
        notifyWithResponseError("error", "Enter valid invitation receiver");
        creationResult.error = key;
        return creationResult;
      }
      try {
        let apiResponse: any = await Service.createInvitationCode({
          invitedTo,
          expireAt,
          status: "silver",
        });
        if (!apiResponse.success || !apiResponse?.data?.code) {
          let key = apiResponse.message || "SERVER_ERROR";
          notify("error", key);
          return creationResult;
        }
        if (apiResponse.data.userData) {
          setUserState(apiResponse.data.userData);
        } else {
          notifyWithResponseError(
            "error",
            "Network congested. Refresh the page",
          );
        }
        notify("success", "INVITATION_CREATED_SUCCESS");
        creationResult.code = apiResponse.data.code;
        creationResult.created = true;
        return creationResult;
      } catch (err: any) {
        let key = handleServerErrorToast({ err });
        console.log(key)
        creationResult.error = key;
        return creationResult;
      }
    },
    [notify],
  );

  const removeInvitationCode = useCallback(
    async (code: string) => {
      let removeResult = { removed: false, error: null as string | null };
      if (!code) {
        let key = "INVITATION_CODE_NOT_FOUND";
        notifyWithResponseError("error", "Invitation code required");
        removeResult.error = key;
        return removeResult;
      }
      try {
        let apiResponse: any = await Service.deleteInvitationCode({ code });
        if (!apiResponse.success) {
          let key = apiResponse.message || "SERVER_ERROR";
          notify("error", key);
          removeResult.error = key;
          return removeResult;
        }
        notify("success", "INVITATION_REMOVED_SUCCESS");
        if (apiResponse.data.userData) {
          setUserState(apiResponse.data.userData);
        } else {
          notifyWithResponseError(
            "error",
            "Network congested. Refresh the page",
          );
        }

        removeResult.removed = true;
        return removeResult;
      } catch (err: any) {
        let key = handleServerErrorToast({ err });
        removeResult.error = key;
        return removeResult;
      }
    },
    [notify],
  );

  const addToken = async ({
    tokenAddress,
    chainId,
    add
  }: {
    tokenAddress: string;
    chainId: number;
    add:boolean
  }) => {
    let additionResult = { success: false, error: null as string | null };
    try {
      let apiResponse: any = await Service.addToken({ tokenAddress, chainId, add });
      if (!apiResponse.success) {
        let key = apiResponse.message || "SERVER_ERROR";
        notify("error", key);
        additionResult.error = key;
        return additionResult;
      }
      notify("success", add ? "TOKEN_ADDED_SUCCESS" : "TOKEN_REMOVED_SUCCESS");
      if (apiResponse.data.userData) {
        setUserState(apiResponse.data.userData);
      } else {
        notifyWithResponseError("error", "Network congested. Refresh the page");
      }
      additionResult.success = true;
      return additionResult;
    } catch (err) {
      let key = handleServerErrorToast({ err });
      additionResult.error = key;
      return additionResult;
    }
  };

  const getPrivateKey = async (walletAddress: string) => {
    let decryptionResult = {
      decrypted: false,
      key: null,
      error: null as string | null,
    };
    try {
      let apiResponse: any = await Service.getPrivateKey({ walletAddress });
      if (!apiResponse.success || !apiResponse?.data?.key) {
        let key = apiResponse.message || "SERVER_ERROR";
        notify("error", key);
        decryptionResult.error = key;
        return decryptionResult;
      }
      decryptionResult.decrypted = true;
      decryptionResult.key = apiResponse?.data?.key;
      return decryptionResult;
    } catch (err) {
      let key = handleServerErrorToast({ err });
      decryptionResult.error = key;
      return decryptionResult;
    }
  };

  const getUserHistory = async ({
    page,
    limit = 50,
    walletAddress,
    walletId
  }: {
    page: number;
    limit: number;
    walletAddress:string,
    walletId:string
  }) => {
    let historiesResult = {
      success: false,
      histories: null,
      error: null as string | null,
    };
    try {
      let apiResponse: any = await Service.getUserHistories({ page, limit, walletAddress, walletId });
      if (!apiResponse.success || !apiResponse?.data?.histories) {
        let key = apiResponse.message || "SERVER_ERROR";
        notify("error", key);
        historiesResult.error = key;
        return historiesResult;
      }
      historiesResult.success = true;
      historiesResult.histories = apiResponse?.data?.histories;
      return historiesResult;
    } catch (err) {
      let key = handleServerErrorToast({ err });
      historiesResult.error = key;
      return historiesResult;
    }
  };

  // --- 8. Disconnect ---
  const disconnect = useCallback(async () => {
    let disconnectResult = { disconnect: false, error: null as string | null };
    try {
      let apiResponse: any = await Service.disconnect({});
      if (!apiResponse.disconnect) {
        let key = apiResponse.message || "SERVER_ERROR";
        notify("error", key);
        disconnectResult.error = key;
        return disconnectResult;
      }
      setIsConnected(false);
      setSignature("");
      setUser({});
      setUserHistories([]);
      setUserWallets([]);
      // Clear storage
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(ACCOUNT_STORAGE_KEY);
      notifyWithResponseError("success", "Disconnected successfully");
      disconnectResult.disconnect = true;
      return disconnectResult;
    } catch (err) {
      let key = handleServerErrorToast({ err });
      disconnectResult.error = key;
      return disconnectResult;
    }
  }, [
    notify,
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
    addToken,
    getPrivateKey,
    getUserHistory,
  };
};
