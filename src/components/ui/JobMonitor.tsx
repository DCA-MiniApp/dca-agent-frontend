"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IoPeople,
  IoFlash,
  IoTime,
  IoAlertCircle,
  IoCash,
  IoSearch,
  IoCopyOutline,
  IoChevronBack,
  IoChevronForward,
  IoArrowUp,
  IoClose,
} from "react-icons/io5";
// Helper function to truncate address for table display
const truncateAddressShort = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Types based on the provided data structure
interface User {
  Address: string;
  fid: number;
  username: string;
  ipfs_url: string;
  jobid: number;
  tasks_id: number[];
  Cost_of_TG: number;
  total_swapped: number;
}

interface JobMonitorData {
  total_unique_user: number;
  total_job_live_count: number;
  total_job_failed: number;
  total_job_processing: number;
  total_value_swapped: number;
  users: User[];
  last_update: string;
}

interface JobMonitorProps {
  data?: JobMonitorData;
}

// Dummy data matching the provided structure
const dummyData: JobMonitorData = {
  total_unique_user: 4,
  total_job_live_count: 12,
  total_job_failed: 2,
  total_job_processing: 3,
  total_value_swapped: 150000.25,
  users: [
    {
      Address: "0xA1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0",
      fid: 10101,
      username: "alice",
      ipfs_url: "https://ipfs.io/ipfs/QmAlice123",
      jobid: 101,
      tasks_id: [1001, 1002, 1003],
      Cost_of_TG: 12.5,
      total_swapped: 50000.75,
    },
    {
      Address: "0xB2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0A1",
      fid: 10102,
      username: "bob",
      ipfs_url: "https://ipfs.io/ipfs/QmBob456",
      jobid: 102,
      tasks_id: [1004, 1005],
      Cost_of_TG: 8.0,
      total_swapped: 30000.0,
    },
    {
      Address: "0xC3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0A1B2",
      fid: 10103,
      username: "carol",
      ipfs_url: "https://ipfs.io/ipfs/QmCarol789",
      jobid: 103,
      tasks_id: [1006, 1007, 1008, 1009],
      Cost_of_TG: 15.75,
      total_swapped: 40000.5,
    },
    {
      Address: "0xD4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0A1B2C3",
      fid: 10104,
      username: "dave",
      ipfs_url: "https://ipfs.io/ipfs/QmDave321",
      jobid: 104,
      tasks_id: [1010],
      Cost_of_TG: 5.0,
      total_swapped: 29500.0,
    },
  ],
  last_update: new Date().toISOString(),
};

