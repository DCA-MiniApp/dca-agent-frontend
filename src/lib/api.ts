// API utilities for DCA backend integration

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://dca-backend.udonswap.org'; // Default to production URL
// console.log("API_BASE_URL", API_BASE_URL);

export interface TaskData {
  task_id: number;
  task_number: number;
  task_opx_cost: number;
  execution_timestamp: string;
  execution_tx_hash: string;
  task_performer_id: number;
  task_attester_ids: number[];
  task_status: string;
  task_error: string;
  is_accepted: boolean;
  tx_url: string;
  converted_arguments: string[];
}

export interface JobData {
  job_id: string;
  job_title: string;
  task_definition_id: number;
  user_id: number;
  link_job_id: string | null;
  chain_status: number;
  custom: boolean;
  time_frame: number;
  recurring: boolean;
  status: string;
  job_cost_prediction: number;
  job_cost_actual: number;
  task_ids: number[];
  created_at: string;
  updated_at: string;
  last_executed_at: string;
  timezone: string;
  is_imua: boolean;
  created_chain_id: string;
  safe_address: string;
}

export interface JobDataResponse {
  success: boolean;
  data: {
    jobData: JobData;
    taskData: TaskData[];
  };
}

export interface DCAPlan {
  id: string;
  jobId: string;
  userAddress: string;
  fromToken: string;
  toToken: string;
  amount: string;
  intervalSeconds: number;
  durationSeconds: number;
  totalExecutions: number;
  status: 'ACTIVE' | 'PAUSED' | 'completed' | 'CANCELLED' | 'pending' | 'processing';
  slippage: string;
  createdAt: string;
  updatedAt: string;
  ipfsLink?: string;
  jobData?: JobDataResponse;
  successCount: number;
  jobDataStatus?: string;
  jobStatus?: string;
  // Deprecated fields (for backward compatibility during transition)
  vaultAddress?: string;
  shareTokens?: string;
  intervalMinutes?: number;
  durationWeeks?: number;
  nextExecution?: string | null;
  executionCount?: number;
}

export interface ExecutionHistory {
  id: string;
  planId: string;
  executedAt: string;
  fromAmount: string;
  toAmount: string;
  exchangeRate: string;
  inputAmount: string;
  outputAmount: string;
  gasFee: string | null;
  txHash: string | null;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  errorMessage: string | null;
  tgCostETH?: string | null;
  plan?: {
    id: string;
    fromToken: string;
    toToken: string;
    vaultAddress?: string;
    shareTokens?: string;
  };
}

export interface PlatformStats {
  totalPlans: number;
  activePlans: number;
  totalUsers: number;
  totalExecutions: number;
  last24hExecutions: number;
  last7dExecutions: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}

export interface JobSuccessCountData {
  jobId: string;
  successCount: number;
  totalTasks: number;
}

export interface TaskData {
  task_id: number;
  task_number: number;
  task_opx_cost: number;
  execution_timestamp: string;
  execution_tx_hash: string;
  task_performer_id: number;
  task_attester_ids: number[];
  task_status: string;
  task_error: string;
  is_accepted: boolean;
  tx_url: string;
  converted_arguments: string[];
}

export interface JobMonitorUser {
  Address: string;
  fid: number | null;
  username?: string;
  fromToken?: string;
  toToken?: string;
  amount?: string;
  successCount?: number;
  ipfs_url: string;
  jobid: string;
  tasks_id: number[];
  task_data?: TaskData[];
  Cost_of_TG: string;
  total_swapped: number;
  status?: string;
}

export interface JobMonitorData {
  total_unique_user: number;
  total_job_live_count: number;
  total_job_failed: number;
  total_job_processing: number;
  total_value_swapped: number;
  total_successful_task: number;
  users: JobMonitorUser[];
  last_update: string;
}

export interface QuickStats {
  total_job_live_count: number;
  total_value_swapped: number;
  last_update: string;
}

export interface StoreUserPayload {
  fid: string;
  userAddress: string;
  username?: string;
  pfpUrl?: string;
  joinedAt?: string | Date;
  isWelcomed?: boolean;
  notificationToken?: string;
  isNotification?: boolean;
}

export interface PreviousStats {
  totalExecutions: number;
  totalValueSwapped: number;
}

