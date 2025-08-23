"use client";

import { useMiniApp } from "@neynar/react";
import { useMemo, useState } from "react";

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
    const statuses: TransactionStatus[] = ["success", "active", "failed", "disable"];
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
      const txHash = `0x${(i + 1).toString(16).padStart(8, "0")}cafebabedeadface${
        2000 + i
      }`;
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
  const [statusOverrides, setStatusOverrides] = useState<Record<number, TransactionStatus>>({});

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
  const withOverrides = useMemo(() =>
    dummyTransactions.map((tx) => ({
      ...tx,
      status: statusOverrides[tx.id] ?? tx.status,
    })), [dummyTransactions, statusOverrides]
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
        if (!fromTokenLower.includes(searchLower) && !toTokenLower.includes(searchLower)) {
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
      success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      active: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      disable: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[s]}`}>
        {s}
      </span>
    );
  };

  // Modal state
  const [selectedTx, setSelectedTx] = useState<TransactionRow | null>(null);
  const openModal = (tx: TransactionRow) => setSelectedTx(tx);
  const closeModal = () => setSelectedTx(null);

  return (
    <div className="mx-4 space-y-4 pb-20">
      <h2 className="text-base font-semibold">Transaction History</h2>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1">
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
            className="px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-2.5 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="All">All Status</option>
            <option value="active">Active</option>
            <option value="disable">Paused</option>
            <option value="success">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <button
            onClick={resetFilters}
            className="w-full px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/30">
            <tr>
              <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                #
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Token Pair
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
                Amount
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-12">
                View
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No transactions found.
                </td>
              </tr>
            )}
            {pageItems.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 w-12">
                  #{tx.id}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                  {tx.fromToken}<span className="mx-1 text-gray-400">↔</span>{tx.toToken}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 w-20">
                  {tx.fromAmount}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm w-12">
                  <button
                    onClick={() => openModal(tx)}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    aria-label="View transaction details"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-300">
            Page {currentPage} of {totalPages} ({filtered.length} transactions)
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 text-xs"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-2.5 py-1 rounded-md border text-xs ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 text-xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-sm mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 max-h-[85vh] overflow-y-auto">
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Transaction #{selectedTx.id}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{selectedTx.fromToken} ↔ {selectedTx.toToken}</p>
                </div>
                <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" aria-label="Close">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-xs text-gray-500 dark:text-gray-400">Status:</span>
                {statusPill(selectedTx.status)}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 rounded-md border border-gray-200 dark:border-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400">From Amount</div>
                  <div className="text-gray-900 dark:text-gray-100">{selectedTx.fromAmount}</div>
                </div>
                <div className="p-2 rounded-md border border-gray-200 dark:border-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400">To Amount</div>
                  <div className="text-gray-900 dark:text-gray-100">{selectedTx.toAmount}</div>
                </div>
                <div className="p-2 rounded-md border border-gray-200 dark:border-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Exchange Rate</div>
                  <div className="text-gray-900 dark:text-gray-100">{formatShortRate(selectedTx.fromToken, selectedTx.exchangeRateNum, selectedTx.toToken)}</div>
                </div>
                <div className="p-2 rounded-md border border-gray-200 dark:border-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Slippage</div>
                  <div className="text-gray-900 dark:text-gray-100">{selectedTx.slippage.toFixed(2)}%</div>
                </div>
                <div className="p-2 rounded-md border border-gray-200 dark:border-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Created At</div>
                  <div className="text-gray-900 dark:text-gray-100">{new Date(selectedTx.createdAtISO).toLocaleString()}</div>
                </div>
                <div className="p-2 rounded-md border border-gray-200 dark:border-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Executed At</div>
                  <div className="text-gray-900 dark:text-gray-100">{new Date(selectedTx.executedAtISO).toLocaleString()}</div>
                </div>
              </div>

              <div className="p-2 rounded-md border border-gray-200 dark:border-gray-800 text-sm">
                <div className="text-xs text-gray-500 dark:text-gray-400">Transaction Hash</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-gray-900 dark:text-gray-100">{truncateHash(selectedTx.txHash)}</span>
                  <button onClick={() => openTxExternal(selectedTx.txHash)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs">
                    View on explorer
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h4m0 0v4m0-4L10 14" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
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