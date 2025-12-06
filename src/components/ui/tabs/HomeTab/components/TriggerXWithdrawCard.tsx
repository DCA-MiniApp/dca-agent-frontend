import React from "react";
import { HiCurrencyDollar } from "react-icons/hi2";

interface TriggerXWithdrawCardProps {
  withdrawAmount: string;
  setWithdrawAmount: (amount: string) => void;
  handleWithdrawTg: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isWithdrawLoading: boolean;
  isConnected: boolean;
  withdrawStatus: string | null;
}

export function TriggerXWithdrawCard({
  withdrawAmount,
  setWithdrawAmount,
  handleWithdrawTg,
  isWithdrawLoading,
  isConnected,
  withdrawStatus,
}: TriggerXWithdrawCardProps) {
  return (
    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400/30 to-emerald-400/20 rounded-full flex items-center justify-center">
              <HiCurrencyDollar className="text-emerald-300 size-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Withdraw ETH
              </h3>
              <p className="text-xs text-white/70">Wirthdraw your ETH.</p>
            </div>
          </div>

          <form
            onSubmit={handleWithdrawTg}
            className="mt-3 flex flex-col sm:flex-row gap-3 items-stretch"
          >
            <div className="flex-1">
              <div className="relative">
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter ETH amount"
                  className="w-full rounded-2xl border border-white/25 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#c199e4]/60 focus:border-[#c199e4]/60"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isWithdrawLoading || !isConnected}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#c199e4] to-[#b380db] text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-300"
            >
              {isWithdrawLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>Withdraw</>
              )}
            </button>
          </form>

          {withdrawStatus && (
            <p className="mt-2 text-xs text-white/80">{withdrawStatus}</p>
          )}
        </div>
      </div>
    </div>
  );
}
