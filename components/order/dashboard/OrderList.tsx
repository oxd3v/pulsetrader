import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  FiSearch,
  FiX,
  FiAlertCircle,
  FiFilter,
} from "react-icons/fi";
import { BiWallet } from "react-icons/bi";
import { CiGrid2H, CiGrid41 } from "react-icons/ci";
import { RiRefreshLine } from "react-icons/ri";

// Types
import { ORDER_TYPE, OrderStatusType } from "@/type/order";

// Hooks & Store
import { useSpotOrder } from "@/hooks/useSpotOrder";

// Components
import StrategyGrouped from "./StrategyGrouped";
import OrderTable from "./OrderTable";

interface OrderListParams {
  network: number;
  userOrders: ORDER_TYPE[];
  orderCategory: string; // 'all' | 'spot' | 'perpetual'
  walletAddress: string | undefined;
  isConnected: boolean;
  tokenInfo?: any;
}

// Helper to detect mobile screen on first render (SSR-safe)
function getInitialTableView(): boolean {
  if (typeof window === "undefined") return true;
  return window.innerWidth >= 768;
}

export default function OrderList({
  network,
  userOrders,
  orderCategory,
  walletAddress,
  isConnected,
  tokenInfo,
}: OrderListParams) {
  const { getOrders } = useSpotOrder();

  // State
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState(orderCategory);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // View Mode — table on desktop, grid on mobile
  const [isTableOrder, setIsTableOrder] = useState<boolean>(getInitialTableView);

  // Data
  const [gmxOpenedPositionOrders, setGmxOpenedPositionOrders] = useState<Record<string, any>>({});
  const [isGmxPosition, setIsGmxPosition] = useState<boolean>(false);
  const gmxPositionUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ------------------------------------------------------------------
  // Sync categoryFilter when the orderCategory prop changes
  // ------------------------------------------------------------------
  useEffect(() => {
    setCategoryFilter(orderCategory);
  }, [orderCategory]);

  // ------------------------------------------------------------------
  // Responsive: switch view automatically on resize
  // ------------------------------------------------------------------
  useEffect(() => {
    function handleResize() {
      setIsTableOrder(window.innerWidth >= 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ------------------------------------------------------------------
  // Filtering Logic
  // ------------------------------------------------------------------
  
  const filteredOrders = userOrders.filter((o) => {
    // Network filter
    if (network !== undefined && network !== o.chainId) return false;

    // Token filter
    if (tokenInfo?.address) {
      const orderTokenAddress = o.orderAsset?.orderToken?.address;
      if (
        !orderTokenAddress ||
        tokenInfo.address.toLowerCase() !== orderTokenAddress.toLowerCase()
      ) {
        return false;
      }
    }

    // Category filter
    if (categoryFilter !== "all" && o.category !== categoryFilter) return false;

    // Status filter
    if (statusFilter !== "all" && o.orderStatus !== statusFilter) return false;

    // Search filter — applied additively, not as a short-circuit override
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesName = o.name?.toLowerCase().includes(term) ?? false;
      const matchesId = o._id?.toLowerCase().includes(term) ?? false;
      if (!matchesName && !matchesId) return false;
    }

    return true;
  });

  // ------------------------------------------------------------------
  // Sorting — safe date comparison with fallback to 0
  // ------------------------------------------------------------------
  const sortedOrders = [...filteredOrders].sort((a: any, b: any) => {
    const timeA = a[sortBy] ? new Date(a[sortBy]).getTime() : 0;
    const timeB = b[sortBy] ? new Date(b[sortBy]).getTime() : 0;
    // Treat NaN as 0
    const safeA = isNaN(timeA) ? 0 : timeA;
    const safeB = isNaN(timeB) ? 0 : timeB;
    return sortOrder === "asc" ? safeA - safeB : safeB - safeA;
  });

  // ------------------------------------------------------------------
  // Grouping Logic
  // ------------------------------------------------------------------
  const groupedOrders = sortedOrders.reduce((groups, order) => {
    const key = order.name || "Untitled";
    if (!groups[key]) {
      groups[key] = {
        orders: [],
        strategy: order.strategy,
        category: order.category,
        stats: { total: 0, pending: 0, opened: 0, reverted: 0, closed: 0 },
      };
    }

    groups[key].orders.push(order);
    groups[key].stats.total++;

    switch (order.orderStatus) {
      case "PENDING":
        groups[key].stats.pending++;
        break;
      case "OPENED":
        groups[key].stats.opened++;
        break;
      case "REVERTED":
      case "CANCELLED":
        groups[key].stats.reverted++;
        break;
      case "COMPLETED":
        groups[key].stats.closed++;
        break;
    }

    return groups;
  }, {} as Record<string, any>);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await getOrders();
    } catch (e) {
      setError("Failed to refresh orders. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = () => {
    setCategoryFilter(orderCategory);
    setStatusFilter("all");
    setSearchTerm("");
    setSortBy("createdAt");
    setSortOrder("desc");
  };

  const hasActiveFilters =
    categoryFilter !== orderCategory ||
    statusFilter !== "all" ||
    searchTerm !== "" ||
    sortBy !== "createdAt" ||
    sortOrder !== "desc";

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  if (!isConnected) {
    return (
      <div className="mt-6 p-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-300 mb-2">
          Connect Wallet
        </h3>
        <p className="text-gray-500 mb-6 text-sm">
          Please connect your wallet to view and manage your orders.
        </p>
        <Link href={"/connect"}>
          <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors">
            <BiWallet className="w-5 h-5" /> Connect Wallet
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden h-[800px]">

      {/* Header Toolbar */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Orders</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {userOrders.length} Total • {sortedOrders.length} Filtered
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher */}
            <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
              <button
                onClick={() => setIsTableOrder(false)}
                className={`p-1.5 rounded ${
                  !isTableOrder
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                    : "text-gray-500"
                }`}
                title="Group View"
              >
                <CiGrid2H className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsTableOrder(true)}
                className={`p-1.5 rounded ${
                  isTableOrder
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"
                    : "text-gray-500"
                }`}
                title="Table View"
              >
                <CiGrid41 className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors
                ${
                  showFilters || hasActiveFilters
                    ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800"
                    : "bg-white border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                }`}
            >
              <FiFilter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh Orders"
            >
              <RiRefreshLine className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Filters Section */}
        {showFilters && (
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-grow">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Select */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="spot">Spot</option>
                <option value="perpetual">Perpetual</option>
              </select>

              {/* Status Select */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="OPENED">Opened</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="createdAt">Sort: Created</option>
                <option value="updatedAt">Sort: Updated</option>
              </select>

              {/* Sort Order */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800 transition-colors whitespace-nowrap"
                >
                  <FiX className="w-4 h-4" /> Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
            <FiAlertCircle /> {error}
          </div>
        )}

        {sortedOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <div className="p-1 lg:p-4 bg-gray-50 dark:bg-gray-800 rounded-full mb-3">
              <FiSearch className="w-8 h-8 opacity-50" />
            </div>
            <p>No orders found matching your filters.</p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="mt-3 text-sm text-blue-500 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {isTableOrder ? (
              <OrderTable
                orders={sortedOrders}
                isGmxPosition={isGmxPosition}
                orderGmxPositionData={gmxOpenedPositionOrders}
              />
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedOrders).map(([name, data]: [string, any]) => (
                  <StrategyGrouped
                    key={name}
                    strategyName={name}
                    groupData={data}
                    isGmxPosition={isGmxPosition}
                    orderGmxPositionData={gmxOpenedPositionOrders}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}