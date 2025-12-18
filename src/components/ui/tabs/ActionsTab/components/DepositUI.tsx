import React from "react";

interface DepositUIProps {
  messageIdForDeposit: string;
  depositAmount?: string;
  depositAmounts: Record<string, string>;
  depositStatuses: Record<string, string>;
  isDepositLoading: Record<string, boolean>;
  onDepositAmountChange: (messageId: string, amount: string) => void;
  onDeposit: (messageId: string, amount: string) => void;
}

export function DepositUI({
  messageIdForDeposit,
  depositAmount,
  depositAmounts,
  depositStatuses,
  isDepositLoading,
  onDepositAmountChange,
  onDeposit,
}: DepositUIProps) {
  return (
    <div className="mt-3 pt-3 border-t border-white/20">
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            placeholder={depositAmount || "Amount in ETH"}
            value={depositAmounts[messageIdForDeposit] || depositAmount || ""}
            onChange={(e) =>
              onDepositAmountChange(messageIdForDeposit, e.target.value)
            }
            disabled={isDepositLoading[messageIdForDeposit]}
            className="w-full sm:flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#c199e4] disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={() =>
              onDeposit(
                messageIdForDeposit,
                depositAmounts[messageIdForDeposit] || depositAmount || ""
              )
            }
            disabled={isDepositLoading[messageIdForDeposit]}
            className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#c199e4] to-[#b380db] hover:from-[#b380db] hover:to-[#a56fcf] disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all duration-300 shadow-lg"
          >
            {isDepositLoading[messageIdForDeposit] ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Depositing...
              </>
            ) : (
              <>
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Deposit
              </>
            )}
          </button>
        </div>
        {depositStatuses[messageIdForDeposit] && (
          <div
            className={`text-xs px-3 py-2 rounded-lg ${
              depositStatuses[messageIdForDeposit].startsWith("✅")
                ? "bg-green-500/20 text-green-200 border border-green-500/30"
                : "bg-red-500/20 text-red-200 border border-red-500/30"
            }`}
          >
            {depositStatuses[messageIdForDeposit]}
          </div>
        )}
      </div>
    </div>
  );
}
