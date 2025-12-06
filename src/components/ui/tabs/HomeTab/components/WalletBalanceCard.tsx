import React from "react";
import { motion } from "framer-motion";
import { HiCurrencyDollar, HiInformationCircle } from "react-icons/hi2";

interface WalletBalanceCardProps {
  walletBalanceDisplay: string;
  tgBalance: number | null;
  showTooltip: boolean;
  showTgTooltip: boolean;
  setShowTooltip: (show: boolean) => void;
  setShowTgTooltip: (show: boolean) => void;
}

export function WalletBalanceCard({
  walletBalanceDisplay,
  tgBalance,
  showTooltip,
  showTgTooltip,
  setShowTooltip,
  setShowTgTooltip,
}: WalletBalanceCardProps) {
  return (
    <div className="bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-3xl p-6 text-white border border-[#c199e4]/30 shadow-lg hover:shadow-xl hover:border-[#c199e4]/50 transition-all duration-500 hover:scale-[1.02] group">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#c199e4]/30 to-[#c199e4]/20 rounded-full flex items-center justify-center group-hover:from-[#c199e4]/40 group-hover:to-[#c199e4]/30 transition-all duration-300">
              <HiCurrencyDollar className="text-[#c199e4] size-6" />
            </div>
            <div>
              <span className="text-sm text-white/90 font-medium inline-flex items-center">
                Total Wallet Value
                <div
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  className="relative inline-flex items-center ml-2 align-middle"
                >
                  <HiInformationCircle className="w-4 h-4 text-white/50 transition hover:text-green-400 hover:scale-110" />

                  {showTooltip && (
                    <div className="absolute z-[10] left-1/2 -translate-x-1/2 top-full mt-2 w-72 rounded-lg bg-[#c199e4] text-xs text-white/90 px-1 py-1 shadow-2xl border border-green-400/20 pointer-events-none">
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#c199e4] border-l border-t border-green-400/20 rotate-45" />
                      <div className="text-left w-full relative z-10 ">
                        This amount reflects the total value of all tokens
                        converted to USDC using current market prices on
                        Arbitrum.
                      </div>
                    </div>
                  )}
                </div>
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-4xl font-bold text-white group-hover:text-[#c199e4] transition-colors duration-300">
              {walletBalanceDisplay}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
              <span>Total Deposit balance:</span>
              <span className="font-semibold text-white">
                {tgBalance === null
                  ? "0.0000 ETH"
                  : `${Number(tgBalance).toFixed(9)} ETH`}
              </span>
              <div
                onMouseEnter={() => setShowTgTooltip(true)}
                onMouseLeave={() => setShowTgTooltip(false)}
                className="relative inline-flex items-center"
              >
                <HiInformationCircle className="w-4 h-4 text-white/50 transition hover:text-green-400 hover:scale-110" />
                {showTgTooltip && (
                  <div className="absolute z-[10] left-1/2 -translate-x-1/2 top-full mt-2 w-64 rounded-lg bg-[#c199e4] text-xs text-white/90 px-2 py-2 shadow-2xl border border-green-400/20 pointer-events-none">
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#c199e4] border-l border-t border-green-400/20 rotate-45" />
                    <div className="text-left w-full relative z-10">
                      Deposit use by TriggerX to execute your plan.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 bg-green-400/20 text-green-300 border border-green-400/40 group-hover:bg-green-400/30 uppercase">
            TOTAL
          </span>
        </div>
      </div>
    </div>
  );
}
