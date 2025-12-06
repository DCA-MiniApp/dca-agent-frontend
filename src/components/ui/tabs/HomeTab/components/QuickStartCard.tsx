import React from "react";
import { LiaDonateSolid } from "react-icons/lia";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { FEATURED_TOKENS } from "../constants/tokens";

interface QuickStartCardProps {
  setShowTokenSearch: (show: boolean) => void;
  handleQuickStartToken: (symbol: string) => void;
  formatContractAddress: (address?: string | null) => string;
  getTokenAddressForSymbol: (symbol: string) => string;
}

export function QuickStartCard({
  setShowTokenSearch,
  handleQuickStartToken,
  formatContractAddress,
  getTokenAddressForSymbol,
}: QuickStartCardProps) {
  return (
    <div className="bg-gradient-to-r from-[#c199e4]/10 to-white/5 rounded-3xl p-6 border border-[#c199e4]/30 shadow-lg flex flex-col gap-4 mb-4 hover:shadow-xl hover:border-[#c199e4]/50 transition-all duration-500">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#c199e4]/40 to-[#c199e4]/20 border border-[#c199e4]/25 text-[#c199e4]">
          <LiaDonateSolid className="w-7 h-7" />
        </div>
        <div className="flex-1">
          <h4 className="text-lg font-bold text-white mb-1">Quick Start</h4>
          <p className="text-sm text-white/70 leading-tight">
            Jump into DCA planning with community favorites or search the full
            Arbitrum token list.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowTokenSearch(true)}
          className="w-full flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-left text-white/80 hover:border-white/40 hover:bg-white/10 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <HiOutlineMagnifyingGlass className="w-5 h-5 text-white/60" />
            <span className="text-sm font-medium">Search tokens</span>
          </div>
        </button>
        <div className="grid grid-cols-2 gap-2">
          {FEATURED_TOKENS.map((token) => {
            const address = getTokenAddressForSymbol(token.symbol);
            return (
              <button
                key={token.symbol}
                type="button"
                onClick={() => handleQuickStartToken(token.symbol)}
                className={`w-full rounded-2xl border border-white/15 bg-gradient-to-br ${token.gradient} px-3 py-3 text-left text-white/90 hover:border-white/40 hover:shadow-xl transition-all duration-300 backdrop-blur-sm`}
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={token.logo}
                    alt={token.symbol}
                    className="w-8 h-8 flex-shrink-0 object-contain"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-white">
                      {token.symbol}
                    </div>
                    <div className="text-[10px] text-white/70 truncate">
                      {formatContractAddress(address)}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
