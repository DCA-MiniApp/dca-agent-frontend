"use client";

import { useMiniApp } from "@neynar/react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { HiOutlineEye, HiOutlineDocumentText } from "react-icons/hi";
import { FaExternalLinkAlt } from "react-icons/fa";
import { StatusSelect } from "./StatusSelect";

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
  const { context } = useMiniApp();

  type TransactionStatus = "active" | "disable" | "success" | "failed";
  interface TransactionRow {
    id: number; // serial number
    fromToken: string;
    toToken: string;
    fromAmount: string; // e.g., "$50.00"
    toAmount: string; // e.g., "0.0012 BTC"
    exchangeRateNum: number; // numeric rate to format
    slippage: number; // slippage percentage
    dateISO: string; // YYYY-MM-DD
    createdAtISO: string; // full timestamp
    executedAtISO: string; // execution timestamp
    status: TransactionStatus;
    txHash: string; // used to build explorer URL
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

  // Dummy data (ordered newest first)
  const baseAmounts = [10, 25, 50, 75, 100];
  const dummyTransactions: TransactionRow[] = useMemo(() => {
    const statuses: TransactionStatus[] = [
      "success",
      "active",
      "failed",
      "disable",
    ];
    const pairs = [
      ["USDC", "ETH"],
      ["USDC", "BTC"],
      ["USDC", "SOL"],
      ["ETH", "USDC"],
      ["BTC", "USDC"],
    ] as const;
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - 30);

    const rows: TransactionRow[] = Array.from({ length: 30 }).map((_, i) => {
      const [from, to] = pairs[i % pairs.length];
      const baseRate = 0.00031 + (i % 7) * 0.000012; // slight variation
      const createdAt = new Date(startTime.getTime());
      createdAt.setDate(startTime.getDate() + i);
      const executedAt = new Date(createdAt.getTime());
      executedAt.setHours(executedAt.getHours() + 2); // executed 2 hours after creation
      const status = statuses[i % statuses.length];
      const txHash = `0x${(i + 1)
        .toString(16)
        .padStart(8, "0")}cafebabedeadface${2000 + i}`;
      const amountNum = baseAmounts[i % baseAmounts.length];
      const toAmountNum = amountNum * baseRate;
      const slippage = 0.1 + (i % 5) * 0.05; // 0.1% to 0.35% slippage

      return {
        id: i + 1,
        fromToken: from,
        toToken: to,
        fromAmount: `$${amountNum.toFixed(2)}`,
        toAmount: `${toAmountNum.toFixed(6)} ${to}`,
        exchangeRateNum: baseRate * (from === "USDC" ? 1 : 3200),
        slippage,
        dateISO: createdAt.toISOString().slice(0, 10), // YYYY-MM-DD
        createdAtISO: createdAt.toISOString(),
        executedAtISO: executedAt.toISOString(),
        status,
        txHash,
      };
    });

    return rows.reverse(); // latest first
  }, []);

  // Local status overrides for Pause/Resume behavior
  const [statusOverrides, setStatusOverrides] = useState<
    Record<number, TransactionStatus>
  >({});

  // Filters
  const [statusFilter, setStatusFilter] = useState<"All" | TransactionStatus>(
    "All"
  );
  const [startDate, setStartDate] = useState<string>(""); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>("");
  const [tokenSearch, setTokenSearch] = useState<string>(""); // Token search

  // Pagination
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  // Apply overrides for displayed items
  const withOverrides = useMemo(
    () =>
      dummyTransactions.map((tx) => ({
        ...tx,
        status: statusOverrides[tx.id] ?? tx.status,
      })),
    [dummyTransactions, statusOverrides]
  );

  const filtered = useMemo(() => {
    return withOverrides.filter((tx) => {
      if (statusFilter !== "All" && tx.status !== statusFilter) return false;
      if (startDate && tx.dateISO < startDate) return false;
      if (endDate && tx.dateISO > endDate) return false;
      if (tokenSearch) {
        const searchLower = tokenSearch.toLowerCase();
        const fromTokenLower = tx.fromToken.toLowerCase();
        const toTokenLower = tx.toToken.toLowerCase();
        if (
          !fromTokenLower.includes(searchLower) &&
          !toTokenLower.includes(searchLower)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [withOverrides, endDate, startDate, statusFilter, tokenSearch]);

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
    setTokenSearch("");
    setPage(1);
  };

  const openTxExternal = (hash: string) => {
    const url = `https://arbiscan.io/tx/${hash}`; // Arbitrum explorer (placeholder)
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const statusPill = (s: TransactionStatus) => {
    const map: Record<TransactionStatus, string> = {
      success:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      active: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      disable: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[s]}`}
      >
        {s}
      </span>
    );
  };

  // Modal state
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null);
  const openModal = (tx: TransactionRow) => setSelectedTx(tx);
  const closeModal = () => setSelectedTx(null);

  return (
    <div className="flex flex-col h-full py-3 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
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

      {/* Filters */}
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 space-y-4">
        <h3 className="text-lg font-bold text-white mb-4">
          Filter Transactions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-sm text-[#c199e4]/90 mb-2 font-medium">
              Token Search
            </label>
            <input
              type="text"
              placeholder="Search by token name..."
              value={tokenSearch}
              onChange={(e) => {
                setTokenSearch(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-gradient-to-br from-[#4a2b7a]/80 to-[#341e64]/20 backdrop-blur-lg rounded-xl border border-[#4a2b7a]/80 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#c199e4] focus:border-[#c199e4]/50 text-sm transition-all duration-300"
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
          <div className="flex flex-col">
            <label className="text-sm text-[#c199e4]/90 mb-2 font-medium">
              Status
            </label>
            {/* <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-2 bg-gradient-to-br from-[#4a2b7a]/40 to-[#341e64]/20 backdrop-blur-lg rounded-xl border border-[#c199e4]/20 text-black focus:outline-none focus:ring-2 focus:ring-[#c199e4] focus:border-[#c199e4]/50 text-sm transition-all duration-300"
            > */}
            <StatusSelect
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val as any);
                setPage(1);
              }}
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
      </div>

      {/* Table */}
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 overflow-hidden ">
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
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <HiOutlineDocumentText className="text-[#c199e4]/50 size-12" />
                      <p className="text-white/70 font-medium">
                        No transactions found
                      </p>
                      <p className="text-white/50 text-sm">
                        Try adjusting your filters
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {pageItems.map((tx, index) => (
                <motion.tr
                  key={tx.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="hover:bg-[#c199e4]/5 transition-colors duration-200 group"
                >
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-white group-hover:text-[#d9b3ed] transition-colors duration-200">
                    #{tx.id}
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
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#4a2b7a]/20 to-[#341e64]/10 backdrop-blur-lg border-t border-[#c199e4]/20">
          <div className="text-sm text-[#c199e4]/90 font-medium">
            Page {currentPage} of {totalPages} ({filtered.length} transactions)
          </div>
          <div className="flex items-center gap-2">
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
            className="relative z-10 w-full max-w-md mx-auto bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl shadow-2xl border border-[#c199e4]/20 max-h-[65vh] overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center group-hover:from-[#c199e4]/30 group-hover:to-[#c199e4]/20 transition-all duration-300 border border-[#c199e4]/20 group-hover:scale-110">
                    <HiOutlineDocumentText className="text-[#c199e4] size-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#c199e4] transition-colors duration-300">
                      Transaction #{selectedTx.id}
                    </h3>
                    <p className="text-sm text-white/70">
                      {selectedTx.fromToken} ↔ {selectedTx.toToken}
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
              <div className="flex items-center justify-between p-4 backdrop-blur-lg rounded-2xl border border-[#c199e4]/20">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 ${
                      selectedTx.status === "success"
                        ? "bg-green-400/20 text-green-300 border border-green-400/40 group-hover:bg-green-400/30"
                        : selectedTx.status === "active"
                        ? "bg-blue-400/20 text-blue-300 border border-blue-400/40 group-hover:bg-blue-400/30"
                        : selectedTx.status === "failed"
                        ? "bg-red-400/20 text-red-300 border border-red-400/40 group-hover:bg-red-400/30"
                        : "bg-gray-400/20 text-gray-300 border border-gray-400/40"
                    }`}
                  >
                    {selectedTx.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openTxExternal(selectedTx.txHash)}
                    className="bg-gradient-to-r from-[#c199e4]/20 to-[#c199e4]/10 hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 text-white font-semibold py-2 px-4 rounded-xl transition-all duration-300 text-xs border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg"
                  >
                    View Explorer
                  </button>
                </div>
              </div>

              {/* Transaction Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="backdrop-blur-lg rounded-2xl p-4 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    From Amount
                  </p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">
                    {selectedTx.fromAmount}
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-4 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    To Amount
                  </p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">
                    {selectedTx.toAmount}
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-4 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    Slippage
                  </p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">
                    {selectedTx.slippage.toFixed(2)}%
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-4 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    From Token
                  </p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">
                    {selectedTx.fromToken}
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-4 border border-[#c199e4]/20 transition-all duration-300 group col-span-2">
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
              <div className="rounded-2xl p-4 border border-[#c199e4]/20">
                <p className="text-sm text-gray-300 font-medium mb-2">
                  Transaction Hash
                </p>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-gray-100 text-sm">
                    {truncateHash(selectedTx.txHash)}
                  </span>
                </div>
              </div>

              {/* Timeline Details */}
              <div className="space-y-3">
                <div className="rounded-2xl p-4 border border-[#c199e4]/20">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    Created
                  </p>
                  <p className="text-sm font-semibold text-gray-200">
                    {new Date(selectedTx.createdAtISO).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
                <div className="rounded-2xl p-4 border border-[#c199e4]/20">
                  <p className="text-sm text-gray-300 font-medium mb-2">
                    Executed At
                  </p>
                  <p className="text-sm font-bold text-gray-100">
                    {new Date(selectedTx.executedAtISO).toLocaleString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeModal}
                  className="w-full bg-gradient-to-r from-[#c199e4]/20 to-[#c199e4]/10 hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 text-sm border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg group-hover:scale-[1.02]"
                >
                  Close
                </button>
                <button
                  onClick={() => openTxExternal(selectedTx.txHash)}
                  className="w-full bg-gradient-to-r from-[#c199e4]/20 to-[#c199e4]/10 hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 text-sm border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg group-hover:scale-[1.02]"
                >
                  View Explorer
                </button>
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
