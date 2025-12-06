import React from "react";
import { motion } from "framer-motion";
import { PiStrategyBold } from "react-icons/pi";
import { formatInterval, formatDuration, type DCAPlan } from "../../../../../lib/api";
import { getShortTimezone } from "../utils/helpers";

interface PlanDetailsModalProps {
  showPlanModal: boolean;
  selectedPlan: DCAPlan | null;
  isDeleting: boolean;
  closePlanModal: () => void;
  handleDeletePlan: (plan: DCAPlan) => Promise<void>;
}

export function PlanDetailsModal({
  showPlanModal,
  selectedPlan,
  isDeleting,
  closePlanModal,
  handleDeletePlan,
}: PlanDetailsModalProps) {
  if (!showPlanModal || !selectedPlan) return null;

  // Check if plan is completed
  const isPlanCompleted = selectedPlan.jobStatus === "completed";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closePlanModal}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-md mx-auto bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl shadow-2xl border border-[#c199e4]/20 max-h-[calc(100vh-2rem)] overflow-y-auto"
      >
        <div className="p-4 sm:p-5 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center border border-[#c199e4]/20">
                <PiStrategyBold className="text-[#c199e4] size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#c199e4]">
                  DCA Strategy
                </h3>
                <p className="text-xs text-white/70 flex items-center gap-2">
                  {selectedPlan.fromToken} → {selectedPlan.toToken}
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      selectedPlan.jobStatus === "completed"
                        ? "bg-green-400/20 text-green-300 border border-green-400/40"
                        : selectedPlan.jobStatus === "running"
                        ? "bg-blue-400/20 text-blue-300 border border-blue-400/40"
                        : selectedPlan.jobStatus === "pending"
                        ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/40"
                        : selectedPlan.jobStatus === "deleted"
                        ? "bg-red-400/20 text-red-300 border border-red-400/40"
                        : "bg-gray-400/20 text-gray-300 border border-gray-400/40"
                    }`}
                  >
                    {(selectedPlan.jobStatus ||
                      selectedPlan.status ||
                      "Unknown") === "pending"
                      ? "Live"
                      : selectedPlan.jobStatus ||
                        selectedPlan.status ||
                        "Unknown"}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={closePlanModal}
              className="text-white/70 hover:text-white transition-colors duration-200 p-1.5 hover:bg-white/10 rounded-lg flex-shrink-0"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {/* Plan Details Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="backdrop-blur-lg rounded-xl p-2.5 border border-[#c199e4]/20">
              <p className="text-xs text-gray-400 mb-1 font-medium">Amount</p>
              <p className="text-sm font-bold text-white">
                {parseFloat(selectedPlan.amount).toFixed(5)}{" "}
                {selectedPlan.fromToken}
              </p>
            </div>
            <div className="backdrop-blur-lg rounded-xl p-2.5 border border-[#c199e4]/20">
              <p className="text-xs text-gray-400 mb-1 font-medium">Interval</p>
              <p className="text-sm font-bold text-white">
                {formatInterval(
                  selectedPlan.intervalSeconds ||
                    (selectedPlan.intervalMinutes
                      ? selectedPlan.intervalMinutes * 60
                      : 0)
                )}
              </p>
            </div>
            <div className="backdrop-blur-lg rounded-xl p-2.5 border border-[#c199e4]/20">
              <p className="text-xs text-gray-400 mb-1 font-medium">Duration</p>
              <p className="text-sm font-bold text-white">
                {formatDuration(
                  selectedPlan.durationSeconds ||
                    (selectedPlan.durationWeeks
                      ? selectedPlan.durationWeeks * 604800
                      : 0)
                )}
              </p>
            </div>
            <div className="backdrop-blur-lg rounded-xl p-2.5 border border-[#c199e4]/20">
              <p className="text-xs text-gray-400 mb-1 font-medium">Slippage</p>
              <p className="text-sm font-bold text-white">
                {parseFloat(selectedPlan.slippage).toFixed(2)}%
              </p>
            </div>
            <div className="backdrop-blur-lg rounded-xl p-2.5 border border-[#c199e4]/20 col-span-2">
              <p className="text-xs text-gray-400 mb-1 font-medium">Progress</p>
              <p className="text-sm font-bold text-white">
                {selectedPlan.successCount}/{selectedPlan.totalExecutions}
              </p>
            </div>
            <div className="backdrop-blur-lg rounded-xl p-2.5 border border-[#c199e4]/20 col-span-2">
              <p className="text-xs text-gray-400 mb-1 font-medium">
                Total Invested
              </p>
              <p className="text-sm font-bold text-white">
                {(
                  parseFloat(selectedPlan.amount) *
                  Number(selectedPlan.successCount || 0)
                ).toFixed(5)}{" "}
                {selectedPlan.fromToken}
              </p>
            </div>
            {/* Created date - full width if completed, half width otherwise */}
            <div className={`backdrop-blur-lg rounded-xl p-2.5 border border-[#c199e4]/20 ${isPlanCompleted ? 'col-span-2' : ''}`}>
              <p className="text-xs text-gray-400 mb-1 font-medium">
                Created ({getShortTimezone()})
              </p>
              <p className="text-sm font-bold text-white">
                {new Date(selectedPlan.createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "UTC",
                })}
              </p>
            </div>

            {/* Next Execution - only show if plan is not completed */}
            {!isPlanCompleted && (
              <div className="backdrop-blur-lg rounded-xl p-2.5 border border-[#c199e4]/20">
                <p className="text-xs text-gray-400 mb-1 font-medium">
                  Next Execution ({getShortTimezone()})
                </p>
                <p className="text-sm font-bold text-white">
                  {(() => {
                    const taskData = selectedPlan.jobData?.data?.taskData;
                    if (
                      !taskData ||
                      !Array.isArray(taskData) ||
                      taskData.length === 0 ||
                      !selectedPlan.intervalSeconds
                    )
                      return "N/A";

                    const latestTask = taskData.reduce((latest, current) =>
                      current.task_id > latest.task_id ? current : latest
                    );

                    if (!latestTask.execution_timestamp) return "N/A";

                    const lastExecutionTime = new Date(
                      latestTask.execution_timestamp
                    );
                    const nextExecutionTime = new Date(
                      lastExecutionTime.getTime() +
                        selectedPlan.intervalSeconds * 1000
                    );

                    return nextExecutionTime.toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    });
                  })()}
                </p>
              </div>
            )}
          </div>

          {/* Delete Button - only show if plan is not completed */}
          {!isPlanCompleted && (
            <div className="pt-2">
              <button
                onClick={() => handleDeletePlan(selectedPlan)}
                className={`w-full bg-gradient-to-r from-red-500/20 to-red-500/10 hover:from-red-500/30 hover:to-red-500/20 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-300 text-sm border border-red-500/30 hover:border-red-500/50 ${
                  isDeleting ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Plan"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
