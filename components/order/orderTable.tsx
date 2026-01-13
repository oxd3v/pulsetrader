import { FiActivity } from "react-icons/fi";
export default function MainOrderTable() {
  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col items-center justify-center text-gray-400">
      <FiActivity className="w-6 h-6 mb-2 opacity-50" />
      <span className="text-sm">Recent Trades & Orders</span>
    </div>
  );
}
