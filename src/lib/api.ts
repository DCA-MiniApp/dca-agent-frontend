// API utilities for DCA backend integration

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ||'https://dca-backend.udonswap.org'; // Default to production URL
console.log("API_BASE_URL", API_BASE_URL);

export interface DCAPlan {
  id: string;
  jobId: string;
  userAddress: string;
  fromToken: string;
  toToken: string;
  amount: string;
  intervalMinutes: number;
  durationWeeks: number;
  status: 'ACTIVE' | 'PAUSED' | 'completed' | 'CANCELLED';
  nextExecution: string | null;
  executionCount: number;
  totalExecutions: number;
  slippage: string;
  createdAt: string;
  updatedAt: string;
  vaultAddress?: string;
  shareTokens?: string;
  jobStatus?: string;
  successCount: number;
}

export interface ExecutionHistory {
  id: string;
  planId: string;
  executedAt: string;
  fromAmount: string;
  toAmount: string;
  exchangeRate: string;
  gasFee: string | null;
  txHash: string | null;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  errorMessage: string | null;
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
export async function fetchUserDCAPlans(userAddress: string): Promise<DCAPlan[]> {
  if (!userAddress) return [];

  try {
    // const response = await fetch(`${API_BASE_URL}/api/dca/plans/${userAddress}`)
    const response = await fetch(`${API_BASE_URL}/api/dca/plans/${userAddress}`, {
      headers: {
        "Accept": "application/json"
      }
    });
    // console.log("response", await response.json());
    const result: ApiResponse<DCAPlan[]> = await response.json();
    // console.log("result in fetchUserDCAPlans", result);

    if (result.success && result.data) {
     
      result.data.forEach((plan: any) => {
        // console.log("plan in fetchUserDCAPlans", plan?.jobData?.data?.taskData);
        // Get jobStatus from jobData.data.jobData.status
        plan.jobStatus = plan?.jobData?.data?.jobData?.status || plan?.jobData?.data?.status || null;
        const taskData = plan?.jobData?.data?.taskData;
        if (Array.isArray(taskData)) {
          plan.successCount = taskData.filter((t: any) => t.task_status === 'completed').length;
        }
      });
      // console.log("result.data in fetchUserDCAPlans", result.data);
      return result.data;
    } else {
      console.error('Failed to fetch DCA plans:', result.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching DCA plans:', error);
    return [];
  }
}

/**
 * Fetch all execution history for a user (across all plans)
 */
export async function fetchUserExecutionHistory(userAddress: string, limit = 50, offset = 0): Promise<ExecutionHistory[]> {
  if (!userAddress) return [];

  try {
    const response = await fetch(`${API_BASE_URL}/api/dca/user/${userAddress}/history?limit=${limit}&offset=${offset}`);
    const result: ApiResponse<ExecutionHistory[]> = await response.json();

    if (result.success && result.data) {
      return result.data;
    } else {
      console.error('Failed to fetch user execution history:', result.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching user execution history:', error);
    return [];
  }
}

/**
 * Fetch execution history for a specific plan
 */
export async function fetchPlanHistory(planId: string): Promise<ExecutionHistory[]> {
  if (!planId) return [];

  try {
    const response = await fetch(`${API_BASE_URL}/api/dca/history/${planId}`);
    const result: ApiResponse<ExecutionHistory[]> = await response.json();

    if (result.success && result.data) {
      return result.data;
    } else {
      console.error('Failed to fetch plan history:', result.message);
      return [];
    }
  } catch (error) {
    console.error('Error fetching plan history:', error);
    return [];
  }
}

/**
 * Fetch platform statistics
 */
export async function fetchPlatformStats(): Promise<PlatformStats | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dca/stats`);
    const result: ApiResponse<PlatformStats> = await response.json();

    if (result.success && result.data) {
      return result.data;
    } else {
      console.error('Failed to fetch platform stats:', result.message);
      return null;
    }
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return null;
  }
}

/**
 * Update DCA plan status
 */
export async function updatePlanStatus(planId: string, status: 'ACTIVE' | 'PAUSED' | 'CANCELLED'): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dca/plans/${planId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });

    const result: ApiResponse = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error updating plan status:', error);
    return false;
  }
}

/**
 * Delete a DCA plan
 */
export async function deletePlan(planId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dca/plans/${planId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result: ApiResponse = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error deleting plan:', error);
    return false;
  }
}

/**
 * Fetch number of successful task executions for a given TriggerX jobId.
 * Tries the path under /api/dca first, then falls back to root /job route.
 */
export async function fetchJobSuccessCount(jobId: string): Promise<number | null> {
  if (!jobId) return null;
  const path=`${API_BASE_URL}/api/dca/job/${jobId}/success-count`;

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
  // console.log("Line number 167 plans:", plans)
  return plans.reduce((total, plan) => {
    // console.log("Amount plan:",plan.amount);
    const amount = parseFloat(plan.amount);
    // console.log("Line number 169 amoutn:",amount)
    // console.log("Total:",total+(amount*plan.executionCount));
    return total + (amount * plan.executionCount);
  }, 0);
}

/**
 * Format interval minutes to human readable string
 */
export function formatInterval(intervalMinutes: number): string {
  if (intervalMinutes < 60) {
    return `${intervalMinutes}m`;
  } else if (intervalMinutes < 1440) {
    const hours = Math.floor(intervalMinutes / 60);
    return `${hours}h`;
  } else {
    const days = Math.floor(intervalMinutes / 1440);
    if (days === 1) return 'Daily';
    if (days === 7) return 'Weekly';
    return `${days}d`;
  }
}

/**
 * Format duration weeks to human readable string
 */
export function formatDuration(durationWeeks: number): string {
  if (durationWeeks < 4) {
    return `${durationWeeks} week${durationWeeks !== 1 ? 's' : ''}`;
  } else {
    const months = Math.floor(durationWeeks / 4);
    const remainingWeeks = durationWeeks % 4;

    let result = `${months} month${months !== 1 ? 's' : ''}`;
    if (remainingWeeks > 0) {
      result += ` ${remainingWeeks} week${remainingWeeks !== 1 ? 's' : ''}`;
    }
    return result;
  }
}
