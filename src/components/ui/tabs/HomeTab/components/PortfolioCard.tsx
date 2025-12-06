import React from "react";
import { HiOutlineChartBar } from "react-icons/hi";
import { type Context } from "@farcaster/miniapp-sdk";

interface PortfolioCardProps {
  isLoading: boolean;
  portfolioUsd: number | null;
  isConnected: boolean;
  runningPlans: any[];
  activePlans: any[];
  context?: Context.MiniAppContext;
}

export function PortfolioCard({
  isLoading,
  portfolioUsd,
  isConnected,
  runningPlans,
  activePlans,
  context,
}: PortfolioCardProps) {
  return (
    <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 hover:shadow-lg hover:from-[#c199e4]/5 hover:to-white/5 group overflow-hidden">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center group-hover:from-[#c199e4]/30 group-hover:to-[#c199e4]/20 transition-all duration-300 border border-[#c199e4]/20 flex-shrink-0">
              <HiOutlineChartBar className="text-[#c199e4] size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-white group-hover:text-[#c199e4] transition-colors duration-300 break-words">
                Portfolio Overview
              </h2>
              <p className="text-sm text-white/70 break-words">
                Your investment performance
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                <p className="text-3xl font-bold text-[#c199e4]">
                  {isLoading || portfolioUsd === null || !isConnected
                    ? "$0.00"
                    : `$${portfolioUsd?.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`}
                </p>
                <span className="text-sm text-white/60 font-medium">
                  Total Invested
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-nowrap">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse flex-shrink-0"></div>
                <span className="text-xs sm:text-sm text-white/90 font-medium whitespace-nowrap">
                  {isLoading
                    ? "Loading..."
                    : `Active Strategies: ${runningPlans.length}`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse flex-shrink-0"></div>
                <span className="text-xs sm:text-sm text-white/90 font-medium whitespace-nowrap">
                  Plan Created: {activePlans.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="ml-2 sm:ml-4 md:ml-6 flex flex-col items-end flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-purple-400/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 overflow-hidden">
            {context?.user?.pfpUrl ? (
              <img
                src={context.user.pfpUrl}
                alt="Farcaster Profile"
                className="w-11 h-11 rounded-2xl object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <img
                src={
                  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTvAyrN5PLmvXRRHsJOVxJZN1SRscvJQLL33Q&s"
                }
                alt="Farcaster Profile"
                className="w-11 h-11 rounded-2xl object-cover"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