const CACHE_KEY = 'dca_quick_stats_cache';
const PREV_STATS_KEY = 'dca_prev_stats';

function getFromStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

function saveToStorage(key: string, value: any) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to session storage:', e);
  }
}

let quickStatsCache: { data: QuickStats; fetchedAt: number } | null = getFromStorage(CACHE_KEY);

let previousStats: PreviousStats = getFromStorage(PREV_STATS_KEY) || {
  totalExecutions: 0,
  totalValueSwapped: 0,
};




export async function storeUser(payload: StoreUserPayload): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dca/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result: ApiResponse = await response.json();
    return !!result.success;
  } catch (error) {
    console.error('Error storing user:', error);
    return false;
  }
}
/**
 * Fetch user's DCA plans from the backend
 */
// export async function fetchUserDCAPlans(userAddress: string): Promise<DCAPlan[]> {
//   if (!userAddress) return [];
//   console.log("Fetching DCA plans for user:", process.env.API_ACCESS_KEY);

//   try {
//     // const response = await fetch(`${API_BASE_URL}/api/dca/plans/${userAddress}`)
//     const response = await fetch(`${API_BASE_URL}/api/dca/plans/${userAddress}`, {
//       headers: {
//         "Accept": "application/json",
//         "Access-Key": process.env.API_ACCESS_KEY || ""
//       }
//     });
//     // console.log("response", await response.json());
//     const result: ApiResponse<DCAPlan[]> = await response.json();

//     if (result.success && result.data) {

//       result.data.forEach((plan: any) => {
//         // console.log("plan in fetchUserDCAPlans", plan?.jobData?.data?.taskData);
//         // Get jobStatus from jobData.data.jobData.status
//         plan.jobStatus = plan?.jobData?.data?.jobData?.status || plan?.jobData?.data?.status || null;
//         const taskData = plan?.jobData?.data?.taskData;
//         if (Array.isArray(taskData)) {
//           plan.successCount = taskData.filter((t: any) => t.task_status === 'completed').length;
//         }
//       });
//       // console.log("result.data in fetchUserDCAPlans", result.data);
//       return result.data;
//     } else {
//       console.error('Failed to fetch DCA plans:', result.message);
//       return [];
//     }
//   } catch (error) {
//     console.error('Error fetching DCA plans:', error);
//     return [];
//   }
// }

export async function fetchUserDCAPlans(userAddress: string): Promise<DCAPlan[]> {
  if (!userAddress) return [];
  // console.log("Fetching DCA plans for user:", userAddress);

  try {
    const response = await fetch(`/api/fetch-dca-plans/${userAddress}`);
    const result: ApiResponse<DCAPlan[]> = await response.json();

    if (result.success && result.data) {
      result.data.forEach((plan: any) => {
        plan.jobStatus = plan?.jobData?.data?.jobData?.status || plan?.jobData?.data?.status || null;

        const taskData = plan?.jobData?.data?.taskData;
        if (Array.isArray(taskData)) {
          plan.successCount = taskData.filter((t: any) => t.task_status === "completed").length;
        }
      });

      return result.data;
    } else {
      console.error("Failed to fetch DCA plans:", result.message);
      return [];
    }

  } catch (error) {
    console.error("Error fetching DCA plans:", error);
    return [];
  }
}


/**
 * Fetch all execution history for a user (across all plans)
 */
// export async function fetchUserExecutionHistory(userAddress: string, limit = 50, offset = 0): Promise<ExecutionHistory[]> {
//   if (!userAddress) return [];

//   try {
//     const response = await fetch(`${API_BASE_URL}/api/dca/user/${userAddress}/history?limit=${limit}&offset=${offset}`);
//     const result: ApiResponse<ExecutionHistory[]> = await response.json();

//     if (result.success && result.data) {
//       return result.data;
//     } else {
//       console.error('Failed to fetch user execution history:', result.message);
//       return [];
//     }
//   } catch (error) {
//     console.error('Error fetching user execution history:', error);
//     return [];
//   }
// }

export async function fetchUserExecutionHistory(
  userAddress: string,
  limit = 50,
  offset = 0
): Promise<ExecutionHistory[]> {
  if (!userAddress) return [];

  try {
    const response = await fetch(
      `/api/fetch-execution-history/${userAddress}?limit=${limit}&offset=${offset}`,
      { cache: "no-store" }
    );

    const result: ApiResponse<ExecutionHistory[]> = await response.json();

    if (result.success && result.data) {
      return result.data;
    } else {
      console.error("Failed to fetch user execution history:", result.message);
      return [];
    }
  } catch (error) {
    console.error("Error fetching user execution history:", error);
    return [];
  }
}


