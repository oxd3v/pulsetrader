import { create } from 'zustand';
import {  User, ACTIVITY_TYPE } from '@/type/common';
import { ORDER_TYPE } from '@/type/order';


import { mockWallets } from '@/constants/common/mock';

export const store = create((set) => ({
    network: 43114,
    setNetwork: (network: number) => set({ network }),
    token: '',
    setToken: (token:string) => set({ token }),
    userOrders: [],
    setUserOrders: (userOrders: ORDER_TYPE[]) => set({ userOrders }),
    user: { account: '0x8048fde03eEC8Aee712d667FA65f0F125fc1BBeA'},
    setUser: (user:User) => set({ user }),
    userWallets: mockWallets,
    setUserWallets: (userWallets:any) => set({ userWallets }),
    userHistories: [],
    setUserHistories: (userHistories: ACTIVITY_TYPE[]) => set({ userHistories }),
    isConnected: true,
    setIsConnected: (isConnected:boolean) => set({ isConnected }),
    userConnectedWallet: '',
    setUserConnectedWallet: (userConnectedWallet:string) => set({ userConnectedWallet }),
}))

export const useStore = store;