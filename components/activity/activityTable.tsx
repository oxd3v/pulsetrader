import { useState, useEffect, useCallback } from 'react';
import { useUserAuth } from "@/hooks/useAuth";
import { ACTIVITY_TYPE } from "@/type/common";
import ActivityCard from './activityCard';
import { 
  FiRefreshCw, 
  FiChevronLeft, 
  FiChevronRight, 
  FiLoader 
} from "react-icons/fi";
import { FaHistory } from "react-icons/fa";

export default function ActivityDashboard({ user }: { user: any }) {
  const [page, setPage] = useState(1);
  const [limit] = useState(10); // Items per page
  const [histories, setHistories] = useState<ACTIVITY_TYPE[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State to track if there are more items
  const [hasMore, setHasMore] = useState(true);

  const { getUserHistory } = useUserAuth();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (loading) return;
    
    try {
      const response:any = await getUserHistory({ page, limit });
      
      if (response.success && Array.isArray(response.histories)) {
        setHistories(response.histories);
        
        // If we received fewer items than the limit, we've likely reached the end
        if (response.histories.length < limit) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      } else {
        setError(response.error || "Failed to load history.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, getUserHistory]);

  // Initial fetch and on page change
  useEffect(() => {
    fetchHistory();
  }, []);

  // Handlers
  const handleNext = () => {
    if (hasMore && !loading) setPage((p) => p + 1);
  };

  const handlePrev = () => {
    if (page > 1 && !loading) setPage((p) => p - 1);
  };

  return (
    <div className="w-full max-w-5xl h-full  mx-auto p-4 space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <FaHistory className="w-6 h-6 text-indigo-600" />
            Transaction History
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            View your recent wallet activities, swaps, and transfers.
          </p>
        </div>
        
        <button 
          onClick={fetchHistory}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Content Section */}
      <div className="h-full overflow-y-auto scrollbar-track-transparent [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-gray-700 [&::-webkit-scrollbar-thumb]:bg-indigo-600 [&::-webkit-scrollbar-thumb]:rounded-full">
        {loading && histories.length === 0 ? (
          // Loading Skeleton
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : error ? (
          // Error State
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500 bg-zinc-50 rounded-xl border border-dashed border-zinc-300">
            <p className="mb-2">{error}</p>
            <button onClick={fetchHistory} className="text-indigo-600 underline text-sm">Try Again</button>
          </div>
        ) : histories.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-300">
            <FaHistory className="w-12 h-12 mb-3 opacity-20" />
            <p>No transactions found.</p>
          </div>
        ) : (
          // Data Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {histories.map((activity) => (
              <ActivityCard 
                key={activity._id || activity.txHash} 
                activityDetails={activity} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {!loading && histories.length > 0 && (
        <div className="flex justify-between items-center pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <span className="text-sm text-zinc-500">
            Page <span className="font-medium text-zinc-900">{page}</span>
          </span>
          
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              disabled={page === 1 || loading}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium border rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={!hasMore || loading}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              Next
              <FiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}