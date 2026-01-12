import InfoTooltip from "./BoxTooltip";

// NumberInput Component
interface NumberInputProps {
  inputLabel: string;
  toolTipMessage: string;
  value: number;
  onChange: (value: number) => void;
  notValid: boolean;
  selectTagOptions?: Array<{ label: string; value: number }>;
}

const NumberInput = ({
  inputLabel,
  toolTipMessage,
  value,
  onChange,
  notValid,
  selectTagOptions,
}: NumberInputProps) => {
  return (
    <div className="space-y-1 md:space-y-2">
      <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-200">
        {inputLabel}
        <InfoTooltip id={`${inputLabel}-tooltip`} content={toolTipMessage} />
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          step="0.1"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`flex-1 px-3 py-2 bg-white dark:bg-gray-800 border ${
            notValid ? "border-red-500" : "border-gray-200 dark:border-gray-700"
          } rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
        {/* {selectTagOptions && (
          <div className="flex gap-1">
            {selectTagOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`px-2 py-1 text-xs rounded-lg border ${
                  value === option.value
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )} */}
      </div>
    </div>
  );
};

export default NumberInput;

