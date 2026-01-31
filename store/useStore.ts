import { create } from 'zustand';
import {  User, ACTIVITY_TYPE } from '@/type/common';
import { ORDER_TYPE } from '@/type/order';


import { mockWallets } from '@/constants/common/mock';

export const store = create((set) => ({
    network: 43114,
    setNetwork: (network: number) => set({ network }),
    signature:null,
    setSignature: (signature:string)=> set({signature}),
    userTokens: [],
    setUserTokens: (userTokens:string[]) => set({ userTokens }),
    userOrders: [],
    setUserOrders: (userOrders: ORDER_TYPE[]) => set({ userOrders }),
    user: {},
    setUser: (user:User) => set({ user }),
    userWallets: mockWallets,
    setUserWallets: (userWallets:any) => set({ userWallets }),
    userHistories: [],
    setUserHistories: (userHistories: ACTIVITY_TYPE[]) => set({ userHistories }),
    isConnected: false,
    setIsConnected: (isConnected:boolean) => set({ isConnected }),
    userConnectedWallet: '',
    setUserConnectedWallet: (userConnectedWallet:string) => set({ userConnectedWallet }),
}))

export const useStore = store;