/**
 * Fetch execution history for a specific plan
 */
// export async function fetchPlanHistory(planId: string): Promise<ExecutionHistory[]> {
//   if (!planId) return [];

//   try {
//     const response = await fetch(`${API_BASE_URL}/api/dca/history/${planId}`);
//     const result: ApiResponse<ExecutionHistory[]> = await response.json();

//     if (result.success && result.data) {
//       return result.data;
//     } else {
//       console.error('Failed to fetch plan history:', result.message);
//       return [];
//     }
//   } catch (error) {
//     console.error('Error fetching plan history:', error);
//     return [];
//   }
// }

/**
 * Fetch platform statistics
 */
// export async function fetchPlatformStats(): Promise<PlatformStats | null> {
//   try {
//     const response = await fetch(`${API_BASE_URL}/api/dca/stats`);
//     const result: ApiResponse<PlatformStats> = await response.json();

//     if (result.success && result.data) {
//       return result.data;
//     } else {
//       console.error('Failed to fetch platform stats:', result.message);
//       return null;
//     }
//   } catch (error) {
//     console.error('Error fetching platform stats:', error);
//     return null;
//   }
// }

/**
 * Update DCA plan status
 */
// export async function updatePlanStatus(planId: string, status: 'ACTIVE' | 'PAUSED' | 'CANCELLED'): Promise<boolean> {
//   try {
//     const response = await fetch(`${API_BASE_URL}/api/dca/plans/${planId}`, {
//       method: 'PUT',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ status }),
//     });

//     const result: ApiResponse = await response.json();
//     return result.success;
//   } catch (error) {
//     console.error('Error updating plan status:', error);
//     return false;
//   }
// }

/**
 * Delete a DCA plan
 */
// export async function deletePlan(planId: string): Promise<boolean> {
//   try {
//     const response = await fetch(`${API_BASE_URL}/api/dca/plans/${planId}`, {
//       method: 'DELETE',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });

//     const result: ApiResponse = await response.json();
//     return result.success;
//   } catch (error) {
//     console.error('Error deleting plan:', error);
//     return false;
//   }
// }

/**
 * Fetch number of successful task executions for a given TriggerX jobId.
 * Tries the path under /api/dca first, then falls back to root /job route.
 */
