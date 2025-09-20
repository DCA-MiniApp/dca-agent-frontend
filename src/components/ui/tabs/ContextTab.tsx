"use client";

import { useMiniApp } from "@neynar/react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { HiOutlineEye, HiOutlineDocumentText, HiOutlineFilter } from "react-icons/hi";
import { StatusSelect } from "./StatusSelect";
import { useAccount } from "wagmi";
import {
  fetchUserExecutionHistory,
  type ExecutionHistory,
} from "../../../lib/api";

/**
 * ContextTab component displays a transaction history with filters and pagination.
 *
 * Updated design: compact mini-app friendly table with clear headers and
 * improved modal with detailed transaction information.
 *
 * Columns:
 * - # (Transaction ID)
 * - Token Pair (e.g., "USDC ↔ BTC")
 * - Amount (Invested amount - more compact)
 * - View (eye icon opens details modal)
 */
export function ContextTab() {
  const { address } = useAccount();
  const { setActiveTab } = useMiniApp();

  // Dynamic data state
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistory[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  type TransactionStatus = "SUCCESS" | "FAILED" | "PENDING";
  interface TransactionRow {
    id: string; // execution ID
    planId: string; // plan ID for reference
    fromToken: string;
    toToken: string;
    fromAmount: string; // e.g., "$50.00"
    toAmount: string; // e.g., "0.0012 BTC"
    exchangeRateNum: number; // numeric rate to format
    gasFee: string | null;
    dateISO: string; // YYYY-MM-DD
    executedAtISO: string; // execution timestamp
    status: TransactionStatus;
    txHash: string | null; // used to build explorer URL
    errorMessage: string | null;
    vaultAddress?: string;
    shareTokens?: string;
    depositTxHash?: string | null;
  }

  const truncateHash = (hash: string) =>
    hash.length > 10 ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash;

  const formatShortRate = (from: string, rate: number, to: string) => {
    const value = rate.toLocaleString(undefined, {
      maximumSignificantDigits: 6,
      useGrouping: false,
    });
    return `${from} 1 = ${value} ${to}`;
  };

  // Fetch user execution history
  const fetchUserHistory = useCallback(async () => {
    if (!address) {
      setExecutionHistory([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const history = await fetchUserExecutionHistory(address, 100); // Fetch up to 100 records
      setExecutionHistory(history);
    } catch (error) {
      console.error("Error fetching execution history:", error);
      setExecutionHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Fetch data on mount and address change
  useEffect(() => {
    fetchUserHistory();
  }, [fetchUserHistory]);

  // Convert ExecutionHistory to TransactionRow format
  const transactions: TransactionRow[] = useMemo(() => {
    return executionHistory.map((execution, index) => {
      const executedAt = new Date(execution.executedAt);
      const fromAmount = parseFloat(execution.fromAmount);
      const toAmount = parseFloat(execution.toAmount);
      const exchangeRate = parseFloat(execution.exchangeRate);

      return {
        id: execution.id,
        planId: execution.planId,
        fromToken: execution.plan?.fromToken || "UNKNOWN",
        toToken: execution.plan?.toToken || "UNKNOWN",
        fromAmount: `${fromAmount.toFixed(5)}`,
        toAmount: `${toAmount.toFixed(6)} ${
          execution.plan?.toToken || "TOKEN"
        }`,
        exchangeRateNum: exchangeRate,
        gasFee: execution.gasFee,
        dateISO: executedAt.toISOString().slice(0, 10),
        executedAtISO: execution.executedAt,
        status: execution.status,
        txHash: execution.txHash,
        errorMessage: execution.errorMessage,
        vaultAddress: execution.vaultAddress || "No vault found",
        shareTokens: execution.shareTokens || "0.000000",
        depositTxHash: execution.depositTxHash || undefined,
      };
    });
  }, [executionHistory]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"All" | TransactionStatus>(
    "All"
  );
  const [startDate, setStartDate] = useState<string>(""); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>("");
  const [fromTokenSearch, setFromTokenSearch] = useState<string>("");
  const [toTokenSearch, setToTokenSearch] = useState<string>("");

  // Pagination
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusFilter !== "All" && tx.status !== statusFilter) return false;
      if (startDate && tx.dateISO < startDate) return false;
      if (endDate && tx.dateISO > endDate) return false;
      if (fromTokenSearch) {
        const fromTokenLower = tx.fromToken.toLowerCase();
        if (!fromTokenLower.includes(fromTokenSearch.toLowerCase())) return false;
      }
      if (toTokenSearch) {
        const toTokenLower = tx.toToken.toLowerCase();
        if (!toTokenLower.includes(toTokenSearch.toLowerCase())) return false;
      }
      return true;
    });
  }, [transactions, endDate, startDate, statusFilter, fromTokenSearch, toTokenSearch]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  }, [filtered, currentPage]);

  const resetFilters = () => {
    setStatusFilter("All");
    setStartDate("");
    setEndDate("");
    setFromTokenSearch("");
    setToTokenSearch("");
    setPage(1);
  };

  const openTxExternal = (hash: string | null) => {
    if (!hash) return;
    const url = `https://arbiscan.io/tx/${hash}`; // Arbitrum explorer (placeholder)
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Modal state
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null);
  const openModal = (tx: TransactionRow) => setSelectedTx(tx);
  console.log("Selected TX:", selectedTx);
  const closeModal = () => setSelectedTx(null);

  return (
    <div className="flex flex-col h-full py-3 overflow-y-auto relative">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center border border-[#c199e4]/20">
            <HiOutlineDocumentText className="text-[#c199e4] size-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Transaction History
            </h2>
            <p className="text-sm text-white/70">
              Track your DCA investment transactions
            </p>
          </div>
        </div>
      </div>

      {/* Compact toolbar to toggle filters and see quick state */}
      {!selectedTx && (
        <div className="sticky top-0 z-[40] -mt-2 mb-4">
          <div className="flex items-center justify-between bg-gradient-to-r from-[#4a2b7a]/30 to-[#341e64]/20 backdrop-blur-xl border border-white/20 rounded-2xl px-3 py-2">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-white/80 font-medium">Filters:</span>
              <span className="px-2 py-1 rounded-lg border border-[#c199e4]/30 text-white/80">
                {statusFilter === "All" ? "Any Status" : statusFilter}
              </span>
              {fromTokenSearch && (
                <span className="px-2 py-1 rounded-lg border border-[#c199e4]/30 text-white/80">
                  From: {fromTokenSearch}
                </span>
              )}
              {toTokenSearch && (
                <span className="px-2 py-1 rounded-lg border border-[#c199e4]/30 text-white/80">
                  To: {toTokenSearch}
                </span>
              )}
              {(startDate || endDate) && (
                <span className="px-2 py-1 rounded-lg border border-[#c199e4]/30 text-white/80">
                  {startDate || "…"} → {endDate || "…"}
                </span>
              )}
              {!fromTokenSearch && !toTokenSearch && !startDate && !endDate && statusFilter === "All" && (
                <span className="text-white/50">None</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-[#c199e4]/20 to-[#b380db]/10 hover:from-[#c199e4]/30 hover:to-[#b380db]/20 text-white text-xs font-medium rounded-xl border border-[#c199e4]/30 hover:border-[#c199e4]/50 transition-all duration-300"
              >
                <HiOutlineFilter className="w-4 h-4" /> {showFilters ? "Hide" : "Show"} Filters
              </button>
              <button
                onClick={resetFilters}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-xl border border-white/20 transition-all duration-300"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters (collapsible) */}
      {showFilters && !selectedTx && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 space-y-4 relative z-[50] mb-4"
        >
          <h3 className="text-lg font-bold text-white mb-4">
            Filter Transactions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex flex-col">
              <label className="text-sm text-[#c199e4]/90 mb-2 font-medium">
                From Token
              </label>
              <input
                type="text"
                placeholder="e.g., USDC, ETH"
                value={fromTokenSearch}
                onChange={(e) => {
                  setFromTokenSearch(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-gradient-to-br from-[#4a2b7a]/80 to-[#341e64]/20 backdrop-blur-lg rounded-xl border border-[#4a2b7a]/80 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#c199e4] focus:border-[#c199e4]/50 text-sm transition-all duration-300"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[#c199e4]/90 mb-2 font-medium">
                To Token
              </label>
              <input
                type="text"
                placeholder="e.g., BTC, ARB"
                value={toTokenSearch}
                onChange={(e) => {
                  setToTokenSearch(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-gradient-to-br from-[#4a2b7a]/80 to-[#341e64]/20 backdrop-blur-lg rounded-xl border border-[#4a2b7a]/80 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#c199e4] focus:border-[#c199e4]/50 text-sm transition-all duration-300"
              />
            </div>
            <div className="flex flex-col relative z-[99999]">
              <label className="text-sm text-[#c199e4]/90 mb-2 font-medium">
                Status
              </label>
              <StatusSelect
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val as any);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[#c199e4]/90 mb-2 font-medium">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-gradient-to-br from-[#4a2b7a]/80 to-[#341e64]/20 backdrop-blur-lg rounded-xl border border-[#4a2b7a]/80 text-white focus:outline-none focus:ring-2 focus:ring-[#c199e4] focus:border-[#c199e4]/50 text-sm transition-all duration-300"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-[#c199e4]/90 mb-2 font-medium">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-gradient-to-br from-[#4a2b7a]/80 to-[#341e64]/20 backdrop-blur-lg rounded-xl border border-[#4a2b7a]/80 text-white focus:outline-none focus:ring-2 focus:ring-[#c199e4] focus:border-[#c199e4]/50 text-sm transition-all duration-300"
              />
            </div>
          </div>
          <div className="pt-2">
            <button
              onClick={resetFilters}
              className="w-full bg-gradient-to-r from-[#c199e4]/20 to-[#b380db]/10 hover:from-[#c199e4]/30 hover:to-[#b380db]/20 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg"
            >
              Clear All Filters
            </button>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <div className="mt-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 overflow-hidden z-[10]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#4a2b7a]/30 to-[#341e64]/20 backdrop-blur-lg border-b border-[#c199e4]/20">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-bold text-[#c199e4] uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-4 text-left text-sm font-bold text-[#c199e4] uppercase tracking-wider">
                  Token Pair
                </th>
                <th className="px-4 py-4 text-left text-sm font-bold text-[#c199e4] uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-4 text-left text-sm font-bold text-[#c199e4] uppercase tracking-wider">
                  View
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c199e4]/10">
              {/* Loading State */}
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-8 h-8 border-2 border-[#c199e4]/30 border-t-[#c199e4] rounded-full animate-spin"></div>
                      <p className="text-white/70 font-medium">
                        Loading transaction history...
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* No Connection State */}
              {!isLoading && !address && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <HiOutlineDocumentText className="text-[#c199e4]/50 size-12" />
                      <p className="text-white/70 font-medium">
                        Connect Your Wallet
                      </p>
                      <p className="text-white/50 text-sm">
                        Connect your wallet to view transaction history
                      </p>
                      <button
                        onClick={() => setActiveTab('wallet' as any)}
                        className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#c199e4]/20 to-[#b380db]/10 hover:from-[#c199e4]/30 hover:to-[#b380db]/20 text-white text-sm font-medium rounded-xl border border-[#c199e4]/30 hover:border-[#c199e4]/50 transition-all duration-300"
                      >
                        Go to Wallet
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
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* No Data State */}
              {!isLoading && address && pageItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <HiOutlineDocumentText className="text-[#c199e4]/50 size-12" />
                      <p className="text-white/70 font-medium">
                        {filtered.length === 0 && transactions.length > 0
                          ? "No transactions match your filters"
                          : "No transaction history found"}
                      </p>
                      <p className="text-white/50 text-sm">
                        {filtered.length === 0 && transactions.length > 0
                          ? "Try adjusting your filters"
                          : "Your DCA execution history will appear here"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading &&
                pageItems.map((tx, index) => (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="hover:bg-[#c199e4]/5 transition-colors duration-200 group"
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-white group-hover:text-[#d9b3ed] transition-colors duration-200">
                      #{(page - 1) * pageSize + index + 1}
                      {/* <div className="text-xs text-white/50 font-mono">{tx.planId.slice(0, 8)}...</div> */}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {tx.fromToken}
                        </span>
                        <svg
                          className="w-4 h-4 text-[#c199e4]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 8l4 4m0 0l-4 4m4-4H3"
                          />
                        </svg>
                        <span className="text-white font-medium">
                          {tx.toToken}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-[#c199e4]">
                      {tx.fromAmount}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => openModal(tx)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-[#c199e4]/20 to-[#b380db]/20 hover:from-[#c199e4]/30 hover:to-[#b380db]/30 rounded-xl border border-[#c199e4]/30 text-[#c199e4] hover:text-white transition-all duration-300 hover:scale-110"
                        aria-label="View transaction details"
                      >
                        <HiOutlineEye className="w-4 h-4" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between px-6 py-4 bg-gradient-to-r from-[#4a2b7a]/20 to-[#341e64]/10 backdrop-blur-lg border-t border-[#c199e4]/20">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-xl bg-gradient-to-br from-[#4a2b7a]/40 to-[#341e64]/20 border border-[#c199e4]/30 text-white hover:from-[#c199e4]/20 hover:to-[#b380db]/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all duration-300"
            >
              Prev
            </button>
            {Array.from({ length: totalPages })
              .slice(0, 5)
              .map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      currentPage === pageNum
                        ? "bg-gradient-to-br from-[#c199e4]/40 to-[#b380db]/40 text-white border border-[#c199e4]/50 shadow-lg"
                        : "bg-gradient-to-br from-[#4a2b7a]/40 to-[#341e64]/20 text-white border border-[#c199e4]/30 hover:from-[#c199e4]/20 hover:to-[#b380db]/20"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-xl bg-gradient-to-br from-[#4a2b7a]/40 to-[#341e64]/20 border border-[#c199e4]/30 text-white hover:from-[#c199e4]/20 hover:to-[#b380db]/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all duration-300"
            >
              Next
            </button>
          </div>
          <div className="text-sm text-[#c199e4]/90 font-medium">
            Page {currentPage} of {totalPages} ({filtered.length} transactions)
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-md mx-auto bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl shadow-2xl border border-[#c199e4]/20 max-h-[65vh] overflow-y-auto -top-[40px]"
          >
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center group-hover:from-[#c199e4]/30 group-hover:to-[#c199e4]/20 transition-all duration-300 border border-[#c199e4]/20 group-hover:scale-110">
                    <HiOutlineDocumentText className="text-[#c199e4] size-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#c199e4] transition-colors duration-300">
                      Execution Details
                    </h3>
                    <p className="text-sm text-white/70">
                      {selectedTx.fromToken} → {selectedTx.toToken} 
                   
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-white/70 hover:text-white transition-colors duration-200 p-2 hover:bg-white/10 rounded-xl"
                  aria-label="Close"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between p-3 backdrop-blur-lg rounded-2xl border border-[#c199e4]/20">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 ${
                      selectedTx.status === "SUCCESS"
                        ? "bg-green-400/20 text-green-300 border border-green-400/40 group-hover:bg-green-400/30"
                        : selectedTx.status === "PENDING"
                        ? "bg-blue-400/20 text-blue-300 border border-blue-400/40 group-hover:bg-blue-400/30"
                        : selectedTx.status === "FAILED"
                        ? "bg-red-400/20 text-red-300 border border-red-400/40 group-hover:bg-red-400/30"
                        : "bg-gray-400/20 text-gray-300 border border-gray-400/40"
                    }`}
                  >
                    {selectedTx.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openTxExternal(selectedTx.txHash)}
                    className="bg-gradient-to-r from-[#c199e4]/20 to-[#c199e4]/10 hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 text-white font-semibold py-3 px-5 rounded-xl transition-all duration-300 text-xs border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg"
                  >
                    View Explorer
                  </button>
                </div>
              </div>

              {/* Transaction Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="backdrop-blur-lg rounded-2xl p-3 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    From Amount
                  </p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">
                    {selectedTx.fromAmount}
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-3 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    To Amount
                  </p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">
                    {selectedTx.toAmount}
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-3 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    Gas Fee
                  </p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">
                    {selectedTx.gasFee
                      ? `${parseFloat(selectedTx.gasFee).toFixed(6)} ETH`
                      : "N/A"}
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-3 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    Plan ID
                  </p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300 font-mono">
                    {selectedTx.planId.slice(0, 4)}...{selectedTx.planId.slice(-4)}
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-3 border border-[#c199e4]/20 transition-all duration-300 group col-span-2">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    Exchange Rate
                  </p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">
                    {formatShortRate(
                      selectedTx.fromToken,
                      selectedTx.exchangeRateNum,
                      selectedTx.toToken
                    )}
                  </p>
                </div>
              </div>

              {/* Transaction Hash */}
              <div className="rounded-2xl p-3 border border-[#c199e4]/20">
                <p className="text-sm text-gray-300 font-medium mb-2">
                  Transaction Hash
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-gray-100 text-sm">
                    {selectedTx.txHash
                      ? truncateHash(selectedTx.txHash)
                      : "No hash available"}
                  </span>
                </div>
              </div>

              {/* Vault Information */}
              <div className="space-y-3">
                {(() => {
                  // Check if this transaction has vault data
                  if (!selectedTx.vaultAddress || selectedTx.vaultAddress === "No vault found") {
                    return (
                      <div className="rounded-2xl p-3 border border-[#c199e4]/20">
                        <p className="text-sm text-gray-300 font-medium mb-2">
                          Vault Information
                        </p>
                        <p className="text-sm text-gray-400">
                          No vault data available for this transaction
                        </p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="rounded-2xl p-3 border border-[#c199e4]/20">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-300 font-medium">
                          Vault Details
                        </p>
                        <span className="text-xs text-gray-400">
                          {new Date(selectedTx.executedAtISO).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-400">Address:</p>
                          <p className="text-xs font-mono text-gray-100 break-all">
                            {selectedTx.vaultAddress}
                          </p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(selectedTx.vaultAddress!);
                            }}
                            className="text-[#c199e4] hover:text-white transition-colors"
                            title="Copy Vault Address"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                            </svg>
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-400">Share Tokens:</p>
                          <p className="text-lg font-bold text-gray-100">
                            {parseFloat(selectedTx.shareTokens!).toFixed(6)}
                          </p>
                        </div>
                        {selectedTx.depositTxHash && (
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-400">Deposit TX:</p>
                            <p className="text-xs font-mono text-gray-100">
                              {truncateHash(selectedTx.depositTxHash)}
                            </p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(selectedTx.depositTxHash!);
                              }}
                              className="text-[#c199e4] hover:text-white transition-colors"
                              title="Copy Deposit Hash"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Error Message (if failed) */}
              {selectedTx.status === "FAILED" && selectedTx.errorMessage && (
                <div className="rounded-2xl p-3 border border-red-400/20 bg-red-400/5">
                  <p className="text-sm text-red-300 font-medium mb-2">
                    Error Message
                  </p>
                  <p className="text-sm text-red-100 break-words">
                    {selectedTx.errorMessage}
                  </p>
                </div>                                                                                                                  
              )}

              {/* Timeline Details */}
              <div className="space-y-3">
                <div className="rounded-2xl p-3 border border-[#c199e4]/20">
                  <p className="text-sm text-gray-300 font-medium mb-2">
                    Executed At
                  </p>
                  <p className="text-sm font-bold text-gray-100">
                    {new Date(selectedTx.executedAtISO).toLocaleString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Original Context View (kept for reference) */}
      {/**
       * Original developer-focused context JSON. Uncomment to show.
       */}
      {/**
      <h2 className="text-lg font-semibold mb-2">Context</h2>
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <pre className="font-mono text-xs whitespace-pre-wrap break-words w-full">
          {JSON.stringify(context, null, 2)}
        </pre>
      </div>
      */}
    </div>
  );
}
