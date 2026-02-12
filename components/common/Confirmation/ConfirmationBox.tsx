import React, { useState, useEffect } from "react";
import { FiAlertTriangle, FiInfo, FiX, FiLoader } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning";
  isLoading?: boolean; // Optional external loading state
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  isLoading: externalLoading = false,
}: ConfirmationModalProps) {
  const [isInternalLoading, setIsInternalLoading] = useState(false);

  // Reset internal loading state when modal opens/closes
  useEffect(() => {
    if (isOpen) setIsInternalLoading(false);
  }, [isOpen]);

  const handleConfirmClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isInternalLoading || externalLoading) return;

    setIsInternalLoading(true);
    try {
      return await onConfirm();
    } catch (error) {
      console.error("Confirmation action failed", error);
    } finally {
      setIsInternalLoading(false);
    }
  };

  // Determine styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case "destructive":
        return {
          icon: <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><FiAlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500" /></div>,
          button: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
        };
      case "warning":
        return {
          icon: <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full"><FiAlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-500" /></div>,
          button: "bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500",
        };
      default:
        return {
          icon: <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"><FiInfo className="w-6 h-6 text-blue-600 dark:text-blue-500" /></div>,
          button: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
        };
    }
  };

  const styles = getVariantStyles();
  const isLoading = isInternalLoading || externalLoading;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden p-4 sm:p-6 backdrop-blur-sm">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={!isLoading ? onClose : undefined}
            className="fixed inset-0 bg-gray-900/50 transition-opacity"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md transform rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-2xl transition-all"
          >
            {/* Close Button (Top Right) */}
            {!isLoading && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}

            <div className="p-6">
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-4">
                {/* Icon */}
                {styles.icon}

                {/* Text Content */}
                <div className="w-full">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-6 mb-2">
                    {title}
                  </h3>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {description}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={onClose}
                  className="inline-flex w-full justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all sm:w-auto"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleConfirmClick}
                  className={`inline-flex w-full justify-center items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all sm:w-auto ${styles.button}`}
                >
                  {isLoading && <FiLoader className="w-4 h-4 animate-spin" />}
                  {isLoading ? "Processing..." : confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}