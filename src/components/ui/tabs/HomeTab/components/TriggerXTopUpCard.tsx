import React from "react";
import { HiCurrencyDollar, HiInformationCircle } from "react-icons/hi2";
import { useState } from "react";

interface TriggerXTopUpCardProps {
  topupAmount: string;
  setTopupAmount: (amount: string) => void;
  handleDeposit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isTopupLoading: boolean;
  isConnected: boolean;
  topupStatus: string | null;
  ethBalance: string; // Add this prop for user's ETH balance
  isEthBalanceLoading: boolean;
}

export function TriggerXTopUpCard({
  topupAmount,
  setTopupAmount,
  handleDeposit,
  isTopupLoading,
  isConnected,
  topupStatus,
  ethBalance,
  isEthBalanceLoading,
}: TriggerXTopUpCardProps) {
  const balance = parseFloat(ethBalance) || 0;
  const amount = parseFloat(topupAmount) || 0;
  const isInsufficientBalance = amount > balance && topupAmount !== "";
  const [showInfo, setShowInfo] = useState(false);

  const handleMaxClick = () => {
    // setTopupAmount(ethBalance);
    const safeAmount = balance * 0.999;
    setTopupAmount(safeAmount.toFixed(18).replace(/\.?0+$/, ''));
  };

  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400/30 to-emerald-400/20 rounded-full flex items-center justify-center">
              <HiCurrencyDollar className="text-emerald-300 size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Top up ETH</h3>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowInfo(!showInfo)}
                    className="text-white/50 hover:text-white transition-colors focus:outline-none flex items-center"
                  >
                    <HiInformationCircle className="w-4 h-4" />
                  </button>

                  {showInfo && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2.5 w-56 z-50">
                      <div className="relative">
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#c199e4] rotate-45 rounded-[1px]"></div>
                        <div className="bg-[#c199e4] p-3 rounded-xl shadow-xl relative">
                          <p className="text-xs text-white font-medium leading-relaxed text-center">
                            The Top Up is used to pay for your transactions
                            executed by TriggerX
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-white/70">
                Add ETH to run your plans smoothly.
              </p>
            </div>
          </div>

          {/* Balance Display */}
          <div className="mt-3 mb-3 flex items-center justify-between">
            <span className="text-xs text-white/70">Available Balance</span>
            <span className="text-sm font-semibold text-emerald-300">
              {isEthBalanceLoading ? (
                <span className="text-xs text-emerald-300/70 animate-pulse">
                  Fetching balance...
                </span>
              ) : (
                `${parseFloat(ethBalance).toFixed(7)} ETH`
              )}
            </span>
          </div>

          <form
            onSubmit={handleDeposit}
            className="mt-3 flex flex-col gap-3"
          >
            <div className="flex gap-3 items-stretch">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="number"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="Enter ETH amount"
                    className={`w-full rounded-2xl border px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 transition-all duration-300 bg-black/20 ${isInsufficientBalance
                      ? "border-red-500/60 focus:ring-red-500/60 focus:border-red-500/60"
                      : "border-white/25 focus:ring-[#c199e4]/60 focus:border-[#c199e4]/60"
                      }`}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleMaxClick}
                disabled={isTopupLoading || !isConnected || balance === 0}
                className="px-4 py-2.5 rounded-2xl bg-white/10 text-xs font-semibold text-white border border-white/20 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
              >
                Max
              </button>
            </div>

            {/* Error Message for Insufficient Balance */}
            {isInsufficientBalance && (
              <p className="text-xs text-red-400/80">
                Insufficient balance. You have {parseFloat(ethBalance).toFixed(8)} ETH
              </p>
            )}

            <button
              type="submit"
              disabled={isTopupLoading || !isConnected || isInsufficientBalance || !topupAmount}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#c199e4] to-[#b380db] text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-300"
            >
              {isTopupLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>Deposit</>
              )}
            </button>
          </form>

          {topupStatus && (
            <p className="mt-2 text-xs text-white/80">{topupStatus}</p>
          )}
        </div>
      </div>
    </div>
  );
}
