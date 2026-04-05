import { useMemo, useState, useEffect } from "react";
import InfoTooltip from "./BoxTooltip";

interface LeverageInputProps {
  leverage: number;
  onLeverageChange: (value: number) => void;
  maxLeverage?: number;
}

const LeverageInput = ({
  leverage,
  onLeverageChange,
  maxLeverage,
}: LeverageInputProps) => {
  const resolvedMaxLeverage = useMemo(() => {
    const parsedMax = Number(maxLeverage);
    if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
      return 50;
    }

    return Math.max(1, Math.floor(parsedMax));
  }, [maxLeverage]);
  const [inputValue, setInputValue] = useState(String(leverage));

  useEffect(() => {
    setInputValue(String(leverage));
  }, [leverage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    let num = parseFloat(inputValue);
    if (isNaN(num) || num < 0) num = 0;
    if (num > resolvedMaxLeverage) num = resolvedMaxLeverage;
    onLeverageChange(num);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    onLeverageChange(val);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
          Leverage
          <InfoTooltip
            id="leverage-tooltip"
            content="Leverage to use for the position"
          />
        </label>

      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min="0"
          max={resolvedMaxLeverage}
          step="1"
          value={leverage}
          onChange={handleSliderChange}
          className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="w-24">
          <input
            type="number"
            min="0"
            max={resolvedMaxLeverage}
            step="1"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
          />
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">X</span>
      </div>

    </div>
  );
};

export default LeverageInput;
