"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  IoLockClosed,
  IoArrowDown,
  IoFilter,
} from "react-icons/io5";
import { fetchPlatformStatsForMonitor, type JobMonitorData, type JobMonitorUser } from "~/lib/api";

// Security key from environment variable
const MONITOR_SECURITY_KEY = process.env.NEXT_PUBLIC_MONITOR_SECURITY_KEY || "";
const AUTH_STORAGE_KEY = "monitor_auth_verified";

// Helper function to truncate address for table display
const truncateAddressShort = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};


interface JobMonitorProps {
  data?: JobMonitorData;
}

export function JobMonitor({ data: initialData }: JobMonitorProps) {
  // Security authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [securityKey, setSecurityKey] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [data, setData] = useState<JobMonitorData | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<"latest" | "jobid" | "address">("latest");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedUser, setSelectedUser] = useState<JobMonitorUser | null>(null);
  const [copiedAddressKey, setCopiedAddressKey] = useState<string | null>(null);
  const [copiedJobId, setCopiedJobId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshCountdown, setRefreshCountdown] = useState(600); // 10 minutes = 600 seconds

  const itemsPerPage = 10;

  // Check authentication on mount
  useEffect(() => {
    // Check if user is already authenticated (stored in localStorage)
    const storedAuth = typeof window !== "undefined" ? localStorage.getItem(AUTH_STORAGE_KEY) : null;
    if (storedAuth === "true" && MONITOR_SECURITY_KEY) {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, []);

  // Handle security key submission
  const handleSecurityKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!MONITOR_SECURITY_KEY) {
      setAuthError("Security key is not configured. Please contact administrator.");
      return;
    }

    if (securityKey === MONITOR_SECURITY_KEY) {
      setIsAuthenticated(true);
      // Store authentication in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(AUTH_STORAGE_KEY, "true");
      }
    } else {
      setAuthError("Invalid security key. Please try again.");
      setSecurityKey("");
    }
  };

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchPlatformStatsForMonitor();
      if (result) {
        setData(result);
        setLastUpdated(new Date(result.last_update || new Date()));
      } else {
        setError("Failed to fetch platform statistics");
      }
    } catch (err) {
      console.error("Error fetching platform stats:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch data on mount (only when authenticated)
  useEffect(() => {
    if (isAuthenticated && !initialData) {
      fetchData();
    }
  }, [initialData, fetchData, isAuthenticated]);


  // Get latest execution timestamp from task_data
  const getLatestExecutionTime = (user: JobMonitorUser): number => {
    if (!user.task_data || user.task_data.length === 0) return 0;
    const timestamps = user.task_data
      .map((task) => {
        if (task.execution_timestamp && task.execution_timestamp !== "0001-01-01T00:00:00Z") {
          return new Date(task.execution_timestamp).getTime();
        }
        return 0;
      })
      .filter((ts) => ts > 0);
    return timestamps.length > 0 ? Math.max(...timestamps) : 0;
  };

  // Filter and sort users based on search query and sort options
  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    
    // First, filter by search query
    let filtered = data.users;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = data.users.filter(
        (user) =>
          user.jobid.toLowerCase().includes(query) ||
          (user.username && user.username.toLowerCase().includes(query)) ||
          user.Address.toLowerCase().includes(query)
      );
    }

    // Then, sort the filtered results
    const sorted = [...filtered].sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;

      switch (sortField) {
        case "latest":
          aValue = getLatestExecutionTime(a);
          bValue = getLatestExecutionTime(b);
          break;
        case "jobid":
          aValue = a.jobid;
          bValue = b.jobid;
          break;
        case "address":
          aValue = a.Address.toLowerCase();
          bValue = b.Address.toLowerCase();
          break;
        default:
          return 0;
      }

      // Compare values
      let comparison = 0;
      if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      // Apply sort order
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [data?.users, searchQuery, sortField, sortOrder]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortOrder]);

  // Refresh countdown timer (10 minutes = 600 seconds)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          // Trigger fetch when countdown reaches 0
          fetchData();
          return 600; // Reset to 600 seconds (10 minutes)
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchData, isAuthenticated]);

  const handleCopyAddress = (address: string, key: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddressKey(key);
    setTimeout(() => setCopiedAddressKey(null), 2000);
  };

  const handleCopyJobId = (jobId: string) => {
    navigator.clipboard.writeText(jobId);
    setCopiedJobId(jobId);
    setTimeout(() => setCopiedJobId(null), 2000);
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

  // Format countdown time (MM:SS)
  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Show authentication check loading
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show security key input if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800/90 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-gray-700/50 shadow-2xl"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/30">
              <IoLockClosed className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Secure Access Required</h2>
            <p className="text-gray-400 text-sm">
              Please enter the security key to access the Job Monitor dashboard
            </p>
          </div>

          <form onSubmit={handleSecurityKeySubmit} className="space-y-4">
            <div>
              <label htmlFor="securityKey" className="block text-sm font-medium text-gray-300 mb-2">
                Security Key
              </label>
              <input
                id="securityKey"
                type="password"
                value={securityKey}
                onChange={(e) => {
                  setSecurityKey(e.target.value);
                  setAuthError(null);
                }}
                placeholder="Enter security key"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                autoFocus
              />
            </div>

            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
              >
                <IoAlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{authError}</span>
              </motion.div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              Access Dashboard
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Show loading state
  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400">Loading platform statistics...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <IoAlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-gray-400">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-6 flex items-center justify-center">
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }

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
            Tracking of all jobs and user plans running on the platform (DCA x TriggerX)
          </p>
        </div>

        {/* Info Bar */}
        <div className="flex items-center justify-between bg-gray-800/50 backdrop-blur-lg rounded-xl p-4 border border-gray-700/50">
          <div className="flex items-center gap-2 text-gray-300">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">
              Last updated: {data.last_update ? formatTime(new Date(data.last_update)) : formatTime(lastUpdated)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-blue-400">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Next refresh in: {formatCountdown(refreshCountdown)}</span>
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
            <div className="text-sm text-gray-400">Unique Users</div>
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
            <div className="text-sm text-gray-400">Completed Job</div>
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
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <IoArrowUp className="w-5 h-5 text-green-400" />
              <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <IoSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Job ID, Address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <IoFilter className="w-5 h-5 text-gray-400" />
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as typeof sortField)}
                  className="px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                >
                  <option value="latest">Latest</option>
                  <option value="jobid">Job ID</option>
                  <option value="address">Address</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white hover:bg-gray-800/70 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 flex items-center gap-1"
                  title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
                >
                  {sortOrder === "asc" ? (
                    <IoArrowUp className="w-4 h-4" />
                  ) : (
                    <IoArrowDown className="w-4 h-4" />
                  )}
                  <span className="text-xs">{sortOrder === "asc" ? "ASC" : "DESC"}</span>
                </button>
              </div>
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
                    From Token
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    To Token
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">
                    Amount
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
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const addressCopyKey = `${user.Address}-${user.jobid}`;

                    return (
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
                              handleCopyAddress(user.Address, addressCopyKey);
                            }}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            {copiedAddressKey === addressCopyKey ? (
                              <span className="text-green-400 text-xs">Copied!</span>
                            ) : (
                              <IoCopyOutline className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-white font-medium">
                          {user.fromToken || "N/A"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-white font-medium">
                          {user.toToken || "N/A"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-white font-medium">
                          {user.amount || "N/A"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-semibold">
                            #{String(user.jobid).slice(0, 7)}...{String(user.jobid).slice(-5)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyJobId(String(user.jobid));
                            }}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Copy Job ID"
                          >
                            {copiedJobId === String(user.jobid) ? (
                              <span className="text-green-400 text-xs">Copied!</span>
                            ) : (
                              <IoCopyOutline className="w-4 h-4" />
                            )}
                          </button>
                        </div>
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
                          {typeof user.Cost_of_TG === 'string' 
                            ? user.Cost_of_TG 
                            : `$${Number(user.Cost_of_TG).toFixed(6)}`}
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
                    );
                  })
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
                    {selectedUser.username && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Username:</span>
                        <span className="text-white font-medium">{selectedUser.username}</span>
                      </div>
                    )}
                    {selectedUser.fid !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">FID:</span>
                        <span className="text-white font-medium">{selectedUser.fid}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Address:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono text-sm">
                          {truncateAddressShort(selectedUser.Address)}
                        </span>
                        <button
                          onClick={() =>
                            handleCopyAddress(
                              selectedUser.Address,
                              `${selectedUser.Address}-${selectedUser.jobid ?? "modal"}`
                            )
                          }
                          className="text-gray-400 hover:text-white"
                        >
                          {copiedAddressKey === `${selectedUser.Address}-${selectedUser.jobid ?? "modal"}` ? (
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
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Job ID:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono text-sm">
                          {String(selectedUser.jobid).slice(0, 7)}...{String(selectedUser.jobid).slice(-5)}
                        </span>
                        <button
                          onClick={() => handleCopyJobId(String(selectedUser.jobid))}
                          className="text-gray-400 hover:text-white transition-colors"
                          title="Copy Job ID"
                        >
                          {copiedJobId === String(selectedUser.jobid) ? (
                            <span className="text-green-400 text-xs">Copied!</span>
                          ) : (
                            <IoCopyOutline className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    {selectedUser.fromToken && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">From Token:</span>
                        <span className="text-white font-medium">{selectedUser.fromToken}</span>
                      </div>
                    )}
                    {selectedUser.toToken && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">To Token:</span>
                        <span className="text-white font-medium">{selectedUser.toToken}</span>
                      </div>
                    )}
                    {selectedUser.amount && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Amount:</span>
                        <span className="text-white font-medium">{selectedUser.amount}</span>
                      </div>
                    )}
                    {selectedUser.successCount !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Success Count:</span>
                        <span className="text-white font-medium">{selectedUser.successCount}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cost (TG):</span>
                      <span className="text-white font-medium">
                        {typeof selectedUser.Cost_of_TG === 'string' 
                          ? selectedUser.Cost_of_TG 
                          : `$${Number(selectedUser.Cost_of_TG).toFixed(6)}`}
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
                  <div className="space-y-3">
                    {selectedUser.task_data && selectedUser.task_data.length > 0 ? (
                      selectedUser.task_data.map((task) => (
                        <div
                          key={task.task_id}
                          className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/30"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-purple-300 font-medium">Task #{task.task_id}</span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                task.task_status === "completed"
                                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                  : task.task_status === "failed"
                                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                  : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                              }`}
                            >
                              {task.task_status}
                            </span>
                          </div>
                          {task.execution_tx_hash && (
                            <div className="text-xs text-gray-400 mb-1">
                              TX: {task.execution_tx_hash.slice(0, 10)}...{task.execution_tx_hash.slice(-8)}
                            </div>
                          )}
                          {task.tx_url && task.tx_url.trim() !== "" && (
                            <div className="mt-2">
                              <a
                                href={task.tx_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                View Transaction
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                  />
                                </svg>
                              </a>
                            </div>
                          )}
                          {task.execution_timestamp && task.execution_timestamp !== "0001-01-01T00:00:00Z" && (
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(task.execution_timestamp).toLocaleString()}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
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
                    )}
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

