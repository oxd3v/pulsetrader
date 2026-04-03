import { ethers } from "ethers";
import { useEffect, useState, useCallback } from "react";
import ApiService from '@/service/api-service';
import { handleServerErrorToast } from "@/lib/utils";
import toast from "react-hot-toast";

export const usePerpAccount = () => {

    // Helper: Check if MetaMask is injected
    const getPerpBalance = useCallback(async ({ account, perpDex }: { account: string, perpDex: string }) => {
        let response = await ApiService.getPerpBalance({ account, perpDex });
        return response;
    }, []);

    const approveAgent = useCallback(async ({ mainWalletId, agentWallet, dex }: { mainWalletId: string, agentWallet: string, dex: string }) => {
        let approveResult = {
            approved: false,
            error: null as string | null
        }
        try {
            let response: any = await ApiService.approveAgent({
                mainWalletId,
                agentWallet,
                dex
            });
            if (response?.success) {
                approveResult.approved = true;
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
