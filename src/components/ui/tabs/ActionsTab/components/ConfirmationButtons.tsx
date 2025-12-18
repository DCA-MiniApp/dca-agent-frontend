import React from "react";

interface ConfirmationButtonsProps {
  confirmationId: string;
  confirmationStatus?: string;
  isPlanCreationLoading: boolean;
  isApprovalLoading: boolean;
  isApprovePending: boolean;
  isApprovalConfirming: boolean;
  onApprove: (confirmationId: string) => void;
  onCancel: (confirmationId: string) => void;
}

export function ConfirmationButtons({
  confirmationId,
  confirmationStatus,
  isPlanCreationLoading,
  isApprovalLoading,
  isApprovePending,
  isApprovalConfirming,
  onApprove,
  onCancel,
}: ConfirmationButtonsProps) {
  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
      {/* Show status badge if user has clicked a button */}
      {confirmationStatus === "proceeding" ? (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-200 border border-blue-500/30 rounded-lg">
          <div className="w-4 h-4 border-2 border-blue-200 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Processing...</span>
        </div>
      ) : confirmationStatus === "cancelled" ? (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-500/20 text-gray-200 border border-gray-500/30 rounded-lg">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <span className="text-sm font-medium">Cancelled</span>
        </div>
      ) : confirmationStatus === "completed" ? (
        <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-200 border border-green-500/30 rounded-lg">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-sm font-medium">Completed</span>
        </div>
      ) : (
        /* Show buttons only when status is pending or undefined */
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => onApprove(confirmationId)}
            disabled={
              isPlanCreationLoading ||
              isApprovalLoading ||
              isApprovePending ||
              isApprovalConfirming
            }
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isApprovePending || isApprovalConfirming ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isApprovePending
                  ? "Wallet Approval..."
                  : "Confirming Approval..."}
              </>
            ) : isApprovalLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {confirmationId?.startsWith("approve-")
                  ? "Starting Approval..."
                  : "Creating Plan..."}
              </>
            ) : isPlanCreationLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {confirmationId?.startsWith("approve-")
                  ? "Proceed with Approval"
                  : "Review Plan Details"}
              </>
            )}
          </button>
          <button
            onClick={() => onCancel(confirmationId)}
            disabled={
              isPlanCreationLoading ||
              isApprovalLoading ||
              isApprovePending ||
              isApprovalConfirming
            }
            className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
