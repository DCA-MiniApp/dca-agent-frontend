"use client";

import { useMiniApp } from "@neynar/react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  HiOutlineEye,
  HiOutlineDocumentText,
  HiOutlineFilter,
} from "react-icons/hi";
import { StatusSelect } from "./StatusSelect";
import { useAccount } from "wagmi";
import { fetchUserExecutionHistory } from "../../../lib/api";
import { LiaExternalLinkAltSolid } from "react-icons/lia";
import { useFooterVisibility } from "../FooterVisibilityContext";

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
  const { setActiveTab, haptics } = useMiniApp();
  const { setVisible: setFooterVisible } = useFooterVisibility();

  // Types aligned with new backend response
  type TaskStatus = string;
  interface UserHistoryItem {
    fromToken: string;
    toToken: string;
    amount: string;
    jobId: string;
    taskId: number;
    executionTimestamp: string;
    executionTxHash: string;
    taskStatus: TaskStatus;
    txUrl: string;
    slippage: string;
    gasFee: string | null;
    tgCostETH?: string | null;
    inputAmount: string | null;
    outputAmount: string;
    exchangeRate: string | null;
  }

  // Dynamic data state
  const [executionHistory, setExecutionHistory] = useState<UserHistoryItem[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  interface TransactionRow {
    id: string; // derived: jobId-taskId
    jobId: string;
    taskId: number;
    fromToken: string;
    toToken: string;
    amount: string;
    dateISO: string; // YYYY-MM-DD
    executedAtISO: string; // execution timestamp
    status: string; // task status
    txHash: string | null; // optional
    txUrl: string | null; // optional
    slippage: string | null; // optional
    gasFee: string | null;
    tgCostETH?: string | null;
    inputAmount: string | null;
    outputAmount: string | null;
    exchangeRate: string | null;
  }

  const truncateHash = (hash: string) =>
    hash.length > 10 ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash;

  // no rate formatting in the new data shape

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
      setExecutionHistory(history as unknown as UserHistoryItem[]);
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

  const triggerHaptic = useCallback(() => {
    console.log("triggerHaptic");
    try {
      const result = haptics?.impactOccurred?.("light");
      if (result instanceof Promise) {
        result.catch(() => undefined);
      }
    } catch (err) {
      console.warn("Haptics error:", err);
    }
  }, [haptics]);

  // Convert ExecutionHistory to TransactionRow format
  const transactions: TransactionRow[] = useMemo(() => {
    return executionHistory.map((item) => {
      const executedAt = new Date(item.executionTimestamp);
      return {
        id: `${item.jobId}-${item.taskId}`,
        jobId: item.jobId,
        taskId: item.taskId,
        fromToken: item.fromToken,
        toToken: item.toToken,
        amount: item.amount,
        dateISO: executedAt.toISOString().slice(0, 10),
        executedAtISO: item.executionTimestamp,
        status: item.taskStatus,
        txHash: item.executionTxHash || null,
        txUrl: item.txUrl || null,
        slippage: item.slippage || null,
        gasFee: item.gasFee || null,
        tgCostETH: item.tgCostETH || null,
        inputAmount: item.inputAmount || null,
        outputAmount: item.outputAmount || null,
        exchangeRate: item.exchangeRate || null,
      };
    });
  }, [executionHistory]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"All" | string>("All");
  const [startDate, setStartDate] = useState<string>(""); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>("");
  const [fromTokenSearch, setFromTokenSearch] = useState<string>("");
  const [toTokenSearch, setToTokenSearch] = useState<string>("");
  const [taskIdSearch, setTaskIdSearch] = useState<string>("");

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
        if (!fromTokenLower.includes(fromTokenSearch.toLowerCase()))
          return false;
      }
      if (toTokenSearch) {
        const toTokenLower = tx.toToken.toLowerCase();
        if (!toTokenLower.includes(toTokenSearch.toLowerCase())) return false;
      }
      if (taskIdSearch) {
        const taskIdStr = String(tx.taskId);
        if (!taskIdStr.includes(taskIdSearch.trim())) return false;
      }
      return true;
    });
  }, [
    transactions,
    endDate,
    startDate,
    statusFilter,
    fromTokenSearch,
    toTokenSearch,
    taskIdSearch,
  ]);

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
    setTaskIdSearch("");
    setPage(1);
  };

  const openTxExternal = (
    txUrl: string | null,
    fallbackHash?: string | null
  ) => {
    // const url = txUrl && txUrl.length > 0
    //   ? txUrl
    //   : fallbackHash && fallbackHash.length > 0
    //     ? `https://arbiscan.io/tx/${fallbackHash}`
    //     : "";
    const url = fallbackHash ? `https://arbiscan.io/tx/${fallbackHash}` : txUrl;
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Modal state
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null);
  const openModal = (tx: TransactionRow) => setSelectedTx(tx);
  const closeModal = () => setSelectedTx(null);
  
  // Tooltip state for exchange rate details
  const [showExchangeTooltip, setShowExchangeTooltip] = useState(false);

  useEffect(() => {
    setFooterVisible(!selectedTx);
    return () => setFooterVisible(true);
  }, [selectedTx, setFooterVisible]);

  return (
    <div className="flex flex-col h-full py-3 pb-10 overflow-y-auto relative">
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
      {!selectedTx && transactions.length > 0 && (
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
              {taskIdSearch && (
                <span className="px-2 py-1 rounded-lg border border-[#c199e4]/30 text-white/80">
                  Task ID: {taskIdSearch}
                </span>
              )}
              {!fromTokenSearch &&
                !toTokenSearch &&
                !startDate &&
                !endDate &&
                !taskIdSearch &&
                statusFilter === "All" && (
                  <span className="text-white/50">None</span>
                )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters((v) => !v)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-[#c199e4]/20 to-[#b380db]/10 hover:from-[#c199e4]/30 hover:to-[#b380db]/20 text-white text-xs font-medium rounded-xl border border-[#c199e4]/30 hover:border-[#c199e4]/50 transition-all duration-300"
              >
                <HiOutlineFilter className="w-4 h-4" />{" "}
                {showFilters ? "Hide" : "Show"} Filters
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

      {/* Task ID Search (always visible) */}
      {!selectedTx && transactions.length > 0 && (
        <div className="mb-4">
          <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            <label className="text-sm text-[#c199e4]/90 mb-2 font-medium block">
              Search by Task ID
            </label>
            <input
              type="text"
              placeholder="Enter Task ID (e.g., 12345)"
              value={taskIdSearch}
              onChange={(e) => {
                setTaskIdSearch(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2.5 bg-gradient-to-br from-[#4a2b7a]/80 to-[#341e64]/20 backdrop-blur-lg rounded-xl border border-[#4a2b7a]/80 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#c199e4] focus:border-[#c199e4]/50 text-sm transition-all duration-300"
            />
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
                        onClick={() => setActiveTab("wallet" as any)}
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
                      {tx.amount}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => {
                          triggerHaptic();
                          openModal(tx);
                        }}
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
        <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-20 pb-24">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-md mx-auto bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl shadow-2xl border border-[#c199e4]/20 max-h-[calc(100vh-140px)] overflow-y-auto"
          >
            <div className="p-4 sm:p-5 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center border border-[#c199e4]/20">
                    <HiOutlineDocumentText className="text-[#c199e4] size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-lg font-bold text-[#c199e4]">
                        Execution Details
                      </h3>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full transition-all duration-300 whitespace-nowrap ${
                          selectedTx.status === "completed"
                            ? "bg-green-400/20 text-green-300 border border-green-400/40"
                            : selectedTx.status === "PENDING"
                            ? "bg-blue-400/20 text-blue-300 border border-blue-400/40"
                            : selectedTx.status === "failed"
                            ? "bg-red-400/20 text-red-300 border border-red-400/40"
                            : "bg-gray-400/20 text-gray-300 border border-gray-400/40"
                        }`}
                      >
                        {selectedTx.status}
                      </span>
                    </div>
                    <p className="text-xs text-white/70">
                      {selectedTx.fromToken} → {selectedTx.toToken}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-white/70 hover:text-white transition-colors duration-200 p-1.5 hover:bg-white/10 rounded-lg flex-shrink-0"
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

              {/* Transaction Details Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="backdrop-blur-lg rounded-xl p-2.5 border border-[#c199e4]/20">
                  <p className="text-xs text-gray-400 mb-1 font-medium">
                    Job ID (TriggerX)
                  </p>
                  <p className="text-sm font-bold text-white font-mono">
                    {selectedTx.jobId.slice(0, 5)}...
                    {selectedTx.jobId.slice(-3)}
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-xl p-2.5 border border-[#c199e4]/20">
                  <p className="text-xs text-gray-400 mb-1 font-medium">
                    Task ID (TriggerX)
                  </p>
                  <p className="text-sm font-bold text-white font-mono">
                    {selectedTx.taskId ? `${selectedTx.taskId}` : "N/A"}
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-xl p-2.5 border border-[#c199e4]/20 col-span-2">
                  <p className="text-xs text-gray-400 mb-1 font-medium">
                    Transaction Hash
                  </p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-white font-mono flex-1 min-w-0 truncate">
                      {selectedTx.txHash ? truncateHash(selectedTx.txHash) : "N/A"}
                    </p>
                    {selectedTx.txHash && (
                      <>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-[#c199e4] hover:text-[#a674d7] hover:border-[#c199e4]/40 bg-white/5 hover:bg-white/10 transition-colors flex-shrink-0"
                          title="Open in Arbiscan"
                          onClick={() =>
                            openTxExternal(null, selectedTx.txHash ?? undefined)
                          }
                        >
                          <LiaExternalLinkAltSolid className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent text-[#c199e4] hover:text-[#a674d7] hover:border-[#c199e4]/40 bg-white/5 hover:bg-white/10 transition-colors flex-shrink-0"
                          title="Copy Transaction Hash"
                          onClick={() => {
                            if (selectedTx.txHash) {
                              navigator.clipboard.writeText(selectedTx.txHash);
                            }
                          }}
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <rect x="3" y="3" width="13" height="13" rx="2" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="backdrop-blur-lg rounded-xl p-2.5 border border-[#c199e4]/20 col-span-2">
                  <p className="text-xs text-gray-400 mb-1 font-medium">
                    Exchange Rate
                  </p>
                  <p className="text-sm font-bold text-white mb-2">
                    {selectedTx.exchangeRate
                      ? `1 ${selectedTx.fromToken} = ${selectedTx.exchangeRate} ${selectedTx.toToken}`
                      : "N/A"}
                  </p>
                  {/* Swap details */}
                  {(selectedTx.inputAmount || selectedTx.amount || selectedTx.outputAmount) && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <p className="text-[11px] text-white/80 leading-tight">
                        <span className="text-gray-400 font-medium">For your swap: </span>
                        <span className="font-semibold text-white/90">
                          {selectedTx.inputAmount || selectedTx.amount || "N/A"}
                        </span>{" "}
                        <span>{selectedTx.fromToken}</span>
                        <span className="mx-1">→</span>
                        <span className="font-semibold text-white/90">
                          {selectedTx.outputAmount || "N/A"}
                        </span>{" "}
                        <span>{selectedTx.toToken}</span>
                      </p>
                    </div>
                  )}
                </div>
                <div className="backdrop-blur-lg rounded-xl p-2.5 border border-[#c199e4]/20 col-span-2">
                  <p className="text-xs text-gray-400 mb-1 font-medium">
                    TG Cost (TriggerX)
                  </p>
                  <p className="text-sm font-bold text-white">
                    {selectedTx.tgCostETH
                      ? `${selectedTx.tgCostETH} (ETH)`
                      : "N/A"}
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-xl p-2.5 border border-[#c199e4]/20 col-span-2">
                  <p className="text-xs text-gray-400 mb-1 font-medium">
                    Transaction Fee
                  </p>
                  <p className="text-sm font-bold text-white">
                    {selectedTx.gasFee ? `${selectedTx.gasFee} (ETH)` : "N/A"}
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-xl p-2.5 border border-[#c199e4]/20 col-span-2">
                  <p className="text-xs text-gray-400 mb-1 font-medium">
                    Executed At
                  </p>
                  <p className="text-sm font-bold text-white">
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
