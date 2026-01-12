import { create } from 'zustand';
import {  User, History } from '@/type/common';
import { ORDER_TYPE } from '@/type/order';

//import { SampleOrders, mockHistoryData, mockWallets } from '@/constant/common/order';


export const store = create((set) => ({
    network: 43114,
    setNetwork: (network: number) => set({ network }),
    token: '',
    setToken: (token:string) => set({ token }),
    userOrders: [],
    setUserOrders: (userOrders: ORDER_TYPE[]) => set({ userOrders }),
    user: {},
    setUser: (user:User) => set({ user }),
    userWallets: [],
    setUserWallets: (userWallets:any) => set({ userWallets }),
    userHistories: [],
    setUserHistories: (userHistories: History[]) => set({ userHistories }),
    isConnected: false,
    setIsConnected: (isConnected:boolean) => set({ isConnected }),
    userConnectedWallet: '',
    setUserConnectedWallet: (userConnectedWallet:string) => set({ userConnectedWallet }),
}))

export const useStore = store;