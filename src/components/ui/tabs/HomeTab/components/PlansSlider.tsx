import React from "react";
import { motion } from "framer-motion";
import { PiStrategyBold } from "react-icons/pi";
import { HiOutlineArrowNarrowRight } from "react-icons/hi";
import { AiOutlineExport } from "react-icons/ai";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { formatInterval, type DCAPlan } from "../../../../../lib/api";

interface PlansSliderProps {
  isLoading: boolean;
  isConnected: boolean;
  userPlans: DCAPlan[];
  currentPlanIndex: number;
  router: any;
  openPlanModal: (plan: DCAPlan) => void;
  goToNextPlan: () => void;
  goToPrevPlan: () => void;
  setCurrentPlanIndex: (index: number | ((prev: number) => number)) => void;
  triggerHaptic: () => void;
}

export function PlansSlider({
  isLoading,
  isConnected,
  userPlans,
  currentPlanIndex,
  router,
  openPlanModal,
  goToNextPlan,
  goToPrevPlan,
  setCurrentPlanIndex,
  triggerHaptic,
}: PlansSliderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Active Strategies</h3>
      </div>

      <div className="space-y-4">
        {/* Show loading state */}
        {isLoading && (
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/20 animate-pulse">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl"></div>
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-white/20 rounded w-32"></div>
                <div className="h-3 bg-white/20 rounded w-24"></div>
              </div>
              <div className="h-6 w-16 bg-white/20 rounded-full"></div>
            </div>
            <div className="space-y-3">
              <div className="h-20 bg-white/10 rounded-2xl"></div>
              <div className="h-16 bg-white/10 rounded-2xl"></div>
              <div className="h-12 bg-white/10 rounded-2xl"></div>
            </div>
          </div>
        )}

        {/* Show message when no plans */}
        {!isLoading && userPlans.length === 0 && (
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/20 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#c199e4]/20">
              <PiStrategyBold className="text-[#c199e4] size-8" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">
              No Active Strategies
            </h4>

            {isConnected && (
              <>
                <p className="text-white/70 text-sm mb-4">
                  Set up a recurring, automated crypto investment with a simple
                  DCA strategy
                </p>
                <div className="text-xs text-white/50">
                  Start small, invest consistently, and let the agent handle the
                  execution.
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => router.push("/chat")}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#c199e4]/20 to-[#b380db]/10 hover:from-[#c199e4]/30 hover:to-[#b380db]/20 text-white text-sm font-semibold rounded-2xl border border-[#c199e4]/30 hover:border-[#c199e4]/50 transition-all duration-300"
                  >
                    Start a Strategy
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
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </button>
                </div>
              </>
            )}
            <p className="text-white/70 text-sm mb-4">
              {!isConnected &&
                "Connect your wallet to create your first DCA strategy."}
            </p>
          </div>
        )}

        {/* Plan Card */}
        {!isLoading && userPlans.length > 0 && userPlans[currentPlanIndex] && (
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 hover:shadow-xl hover:from-[#c199e4]/10 hover:to-white/10 group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center group-hover:from-[#c199e4]/30 group-hover:to-[#c199e4]/20 transition-all duration-300 border border-[#c199e4]/20 group-hover:scale-110">
                  <PiStrategyBold className="text-[#c199e4] size-6" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-white group-hover:text-[#c199e4] transition-colors duration-300 mb-1">
                    DCA Strategy #{currentPlanIndex + 1}
                  </h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-white/90 font-medium">
                      {userPlans[currentPlanIndex].fromToken}
                    </span>
                    <HiOutlineArrowNarrowRight />
                    <span className="text-sm text-white/90 font-medium">
                      {userPlans[currentPlanIndex].toToken}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <span
                  className={`text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 ${
                    userPlans[currentPlanIndex].jobStatus === "completed"
                      ? "bg-green-400/20 text-green-300 border border-green-400/40 group-hover:bg-green-400/30"
                      : userPlans[currentPlanIndex].jobStatus === "running"
                      ? "bg-blue-400/20 text-blue-300 border border-blue-400/40 group-hover:bg-blue-400/30"
                      : userPlans[currentPlanIndex].jobStatus === "pending"
                      ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 group-hover:bg-yellow-400/30"
                      : userPlans[currentPlanIndex].jobStatus === "deleted"
                      ? "bg-red-400/20 text-red-300 border border-red-400/40 group-hover:bg-red-400/30"
                      : "bg-gray-400/20 text-gray-300 border border-gray-400/40"
                  }`}
                >
                  {(userPlans[currentPlanIndex].jobStatus ||
                    userPlans[currentPlanIndex].status ||
                    "Unknown") === "pending"
                    ? "Live"
                    : userPlans[currentPlanIndex].jobStatus ||
                      userPlans[currentPlanIndex].status ||
                      "Unknown"}
                </span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-white/5 to-transparent rounded-2xl p-4 border border-white/10 hover:border-[#c199e4]/30 transition-all duration-300 group/item">
                  <p className="text-xs text-white/70 mb-2 font-medium">
                    Investment Amount
                  </p>
                  <p className="text-2xl font-bold text-white group-hover/item:text-[#c199e4] transition-colors duration-300">
                    {parseFloat(userPlans[currentPlanIndex].amount).toFixed(5)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-white/5 to-transparent rounded-2xl p-4 border border-white/10 hover:border-[#c199e4]/30 transition-all duration-300 group/item">
                  <p className="text-xs text-white/70 mb-2 font-medium">
                    Frequency
                  </p>
                  <p className="text-2xl font-bold text-white group-hover/item:text-[#c199e4] transition-colors duration-300">
                    {formatInterval(
                      userPlans[currentPlanIndex].intervalSeconds ||
                        (userPlans[currentPlanIndex].intervalMinutes
                          ? userPlans[currentPlanIndex].intervalMinutes * 60
                          : 0)
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-[#c199e4]/10 to-transparent rounded-2xl p-4 border border-[#c199e4]/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-white/90 font-medium">
                    Total Invested
                  </p>
                  <p className="text-sm text-[#c199e4] font-medium">
                    {userPlans[currentPlanIndex].successCount > 0
                      ? `${userPlans[currentPlanIndex].successCount}/${userPlans[currentPlanIndex].totalExecutions} executions`
                      : "No executions"}
                  </p>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-2xl font-bold text-[#c199e4]">
                    {userPlans[currentPlanIndex].successCount > 0
                      ? (
                          parseFloat(userPlans[currentPlanIndex].amount) *
                            userPlans[currentPlanIndex].successCount || 0
                        ).toFixed(5)
                      : "0.00"}
                  </p>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-[#c199e4] to-emerald-400 h-3 rounded-full transition-all duration-700 shadow-sm"
                    style={{
                      width: `${
                        (userPlans[currentPlanIndex].successCount /
                          userPlans[currentPlanIndex].totalExecutions) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                triggerHaptic();
                openPlanModal(userPlans[currentPlanIndex]);
              }}
              className="w-full bg-gradient-to-r from-[#c199e4]/20 to-[#c199e4]/10 hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 text-sm border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg group-hover:scale-[1.02]"
            >
              <div className="flex items-center justify-center gap-2">
                <span>View Strategy Details</span>
                <AiOutlineExport className="size-5" />
              </div>
            </button>
          </div>
        )}

        {userPlans.length > 1 && (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-[11px] text-white/60">
              <span>Plan</span>
              <span className="font-semibold text-white">
                {currentPlanIndex + 1}
              </span>
              <span className="opacity-70">/ {userPlans.length}</span>
            </div>
            {/* <div className="w-full max-w-[180px] h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#c199e4] to-[#b380db] rounded-full transition-all duration-300"
                style={{
                  width: `${
                    ((currentPlanIndex + 1) / Math.max(userPlans.length, 1)) *
                    100
                  }%`,
                }}
              />
            </div> */}
          </div>
        )}

        {/* Navigation Controls */}
        {userPlans.length > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={goToPrevPlan}
              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white/80 hover:text-white transition-all duration-300 flex items-center justify-center backdrop-blur-lg"
              aria-label="Previous plan"
            >
              <FaChevronLeft />
            </button>

            <button
              onClick={goToNextPlan}
              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white/80 hover:text-white transition-all duration-300 flex items-center justify-center backdrop-blur-lg"
              aria-label="Next plan"
            >
              <FaChevronRight />
            </button>
          </div>
        )}
      </div>

      {/* Plan Indicator / Progress */}
    </div>
  );
}