export async function fetchJobSuccessCount(jobId: string, userAddress: string): Promise<number | null> {
  if (!jobId) return null;
  const path = `${API_BASE_URL}/api/dca/userAddress/${userAddress}/job/${jobId}/success-count`;

  // console.log("paths", paths);

  try {
    const response = await fetch(path, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const result: ApiResponse<JobSuccessCountData> = await response.json();
    // console.log("result in fetchJobSuccessCount", result.data);
    if (result.success && result.data) return result.data.successCount;
  } catch (err) {
    console.log("Error fetching job success count from", path, ":", err);
  }

  return null;
}

/**
 * Update DCA plan jobId to null (used when deleting TriggerX job)
 */
export async function updatePlanJobId(userAddress: string, jobId: string): Promise<boolean> {
  try {
    // console.log("Updating jobId to null for user:", userAddress, "jobId:", jobId);
    const response = await fetch(`${API_BASE_URL}/api/dca/jobupdate/${userAddress}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jobId }),
    });

    const result: ApiResponse = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error updating plan jobId:', error);
    return false;
  }
}

/**
 * Calculate total invested amount for a user
 */
export function calculateTotalInvested(plans: DCAPlan[]): number {
  return plans.reduce((total, plan) => {
    const amount = parseFloat(plan.amount);
    // Use successCount (from TriggerX API) instead of executionCount
    // Fall back to executionCount for backward compatibility during transition
    const executedCount = plan.successCount || plan.executionCount || 0;
    return total + (amount * executedCount);
  }, 0);
}

/**
 * Format interval seconds to human readable string
 */
export function formatInterval(intervalSeconds: number): string {
  if (intervalSeconds < 60) {
    return `${intervalSeconds}s`;
  } else if (intervalSeconds < 3600) {
    const minutes = Math.floor(intervalSeconds / 60);
    return `${minutes}m`;
  } else if (intervalSeconds < 86400) {
    const hours = Math.floor(intervalSeconds / 3600);
    return `${hours}h`;
  } else {
    const days = Math.floor(intervalSeconds / 86400);
    if (days === 1) return 'Daily';
    if (days === 7) return 'Weekly';
    return `${days}d`;
  }
}

/**
 * Format interval minutes to human readable string (backward compatibility)
 * @deprecated Use formatInterval with seconds instead
 */
export function formatIntervalMinutes(intervalMinutes: number): string {
  return formatInterval(intervalMinutes * 60);
}

/**
 * Format duration seconds to human readable string
 * Converts seconds to the most appropriate unit (minutes, hours, days, weeks, months, years)
 * 
 * @param durationSeconds - Duration in seconds (e.g., 3600 = 1 hour)
 * @returns Human-readable duration string (e.g., "1 hour", "3 days", "2 weeks", "6 months", "2 years")
 */
export function formatDuration(durationSeconds: number): string {
  const totalMinutes = durationSeconds / 60;
  const totalHours = durationSeconds / 3600;
  const totalDays = durationSeconds / 86400;
  const totalWeeks = durationSeconds / 604800; // 7 * 24 * 60 * 60
  const totalMonths = durationSeconds / 2629746; // Average month ≈ 30.44 days
  const totalYears = durationSeconds / 31556952; // Average year ≈ 365.25 days

  // Handle minutes (< 1 hour = 3600 seconds)
  if (durationSeconds < 3600) {
    const minutes = Math.round(totalMinutes * 10) / 10; // Round to 1 decimal
    if (minutes < 1) {
      const seconds = Math.round(durationSeconds);
      if (seconds < 1) {
        return 'Less than 1 second';
      }
      return seconds === 1 ? '1 second' : `${seconds} seconds`;
    }
    // Round to whole number if close to whole number
    const roundedMinutes = Math.round(minutes);
    if (Math.abs(minutes - roundedMinutes) < 0.1) {
      return roundedMinutes === 1 ? '1 minute' : `${roundedMinutes} minutes`;
    }
    return `${minutes} minutes`;
  }

  // Handle hours (< 1 day = 86400 seconds)
  if (durationSeconds < 86400) {
    const hours = Math.round(totalHours * 10) / 10; // Round to 1 decimal
    // Round to whole number if close to whole number
    const roundedHours = Math.round(hours);
    if (Math.abs(hours - roundedHours) < 0.1) {
      return roundedHours === 1 ? '1 hour' : `${roundedHours} hours`;
    }
    return `${hours} hours`;
  }

  // Handle days (< 1 week = 604800 seconds)
  if (durationSeconds < 604800) {
    const days = Math.round(totalDays * 10) / 10; // Round to 1 decimal
    // Round to whole number if close to whole number
    const roundedDays = Math.round(days);
    if (Math.abs(days - roundedDays) < 0.1) {
      return roundedDays === 1 ? '1 day' : `${roundedDays} days`;
    }
    return `${days} days`;
  }

  // Handle weeks (< 1 month ≈ 2629746 seconds)
  if (durationSeconds < 2629746) {
    const weeks = Math.round(totalWeeks * 10) / 10; // Round to 1 decimal
    // Round to whole number if close to whole number
    const roundedWeeks = Math.round(weeks);
    if (Math.abs(weeks - roundedWeeks) < 0.1) {
      return roundedWeeks === 1 ? '1 week' : `${roundedWeeks} weeks`;
    }
    return `${weeks} weeks`;
  }

  // Handle months (< 1 year ≈ 31556952 seconds)
  if (durationSeconds < 31556952) {
    const months = Math.round(totalMonths * 10) / 10; // Round to 1 decimal
    const remainingWeeks = Math.round((durationSeconds % 2629746) / 604800 * 10) / 10;

    let result = months === 1 ? '1 month' : `${months} months`;

    // Add remaining weeks if significant (> 0.5 weeks)
    if (remainingWeeks >= 0.5) {
      result += ` ${remainingWeeks === 1 ? '1 week' : `${remainingWeeks} weeks`}`;
    }

    return result;
  }

  // Handle years (>= 31556952 seconds)
  const years = Math.floor(totalYears);
  const remainingMonths = Math.round((durationSeconds % 31556952) / 2629746);

  let result = years === 1 ? '1 year' : `${years} years`;

  // Add remaining months if significant (> 0.5 months)
  if (remainingMonths >= 0.5) {
    result += ` ${remainingMonths === 1 ? '1 month' : `${remainingMonths} months`}`;
  }

  return result;
}

/**
 * Format duration weeks to human readable string (backward compatibility)
 * @deprecated Use formatDuration with seconds instead
 */
export function formatDurationWeeks(durationWeeks: number): string {
  return formatDuration(durationWeeks * 604800); // Convert weeks to seconds
}

/**
 * Fetch platform statistics for Job Monitor
 */
// export async function fetchPlatformStatsForMonitor(): Promise<JobMonitorData | null> {
//   try {
//     const response = await fetch(`${API_BASE_URL}/api/dca/platform-stats`, {
//       headers: {
//         'Accept': 'application/json',
//       },
//     });

//     if (!response.ok) {
//       console.error('Failed to fetch platform stats:', response.status);
//       return null;
//     }

//     const result: ApiResponse<JobMonitorData> = await response.json();

//     if (result.success && result.data) {
//       return result.data;
//     } else {
//       console.error('Failed to fetch platform stats:', result.message);
//       return null;
//     }
//   } catch (error) {
//     console.error('Error fetching platform stats for monitor:', error);
//     return null;
//   }
// }

export async function fetchPlatformStatsForMonitor(): Promise<JobMonitorData | null> {
  try {
    const response = await fetch(`/api/fetch-platform-stats`, {
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("Failed to fetch platform stats:", response.status);
      return null;
    }

    const result: ApiResponse<JobMonitorData> = await response.json();

    if (result.success && result.data) {
      return result.data;
    } else {
      console.error("Failed to fetch platform stats:", result.message);
      return null;
    }

  } catch (error) {
    console.error("Error fetching platform stats for monitor:", error);
    return null;
  }
}


export async function fetchQuickStats(): Promise<{
  data: QuickStats | null;
  fromCache: boolean
}> {
  const now = Date.now();

  if (
    quickStatsCache &&
    now - quickStatsCache.fetchedAt < 15 * 60 * 1000 // 15 minutes cache validity reset when user exit from app 
  ) {
    return { data: quickStatsCache.data, fromCache: true };
  }

  try {
    const response = await fetch(`/api/fetch-platform-stats`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ishome: "true",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch quick stats:", response.status);
      return { data: null, fromCache: false };
    }

    const result: ApiResponse<QuickStats> = await response.json();
    if (result.success && result.data) {
      const newExecutions = result.data.total_job_live_count ?? 0;
      const newVolume = result.data.total_value_swapped ?? 0;

      // Don't cache if values are 0
      if (newExecutions === 0 || newVolume === 0) {
        console.warn("Received zero values, not caching");
        return { data: result.data, fromCache: false };
      }

      // Ensure monotonic increase - use previous value if new value is less
      const finalExecutions = Math.max(newExecutions, previousStats.totalExecutions);
      const finalVolume = Math.max(newVolume, previousStats.totalValueSwapped);

      // Update previous stats
      previousStats = {
        totalExecutions: finalExecutions,
        totalValueSwapped: finalVolume,
      };
      saveToStorage(PREV_STATS_KEY, previousStats);

      // Cache with corrected values
      const correctedData = {
        ...result.data,
        total_job_live_count: finalExecutions,
        total_value_swapped: finalVolume,
      };

      quickStatsCache = {
        data: correctedData,
        fetchedAt: now,
      };
      saveToStorage(CACHE_KEY, quickStatsCache);

      return { data: correctedData, fromCache: false };
    } else {
      console.error("Failed to fetch quick stats:", result.message);
      return { data: null, fromCache: false };
    }
  } catch (error) {
    console.error("Error fetching quick stats:", error);
    return { data: null, fromCache: false };
  }
}

/**
 * Convert seconds to minutes for backward compatibility
 */
export function convertSecondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60);
}

/**
 * Convert seconds to weeks for backward compatibility  
 */
export function convertSecondsToWeeks(seconds: number): number {
  return seconds / 604800; // 7 * 24 * 60 * 60
}
