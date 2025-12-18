import React from "react";

interface QuickActionButtonsProps {
  showCreatePlanTokens: boolean;
  onShowMyPlans: () => void;
  onToggleCreatePlan: (show: boolean) => void;
  onShowStats: () => void;
  onShowHelp: () => void;
  onQuickCreateToken: (token: string) => void;
}

const QUICK_CREATE_TOKENS = ["WETH", "ARB", "WBTC", "GMX", "AAVE", "wstETH"];

export function QuickActionButtons({
  showCreatePlanTokens,
  onShowMyPlans,
  onToggleCreatePlan,
  onShowStats,
  onShowHelp,
  onQuickCreateToken,
}: QuickActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {!showCreatePlanTokens ? (
        <>
          <button
            onClick={onShowMyPlans}
            className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
          >
            My Plans
          </button>
          <button
            onClick={() => onToggleCreatePlan(true)}
            className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
          >
            Create Plan
          </button>
          <button
            onClick={onShowStats}
            className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
          >
            Stats
          </button>
          <button
            onClick={onShowHelp}
            className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
          >
            Help
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => onToggleCreatePlan(false)}
            className="px-3 py-1.5 text-xs bg-gradient-to-br from-white/10 to-white/5 text-white/80 border border-white/25 rounded-full hover:from-white/20 hover:to-white/10 transition-all duration-300"
          >
            ← Back
          </button>
          {QUICK_CREATE_TOKENS.map((token) => (
            <button
              key={token}
              onClick={() => onQuickCreateToken(token)}
              className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/25 to-[#c199e4]/15 text-white/90 border border-[#c199e4]/40 rounded-full hover:from-[#c199e4]/35 hover:to-[#c199e4]/25 transition-all duration-300"
            >
              {token} plan
            </button>
          ))}
        </>
      )}
    </div>
  );
}
