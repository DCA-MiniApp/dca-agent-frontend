"use client";

import { useMiniApp } from "@neynar/react";
import { useMemo, useState } from "react";

/**
 * ContextTab component displays a transaction history with filters and pagination.
 *
 * Updated design: compact mini-app friendly table with short headers and
 * combined token pair. Uses dummy data for now.
 *
 * Columns:
 * - # (No)
 * - Token (USDC<->BTC)
 * - Ex. rate (e.g., USDC 1 = 0.00037 BTC)
 * - Status (active | disable | success | failed)
 * - Tx Hash
 * - View (button)
 */
export function ContextTab() {
  const { context } = useMiniApp();

  type TransactionStatus = "active" | "disable" | "success" | "failed";
  interface TransactionRow {
    id: number; // serial number
    fromToken: string;
    toToken: string;
    exchangeRateNum: number; // numeric rate to format
    dateISO: string; // ISO date string for filtering
    status: TransactionStatus;
    txHash: string; // used to build explorer URL
  }

  const truncateHash = (hash: string) =>
    hash.length > 10 ? `${hash.slice(0, 6)}...${hash.slice(-4)}` : hash;

  const formatShortRate = (from: string, rate: number, to: string) => {
    // Keep up to 6 significant digits, trimmed
    const value = rate.toLocaleString(undefined, {
      maximumSignificantDigits: 6,
      useGrouping: false,
    });
    return `${from} 1 = ${value} ${to}`;
  };

  // Dummy data (ordered newest first)
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
      const date = new Date(startTime.getTime());
      date.setDate(startTime.getDate() + i);
      const status = statuses[i % statuses.length];
      const txHash = `0x${(i + 1).toString(16).padStart(8, "0")}cafebabedeadface${
        2000 + i
      }`;
      return {
        id: i + 1,
        fromToken: from,
        toToken: to,
        exchangeRateNum: baseRate * (from === "USDC" ? 1 : 3200),
        dateISO: date.toISOString().slice(0, 10), // YYYY-MM-DD
        status,
        txHash,
      };
    });

    return rows.reverse(); // latest first
  }, []);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"All" | TransactionStatus>(
    "All"
  );
  const [startDate, setStartDate] = useState<string>(""); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>("");

  // Pagination
  const [page, setPage] = useState<number>(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    return dummyTransactions.filter((tx) => {
      if (statusFilter !== "All" && tx.status !== statusFilter) return false;
      if (startDate && tx.dateISO < startDate) return false;
      if (endDate && tx.dateISO > endDate) return false;
      return true;
    });
  }, [dummyTransactions, endDate, startDate, statusFilter]);

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
    setPage(1);
  };

  const openTx = (hash: string) => {
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

  return (
    <div className="mx-4 space-y-3">
      <h2 className="text-base font-semibold">Transaction History</h2>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
            <option value="All">All</option>
            <option value="active">active</option>
            <option value="disable">disable</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
          </select>
        </div>
        <div className="sm:col-span-3">
          <button
            onClick={resetFilters}
            className="w-full px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/30">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  #
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Token
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ex. rate
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                {/* <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Tx Hash
                </th> */}
                <th className="px-3 py-2 text-left text-[11px] font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Txhash
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-5 text-center text-sm text-gray-500 dark:text-gray-400">
                    No transactions found.
                  </td>
                </tr>
              )}
              {pageItems.map((tx) => (
                <tr key={tx.id}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {tx.id}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {tx.fromToken}<span className="mx-1 text-gray-400">↔</span>{tx.toToken}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {formatShortRate(tx.fromToken, tx.exchangeRateNum, tx.toToken)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    {statusPill(tx.status)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm">
                    <button
                      onClick={() => openTx(tx.txHash)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      View
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h4m0 0v4m0-4L10 14" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-300">
            Page {currentPage} of {totalPages}
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