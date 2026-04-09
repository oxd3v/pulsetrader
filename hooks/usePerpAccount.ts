import { ethers } from "ethers";
import { useEffect, useState, useCallback } from "react";
import ApiService from '@/service/api-service';
import { handleServerErrorToast, notify, notifyFromApiError, notifyWithResponseError } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useShallow } from "zustand/shallow";

export const usePerpAccount = () => {
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
    // Helper: Check if MetaMask is injected
    const getPerpBalance = useCallback(async ({ account, perpDex }: { account: string, perpDex: string }) => {
        let response = await ApiService.getPerpBalance({ account, perpDex });
        return response;
    }, []);

    const approveAgent = useCallback(async ({ mainWalletId, dex }: { mainWalletId: string, dex: string }) => {

        let approveResult = {
            approved: false,
            error: null as string | null
        }
        try {
            let response: any = await ApiService.approveAgent({
                mainWalletId,
                dex
            });
            if (response?.success == true && response.data.wallets) {
                setUserWallets(response.data.wallets);
            }
            if (response?.success == false) {
                notify('error', response.message);
            }

            approveResult.approved = true;
            if (response?.success == true && response.message == 'ALREADY_APPROVED') {
                notify('success', 'ALREADY_APPROVED');
            }
            if (response?.success == true && response.message == 'AGENT_APPROVED') {
                notify('success', 'AGENT_APPROVED');
            }

            return approveResult;

        } catch (err) {

            let key = handleServerErrorToast({ err });
            approveResult.error = key;
            return approveResult;
        }

    }, []);


    return {
        getPerpBalance,
        approveAgent,
    };
};
