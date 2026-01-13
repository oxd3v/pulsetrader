import { create } from 'zustand';
import { ORDER_TYPE } from '@/type/order';

type IndicatorOnChartType = {
    resolution: string,
    period: number,
    indicatorName: string
}


export const store = create((set) => ({
    ordersOnChart: [],
    setOrdersOnChart: (ordersOnChart:ORDER_TYPE[]) => set({ ordersOnChart }),
    indicatorOnChart: {indicatorName: "Relative Strength Index", period: 14, resolution: "1"},
    setIndicatorOnChart: (ordersOnChart:IndicatorOnChartType | null) => set({ ordersOnChart })
}))

export const useChartDataStore = store;