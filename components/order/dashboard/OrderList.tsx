import { useState, useEffect, useRef } from "react";
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

export default function OrderList({
  network,
  userOrders,
  orderCategory,
  walletAddress,
  isConnected,
  tokenInfo
}: OrderListParams) {
  
  const { getOrders } = useSpotOrder();
  
  // State
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState(orderCategory);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // View Mode
  const [isTableOrder, setIsTableOrder] = useState<boolean>(true);
  const [isGmxPosition, setIsGmxPosition] = useState<boolean>(false);
  
  // Data
  const [gmxOpenedPositionOrders, setGmxOpenedPositionOrders] = useState<Record<string, any>>({});
  const gmxPositionUpdateIntervalRef = useRef<NodeJS.Timeout>(null);

  // ------------------------------------------------------------------
  // Filtering Logic
  // ------------------------------------------------------------------
  const filteredOrders = userOrders.filter((order: ORDER_TYPE) => {
    // 1. Network Filter
    if (order.chainId !== network) return false;

    // 2. Category Filter
    if (categoryFilter !== 'all') {
        if (order.category !== categoryFilter) return false;
    }
    

    // 3. Market Filter (Optional specific market match)
    // Note: Adjust logic if selectedMarket is an object or string
    // if (selectedMarket) {
    //    const marketAddr = typeof selectedMarket === 'string' ? selectedMarket : selectedMarket.indexTokenAddress;
    //    if (order.orderAsset?.orderToken?.address?.toLowerCase() !== marketAddr?.toLowerCase()) return false;
    // }

    // 4. Status Filter
    if (statusFilter !== 'all') {
        if (order.orderStatus !== statusFilter) return false;
    }

    // 5. Search Term (Name or ID)
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
            order.name.toLowerCase().includes(term) || 
            (order._id && order._id.toLowerCase().includes(term))
        );
    }

    return true;
  });


  // Sorting
  const sortedOrders = [...filteredOrders].sort((a: any, b: any) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      
      if (sortOrder === 'asc') {
          return new Date(valA).getTime() - new Date(valB).getTime();
      } else {
          return new Date(valB).getTime() - new Date(valA).getTime();
      }
  });

  // ------------------------------------------------------------------
  // GMX Position Updates
  // ------------------------------------------------------------------


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
              stats: { total: 0, pending: 0, opened: 0, reverted: 0, closed: 0 }
          };
      }
      
      groups[key].orders.push(order);
      groups[key].stats.total++;
      
      switch(order.orderStatus) {
          case 'PENDING': groups[key].stats.pending++; break;
          case 'OPENED': groups[key].stats.opened++; break;
          case 'REVERTED': 
          case 'CANCELLED': groups[key].stats.reverted++; break;
          case 'COMPLETED': groups[key].stats.closed++; break;
      }
      
      return groups;
  }, {} as Record<string, any>);


  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  const handleRefresh = async () => {
      setIsLoading(true);
      await getOrders();
      setIsLoading(false);
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  if (!isConnected) {
    return (
      <div className="mt-6 p-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-300 mb-2">Connect Wallet</h3>
          <p className="text-gray-500 mb-6 text-sm">Please connect your wallet to view and manage your orders.</p>
          <Link href={'/connect'}>
            <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors">
              <BiWallet className="w-5 h-5" /> Connect Wallet
            </button>
          </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden h-[800px]"> {/* Fixed height container or allow grow */}
      
      {/* Header Toolbar */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Title & Stats */}
            <div className="flex items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Orders</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {userOrders.length} Total • {sortedOrders.length} Filtered
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* View Switcher */}
                <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                    <button 
                        onClick={() => setIsTableOrder(false)}
                        disabled
                        className={`p-1.5 rounded ${!isTableOrder ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-500'}`}
                        title="Group View"
                    >
                        <CiGrid2H className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setIsTableOrder(true)}
                        className={`p-1.5 rounded ${isTableOrder ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-500'}`}
                        title="Table View"
                    >
                        <CiGrid41 className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter Toggle (Mobile/Desktop) */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors
                    ${showFilters 
                        ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800' 
                        : 'bg-white border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'}`}
                >
                    <FiFilter className="w-4 h-4" /> Filters
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
                            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-full mb-3">
                      <FiSearch className="w-8 h-8 opacity-50" />
                  </div>
                  <p>No orders found matching your filters.</p>
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