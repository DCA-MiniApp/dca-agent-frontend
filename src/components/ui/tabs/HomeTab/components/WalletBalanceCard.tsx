import React from "react";
import { motion } from "framer-motion";
import { HiCurrencyDollar, HiInformationCircle, HiWallet, HiBanknotes } from "react-icons/hi2";

interface WalletBalanceCardProps {
  walletBalanceDisplay: string;
  tgBalance: number | null;
  showTooltip: boolean;
  showTgTooltip: boolean;
  setShowTooltip: (show: boolean) => void;
  setShowTgTooltip: (show: boolean) => void;
  ethPrice?: number | null; // ETH price in USD for conversion
}

export function WalletBalanceCard({
  walletBalanceDisplay,
  tgBalance,
  showTooltip,
  showTgTooltip,
  setShowTooltip,
  setShowTgTooltip,
  ethPrice = null,
}: WalletBalanceCardProps) {
  // Calculate USD value of TriggerX balance
  // Check if balance is loaded (not null) and ethPrice is available
  const tgBalanceUsd = tgBalance !== null && ethPrice !== null
    ? (tgBalance * ethPrice).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : null;
  
  // Determine if we're still loading (balance is null or ethPrice is null)
  const isLoadingUsd = tgBalance === null || ethPrice === null;

  // // Debug logging
  // console.log('WalletBalanceCard Debug:', {
  //   tgBalance,
  //   ethPrice,
  //   tgBalanceUsd,
  //   calculation: tgBalance && ethPrice ? tgBalance * ethPrice : null
  // });

  // Format TriggerX balance display - always show 6 decimal places
  const formatTgBalance = () => {
    if (tgBalance === null || tgBalance === 0) {
      return "0.000000 ETH";
    }
    
    return `${Number(tgBalance).toFixed(8)} ETH`;
  };
  return (
    <div className="bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-3xl p-6 text-white border border-[#c199e4]/30 shadow-lg hover:shadow-xl transition-all duration-300 group">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-[#c199e4]/30 to-[#c199e4]/20 rounded-2xl flex items-center justify-center transition-all duration-300">
          <HiCurrencyDollar className="text-[#c199e4] size-7" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-[#c199e4] transition-colors duration-300">
            Portfolio Overview
          </h3>
          <p className="text-sm text-white/70">Your wallet & deposit balances</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Wallet Balance */}
        <motion.div 
          className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/20 hover:border-[#c199e4]/40 transition-all duration-300"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400/30 to-blue-400/20 rounded-xl flex items-center justify-center">
              <HiWallet className="text-blue-400 size-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white/90">Total Wallet Value</span>
                <div
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  className="relative inline-flex items-center"
                >
                  <HiInformationCircle className="w-4 h-4 text-white/50 transition hover:text-blue-400 hover:scale-110 cursor-help" />
                  {showTooltip && (
                    <div className="absolute z-[10] left-1/2 -translate-x-1/2 top-full mt-2 w-72 rounded-lg bg-blue-500 text-xs text-white px-3 py-2 shadow-2xl border border-blue-400/30 pointer-events-none">
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-500 border-l border-t border-blue-400/30 rotate-45" />
                      <div className="text-left relative z-10">
                        Total USD value of all tokens in your connected wallet using current market prices on Arbitrum.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-3xl font-bold text-white group-hover:text-blue-400 transition-colors duration-300">
              {walletBalanceDisplay}
            </p>
            {/* <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-white/60 uppercase tracking-wide font-medium">
                Live Balance
              </span>
            </div> */}
          </div>
        </motion.div>

        {/* Right Column - TriggerX Deposit */}
        <motion.div 
          className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-5 border border-white/20 hover:border-emerald-400/40 transition-all duration-300"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400/30 to-emerald-400/20 rounded-xl flex items-center justify-center">
              <HiBanknotes className="text-emerald-400 size-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white/90">TriggerX Deposit</span>
                <div
                  onMouseEnter={() => setShowTgTooltip(true)}
                  onMouseLeave={() => setShowTgTooltip(false)}
                  className="relative inline-flex items-center"
                >
                  <HiInformationCircle className="w-4 h-4 text-white/50 transition hover:text-emerald-400 hover:scale-110 cursor-help" />
                  {showTgTooltip && (
                    <div className="absolute z-[10] left-1/2 -translate-x-1/2 top-full mt-2 w-64 rounded-lg bg-emerald-500 text-xs text-white px-3 py-2 shadow-2xl border border-emerald-400/30 pointer-events-none">
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-emerald-500 border-l border-t border-emerald-400/30 rotate-45" />
                      <div className="text-left relative z-10">
                        ETH deposited with TriggerX to execute your DCA plans automatically.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-white group-hover:text-emerald-400 transition-colors duration-300 font-mono">
                {formatTgBalance()}
              </p>
              {isLoadingUsd ? (
                <p className="text-sm text-emerald-300/60 mt-2">
                  Loading USD value...
                </p>
              ) : (
                <p className="text-lg font-semibold text-emerald-300 mt-2">
                  ≈ ${tgBalanceUsd} USD
                </p>
              )}
            </div>
            {/* <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-white/60 uppercase tracking-wide font-medium">
                  Available for DCA
                </span>
              </div>
              {ethPrice && (
                <span className="text-xs text-emerald-300/70 font-medium">
                  ETH: ${ethPrice.toFixed(2)}
                </span>
              )}
            </div> */}
          </div>
        </motion.div>
      </div>

      {/* Bottom Summary */}
      {/* <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Portfolio Status</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-sm font-semibold text-green-400">Active & Synced</span>
          </div>
        </div>
      </div> */}
    </div>
  );
}
