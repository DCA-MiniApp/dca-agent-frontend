import React from "react";

interface PlatformStatsCardProps {
  isQuickStatsLoading: boolean;
  totalExecutions: number;
  totalValueSwapped: number;
}

export function PlatformStatsCard({
  isQuickStatsLoading,
  totalExecutions,
  totalValueSwapped,
}: PlatformStatsCardProps) {
  return (
    <div className="group relative overflow-hidden bg-gradient-to-r from-[#c199e4]/10 to-white/5 rounded-3xl p-6 border border-[#c199e4]/30 shadow-lg flex flex-col gap-4 mb-4 hover:shadow-xl hover:border-[#c199e4]/50 transition-all duration-500">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Platform Statistics
            </h2>
            <p className="text-xs text-slate-400 mt-1">Across all users</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="group/card rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-slate-700/30 p-4 transition-all duration-300 hover:border-purple-500/40">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs text-slate-400 font-medium">
                Executions
              </span>
            </div>
            <div className="space-y-1">
              {isQuickStatsLoading ? (
                <div className="h-8 w-20 bg-slate-700 rounded animate-pulse" />
              ) : (
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-300">
                  {totalExecutions.toLocaleString()}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-400">Successful</span>
              </div>
            </div>
          </div>

          <div className="group/card rounded-xl bg-gradient-to-br from-white/5 to-transparent border border-slate-700/30 p-4 transition-all duration-300 hover:border-emerald-500/40">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs text-slate-400 font-medium">Volume</span>
            </div>
            <div className="space-y-1">
              {isQuickStatsLoading ? (
                <div className="h-8 w-24 bg-slate-700 rounded animate-pulse" />
              ) : (
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
                  ${totalValueSwapped.toFixed(2)}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-xs text-slate-400">Total swapped</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-700/30">
          <p className="text-xs text-slate-500">
            Updated <span className="text-slate-400">2 minutes ago</span>
          </p>
        </div>
      </div>
    </div>
  );
}
