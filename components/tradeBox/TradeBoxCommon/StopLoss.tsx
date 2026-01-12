
import InfoTooltip from "./BoxTooltip";

interface StopLossInputProps {
    isTrailingMode: boolean;
    value: number;
    onChange: (value: number) => void;
    notValid: boolean;
}

const StopLossInput = ({ isTrailingMode, value, onChange, notValid }: StopLossInputProps) => {
    return (
        <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
                Stop Loss
                <InfoTooltip
                    id="sl-tooltip"
                    content={isTrailingMode ? 
                        "Trailing stop loss percentage from highest profit" : 
                        "Fixed stop loss percentage from entry price"
                    }
                />
            </label>
            <div className="flex items-center gap-3">
                <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    className={`flex-1 h-2 ${notValid ? 'bg-red-200' : 'bg-gray-200 dark:bg-gray-700'} rounded-lg appearance-none cursor-pointer`}
                />
                <div className="w-24">
                    <input
                        type="number"
                        min="0"
                        max="50"
                        step="1"
                        value={value}
                        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
                        className={`w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border ${notValid ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-lg text-gray-900 dark:text-white`}
                    />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
            </div>
            {notValid && (
                <div className="text-xs text-red-500">
                    {isTrailingMode ? "Trailing stop loss requires a value greater than 0" : "Stop loss cannot be 0"}
                </div>
            )}
        </div>
    );
};

export default StopLossInput;