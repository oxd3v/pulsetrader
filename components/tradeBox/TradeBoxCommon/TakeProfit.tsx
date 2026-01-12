import {useMemo, useState } from 'react';
import InfoTooltip from './BoxTooltip';

interface TakeProfitInputProps {
    takeProfitPercentage: number;
    onTakeProfitPercentageChange: (value: number) => void;
    isTrailingMode: boolean;
    handleTrailingMode: (value: boolean) => void;
    initialOrderSize: string;
    collateralToken:any;
}

const TakeProfitInput = ({
    takeProfitPercentage,
    onTakeProfitPercentageChange,
    isTrailingMode,
    handleTrailingMode,
    initialOrderSize,
    collateralToken
}: TakeProfitInputProps) => {
    const tpAmount = useMemo(() => {
        if (!initialOrderSize) return "0";
        const size = parseFloat(initialOrderSize);
        if (isNaN(size)) return "0";
        return (size * ((takeProfitPercentage) / 100)).toFixed(2);
    }, [initialOrderSize, takeProfitPercentage]);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
                    Take Profit
                    <InfoTooltip
                        id="tp-tooltip"
                        content="Percentage profit target to close position"
                    />
                </label>
                <div className="flex items-center gap-2">
                    <label className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                        <input
                            type="checkbox"
                            checked={isTrailingMode}
                            onChange={(e) => handleTrailingMode(e.target.checked)}
                            className="w-4 h-4 mr-1 text-blue-500 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        Trailing Mode
                    </label>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={takeProfitPercentage}
                    onChange={(e) => onTakeProfitPercentageChange(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="w-24">
                    <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={takeProfitPercentage}
                        onChange={(e) => onTakeProfitPercentageChange(parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                    />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
            </div>
            <div className="text-xs text-gray-500">
                TP Amount: {tpAmount} {collateralToken.symbol}
            </div>
        </div>
    );
};

export default TakeProfitInput;