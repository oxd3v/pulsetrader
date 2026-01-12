interface OrderPriorityProps {
    priority: number;
    executionSpeed: string;
    setPriority: (value: number) => void;
    setExecutionSpeed: (value: string) => void;
    user: any;
}

const OrderPriority = ({
    priority,
    executionSpeed,
    setPriority,
    setExecutionSpeed,
    user
}: OrderPriorityProps) => {
    const priorityOptions = [
        { value: 1, label: "High Priority", description: "Faster execution, higher fees" },
        { value: 2, label: "Standard Priority", description: "Normal execution speed" }
    ];
    
    const speedOptions = [
        { value: "fast", label: "Fast Execution" },
        { value: "standard", label: "Standard Execution" },
        { value: "slow", label: "Slow Execution" }
    ];
    
    return (
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Order Priority
                </label>
                <select
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {priorityOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="mt-1 text-xs text-gray-500">
                    {priorityOptions.find(opt => opt.value === priority)?.description}
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    Execution Speed
                </label>
                <select
                    value={executionSpeed}
                    onChange={(e) => setExecutionSpeed(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {speedOptions.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default OrderPriority;