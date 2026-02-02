import { useState } from "react";

interface ConfirmationProps {
  handleSubmit: any;
  handleCloseModel: any;
}

export default function ConfirmationBox({
    handleSubmit,
    handleCloseModel,
  }: ConfirmationProps) {
  const [isPending, setIsPending] = useState(false);
  const handleConfirmation = async () => {
    setIsPending(true);
    try {
      await handleSubmit();
    } catch (err) {
    } finally {
      setIsPending(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
          Confirm Order Creation
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Are you sure you want to create this order? This action cannot be
          undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleCloseModel}
            className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmation}
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
