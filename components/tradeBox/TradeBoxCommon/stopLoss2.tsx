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
  const handleStopLossChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Remove non-numeric characters and handle empty string
    const rawValue = e.target.value.replace(/^0+/, ''); 
    
    // 2. Convert to number
    const value = parseInt(rawValue);

    // 3. Validation: check if it's a valid number between 1 and 100
    if (!isNaN(value)) {
        if (value >= 1 && value <= 100) {
            setStopLossPercentage(value);
        } else if (value > 100) {
            setStopLossPercentage(100); // Optional: cap at 100
        }
    } else {
        // Allow the field to be empty so the user can delete the number
        setStopLossPercentage(0); 
    }
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
            onChange={(e) => setStopLossPercentage(parseInt(e.target.value))}
            className={`flex-1 h-2 ${notValid ? "bg-red-200" : "bg-gray-200 dark:bg-gray-700"} rounded-lg appearance-none cursor-pointer`}
          />
          <div className="w-24">
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={stopLossPercentage}
              onChange={(e) => handleStopLossChange(e)}
              className={`w-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border ${notValid ? "border-red-500" : "border-gray-200 dark:border-gray-700"} rounded-lg text-gray-900 dark:text-white`}
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
