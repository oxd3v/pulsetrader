import { useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';

interface DropDownOption {
    label: React.ReactNode;
    value: any;
}

interface DropDownProps {
    options: DropDownOption[];
    onChange: (value: any) => void;
    value: any;
}

const DropDown = ({ options, onChange, value }: DropDownProps) => {
    const [isOpen, setIsOpen] = useState(false);

    // Match by address (case-insensitive) or object identity only.
    // Do not match by symbol alone — the same symbol can refer to different
    // contracts per chain; matching symbol would show the wrong token while
    // `value` still held the previous chain's object.
    const selectedOption = options.find((opt) => {
        const a = opt.value?.address?.toLowerCase?.();
        const b = value?.address?.toLowerCase?.();
        if (a && b && a === b) return true;
        return opt.value === value;
    });

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-900 rounded-lg text-white dark:text-black text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
                <div className="flex items-center gap-2 text-black dark:text-white">
                    {selectedOption?.label || "Select..."}
                </div>
                <FiChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-900 rounded-lg shadow-lg">
                    {options.map((option, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left text-white text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DropDown;
