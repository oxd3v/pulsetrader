import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import {
  FiCopy,
  FiMoreVertical,
  FiEye,
  FiX,
  FiTrash2,
  FiEyeOff,
} from "react-icons/fi";
import { RiHistoryFill } from "react-icons/ri";

// Type
import { ORDER_TYPE } from "@/type/order";

// Hooks
import { useSpotOrder } from "@/hooks/useSpotOrder";
import ConfirmationModal from "@/components/common/Confirmation/ConfirmationBox";

// Store
import { useStore } from "@/store/useStore";
import { useChartDataStore } from "@/store/useChartData";
import { useShallow } from "zustand/shallow";

// Modal
// import HistoryModal from "@/components/History/modals/HistoryModal";

interface OrderActionProps {
  order: ORDER_TYPE;
}

const OrderActions = React.memo(({ order }: OrderActionProps) => {
  const { deleteOrder, closeOrder } = useSpotOrder();
  const { ordersOnChart, setOrdersOnChart } = useChartDataStore(
    useShallow((state: any) => ({
      ordersOnChart: state.ordersOnChart,
      setOrdersOnChart: state.setOrdersOnChart,
    })),
  );
  const { userHistories } = useStore(
    useShallow((state: any) => ({
      userHistories: state.userHistories,
    })),
  );

  const [showActions, setShowActions] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Update menu position when opened
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Calculate position: align right edge of menu with right edge of button
      // Assuming menu width is approx 180px (w-48)
      setMenuPosition({
        top: rect.bottom + 5, // 5px gap
        left: rect.right - 192, // 192px is w-48 width
      });
    }
    setShowActions((prev) => !prev);
  };

  // Close when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowActions(false);
      }
    };

    const handleScroll = () => {
      if (showActions) setShowActions(false);
    };

    if (showActions) {
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true); // Capture scroll on any element
      window.addEventListener("resize", handleScroll);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [showActions]);

  const handleDeleteOrder = () => setShowDeleteModal(true);
  const confirmDelete = async () => {
    try {
      let deleteResult = await deleteOrder(order);
      setShowDeleteModal(false);
      setShowActions(false);
    } catch (err) {
      toast.error("failed to delete order");
    }
  };

  const confirmClose = async () => {
    try {
      let closeResult: any = await closeOrder(order);
      setShowCloseModal(false);
      setShowActions(false);
    } catch (err) {
      toast.error("failed to delete order");
    }
  };

  const handleCloseOrder = () => setShowCloseModal(true);

  const isOrderOnChart = (orderId: string) => {
    return ordersOnChart?.some((o: ORDER_TYPE) => o._id === orderId);
  };

  const handleOrderChartToggle = (orderId: string) => {
    if (!orderId) return;
    if (isOrderOnChart(orderId)) {
      setOrdersOnChart(
        ordersOnChart.filter((o: ORDER_TYPE) => o._id !== orderId),
      );
    } else {
      setOrdersOnChart([...ordersOnChart, order]);
    }
  };

  // Logic for "Show on Chart" visibility
  const canShowOnChart =
    (order.orderStatus === "PENDING" &&
      order.entry.isTechnicalEntry == false) ||
    (order.orderStatus === "OPENED" &&
      order.exit.isTechnicalExit == false &&
      order.exit?.takeProfit?.takeProfitPrice != "0");

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={`p-2 rounded-lg transition-colors ${
          showActions
            ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
        }`}
      >
        <FiMoreVertical className="w-4 h-4" />
      </button>

      {/* Portal for Dropdown Menu */}
      {showActions &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              position: "fixed", // Fixed breaks out of table overflow
            }}
            className="z-[9999] w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="py-1">
              {canShowOnChart && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (order._id) handleOrderChartToggle(order._id);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
                >
                  {order._id && isOrderOnChart(order._id) ? (
                    <FiEyeOff className="w-4 h-4" />
                  ) : (
                    <FiEye className="w-4 h-4" />
                  )}
                  {order._id && isOrderOnChart(order._id)
                    ? "Hide from Chart"
                    : "Show on Chart"}
                </button>
              )}

              {order.orderStatus === "OPENED" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseOrder();
                    // Don't close menu yet, let modal handle it or close manually
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2 text-orange-600 dark:text-orange-400"
                >
                  <FiX className="w-4 h-4" />
                  Close Position
                </button>
              )}

              <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteOrder();
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Delete Order
                </button>

              {/* <button
                  onClick={(e) => {
                      e.stopPropagation();
                      setOpenHistoryModal(true);
                      setShowActions(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
              >
                  <RiHistoryFill className="w-4 h-4" />
                  Transaction Log
              </button> */}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (order._id) {
                    navigator.clipboard.writeText(order._id);
                    toast.success("Order ID copied");
                  }
                  setShowActions(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200 border-t border-gray-100 dark:border-gray-700"
              >
                <FiCopy className="w-4 h-4" />
                Copy Order ID
              </button>
            </div>
          </div>,
          document.body,
        )}

      {/* Modals remain inline as they usually use Portals internally or fixed position */}
      {/* <HistoryModal isOpen={openHistoryModal} txs={userHistories.filter((history:any)=> history.order && history.order == order._id)} onClose={()=>setOpenHistoryModal(false)}/> */}

      {showDeleteModal && (
        <ConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          title="Delete Order"
          description="Are you sure you want to delete this order? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      )}

      {order?.orderStatus === "OPENED" && showCloseModal && (
        <ConfirmationModal
          isOpen={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          onConfirm={confirmClose}
          title="Close Order"
          description="Are you sure you want to close this order?"
          confirmText="Close"
          cancelText="Cancel"
          variant="destructive"
        />
      )}
    </>
  );
});

export default OrderActions;
