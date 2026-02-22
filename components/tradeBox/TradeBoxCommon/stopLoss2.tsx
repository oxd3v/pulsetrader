import { useState, useEffect } from "react";
import InfoTooltip from "./BoxTooltip";

interface StopLossInputProps {
  isTrailingMode: boolean;
  isActive: boolean;
  setIsActive: (value: boolean) => void;
  stopLossPercentage: number;
  setStopLossPercentage: (value: number) => void;
  notValid: boolean;
}

const ReEntranceInput = ({
  isTrailingMode,
  isActive,
  setIsActive,
  stopLossPercentage,
  setStopLossPercentage,
  notValid,
}: StopLossInputProps) => {
  // Local string state for the percentage input
  const [inputValue, setInputValue] = useState(String(stopLossPercentage));

  // Sync local state when the prop changes (e.g., slider or external update)
  useEffect(() => {
    setInputValue(String(stopLossPercentage));
  }, [stopLossPercentage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value); // allow free editing
  };

  const handleInputBlur = () => {
    let num = parseFloat(inputValue);
    if (isNaN(num) || num < 1) num = 0; // 0 means disabled (but active is true, so validation will show error)
    if (num > 100) num = 100;
    setStopLossPercentage(num);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setStopLossPercentage(val);
    // No need to update inputValue here because useEffect will sync it
  };

  return (
    <div className="space-y-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
          Stop Loss
          <InfoTooltip
            id="sl-tooltip"
            content={
              isTrailingMode
                ? "Trailing stop loss percentage from highest profit"
                : "Fixed stop loss percentage from entry price"
            }
          />
        </label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {isActive && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={stopLossPercentage}
            onChange={handleSliderChange}
            className={`flex-1 h-2 ${
              notValid ? "bg-red-200" : "bg-gray-200 dark:bg-gray-700"
            } rounded-lg appearance-none cursor-pointer`}
          />
          <div className="w-24">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              className={`w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border ${
                notValid
                  ? "border-red-500"
                  : "border-gray-200 dark:border-gray-700"
              } rounded-lg text-gray-900 dark:text-white`}
            />
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
        </div>
      )}
      {notValid && (
        <div className="text-xs text-red-500">
          {isTrailingMode
            ? "Trailing stop loss requires a value greater than 0"
            : "Stop loss cannot be 0"}
        </div>
      )}
    </div>
  );
};

export default ReEntranceInput;