export function JobMonitor({ data = dummyData }: JobMonitorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshCountdown, setRefreshCountdown] = useState(60);

  const itemsPerPage = 4;

  // Filter users based on search query (by Job ID)
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return data.users;
    }
    const query = searchQuery.toLowerCase();
    return data.users.filter(
      (user) =>
        user.jobid.toString().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        user.Address.toLowerCase().includes(query)
    );
  }, [data.users, searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Refresh countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          setLastUpdated(new Date());
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  const failedRate = data.total_job_failed > 0
    ? ((data.total_job_failed / (data.total_job_live_count + data.total_job_failed)) * 100).toFixed(0)
    : "0";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
              <svg
                className="w-6 h-6 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Job Monitor</h1>
          </div>
          <p className="text-sm text-gray-400 ml-[52px]">
            Real-time tracking of jobs, swaps, and transactions
          </p>
        </div>

        {/* Info Bar */}
        <div className="flex items-center justify-between bg-gray-800/50 backdrop-blur-lg rounded-xl p-4 border border-gray-700/50">
          <div className="flex items-center gap-2 text-gray-300">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">
              Last updated: {formatTime(lastUpdated)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-blue-400">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Next refresh in: {refreshCountdown}s</span>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-5 border border-gray-700/50 hover:border-blue-500/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                <IoPeople className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {data.total_unique_user}
            </div>
            <div className="text-sm text-gray-400">+2 this week</div>
          </motion.div>

          {/* Live Jobs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-5 border border-gray-700/50 hover:border-green-500/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
                <IoFlash className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {data.total_job_live_count}
            </div>
            <div className="text-sm text-gray-400">Active now</div>
          </motion.div>

          {/* Processing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-5 border border-gray-700/50 hover:border-yellow-500/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center border border-yellow-500/30">
                <IoTime className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {data.total_job_processing}
            </div>
            <div className="text-sm text-gray-400">In progress</div>
          </motion.div>

          {/* Failed Jobs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-5 border border-gray-700/50 hover:border-red-500/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/30">
                <IoAlertCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {data.total_job_failed}
            </div>
            <div className="text-sm text-gray-400">{failedRate}% rate</div>
          </motion.div>

          {/* Total Value Swapped */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-5 border border-gray-700/50 hover:border-purple-500/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/30">
                <IoCash className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {formatCurrency(data.total_value_swapped)}
            </div>
            <div className="text-sm text-gray-400">
              {data.total_value_swapped.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} USD
            </div>
          </motion.div>
        </div>

        {/* Recent Transactions Section */}
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <IoArrowUp className="w-5 h-5 text-green-400" />
              <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
            </div>
            <div className="relative w-64">
              <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Job ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Wallet Address
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Job ID
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Tasks (Count)
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Cost (TG)
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Amount Swapped
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr
                      key={user.jobid}
                      className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedUser(user)}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-mono">
                            {truncateAddressShort(user.Address)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyAddress(user.Address);
                            }}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            {copiedAddress === user.Address ? (
                              <span className="text-green-400 text-xs">Copied!</span>
                            ) : (
                              <IoCopyOutline className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-white font-semibold">
                          #{user.jobid}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(user);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium border border-purple-500/30 hover:bg-purple-500/30 transition-all"
                        >
                          {user.tasks_id.length} tasks
                          <span className="text-xs">&gt;</span>
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-white">
                          ${user.Cost_of_TG.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-green-400 font-semibold">
                          ${user.total_swapped.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700/50">
              <div className="text-sm text-gray-400">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of{" "}
                {filteredUsers.length} transactions
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-gray-700/50 rounded-lg border border-gray-600 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IoChevronBack className="w-5 h-5 text-white" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === page
                          ? "bg-blue-500 text-white"
                          : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 bg-gray-700/50 rounded-lg border border-gray-600 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <IoChevronForward className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">Job Details</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <IoClose className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* User Info */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">User Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Username:</span>
                      <span className="text-white font-medium">{selectedUser.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">FID:</span>
                      <span className="text-white font-medium">{selectedUser.fid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Address:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono text-sm">
                          {truncateAddressShort(selectedUser.Address)}
                        </span>
                        <button
                          onClick={() => handleCopyAddress(selectedUser.Address)}
                          className="text-gray-400 hover:text-white"
                        >
                          {copiedAddress === selectedUser.Address ? (
                            <span className="text-green-400 text-xs">Copied!</span>
                          ) : (
                            <IoCopyOutline className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Job Info */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Job Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Job ID:</span>
                      <span className="text-white font-semibold">#{selectedUser.jobid}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cost (TG):</span>
                      <span className="text-white font-medium">
                        ${selectedUser.Cost_of_TG.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Swapped:</span>
                      <span className="text-green-400 font-semibold">
                        ${selectedUser.total_swapped.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">IPFS URL:</span>
                      <a
                        href={selectedUser.ipfs_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm truncate max-w-xs"
                      >
                        {selectedUser.ipfs_url}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Tasks */}
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">
                    Tasks ({selectedUser.tasks_id.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedUser.tasks_id.map((taskId) => (
                      <div
                        key={taskId}
                        className="bg-purple-500/20 text-purple-300 rounded-lg px-3 py-2 text-sm font-medium border border-purple-500/30 text-center"
                      >
                        #{taskId}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

