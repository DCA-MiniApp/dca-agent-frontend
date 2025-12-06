import React from "react";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { formatContractAddress } from "../utils/helpers";

interface TokenSearchModalProps {
  showTokenSearch: boolean;
  tokenSearchQuery: string;
  tokenSearchResults: { symbol: string; address: string; name?: string }[];
  tokenSearchInputRef: React.RefObject<HTMLInputElement>;
  setTokenSearchQuery: (query: string) => void;
  handleTokenSearchSelect: (symbol: string) => void;
  closeTokenSearch: () => void;
}

export function TokenSearchModal({
  showTokenSearch,
  tokenSearchQuery,
  tokenSearchResults,
  tokenSearchInputRef,
  setTokenSearchQuery,
  handleTokenSearchSelect,
  closeTokenSearch,
}: TokenSearchModalProps) {
  if (!showTokenSearch) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-16 pb-24">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closeTokenSearch}
      />
      <div className="relative z-10 w-full max-w-md mx-auto bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl rounded-3xl shadow-2xl border border-[#c199e4]/30 p-5 max-h-[calc(100vh-140px)] overflow-y-auto">
        <div className="flex items-center gap-3 border border-white/20 rounded-2xl px-4 py-2.5 bg-white/5">
          <HiOutlineMagnifyingGlass className="w-5 h-5 text-white/60" />
          <input
            ref={tokenSearchInputRef}
            value={tokenSearchQuery}
            onChange={(e) => setTokenSearchQuery(e.target.value)}
            placeholder="Search by token symbol"
            className="bg-transparent flex-1 text-white text-sm focus:outline-none"
          />
          {tokenSearchQuery && (
            <button
              type="button"
              onClick={() => setTokenSearchQuery("")}
              className="text-xs text-white/60 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
        <div className="mt-4 max-h-[320px] overflow-y-auto space-y-2 pr-1">
          {!tokenSearchQuery && (
            <p className="text-xs text-white/60">
              Search tokens by symbol to start a DCA plan.
            </p>
          )}
          {tokenSearchQuery && tokenSearchResults.length === 0 && (
            <p className="text-sm text-white/70 text-center py-6">
              No tokens found for &quot;{tokenSearchQuery}&quot;.
            </p>
          )}
          {tokenSearchResults.map((token) => (
            <button
              key={token.symbol}
              type="button"
              onClick={() => handleTokenSearchSelect(token.symbol)}
              className="w-full text-left rounded-2xl border border-white/10 hover:border-[#c199e4]/40 bg-white/5 px-4 py-3 transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {token.symbol}
                  </p>
                  <p className="text-xs text-white/60">{token.name}</p>
                  <p className="text-[10px] text-white/50 mt-1">
                    {formatContractAddress(token.address)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
