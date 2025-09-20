// API utilities for DCA backend integration

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface DCAPlan {
  id: string;
  userAddress: string;
  fromToken: string;
  toToken: string;
  amount: string;
  intervalMinutes: number;
  durationWeeks: number;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  nextExecution: string | null;
  executionCount: number;
  totalExecutions: number;
  slippage: string;
  createdAt: string;
  updatedAt: string;
  vaultAddress?: string;
  shareTokens?: string;
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
    console.log("response", response);
    const result: ApiResponse<DCAPlan[]> = await response.json();

    if (result.success && result.data) {
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
 * Calculate total invested amount for a user
 */
export function calculateTotalInvested(plans: DCAPlan[]): number {
  // console.log("Line number 167 plans:", plans)
  return plans.reduce((total, plan) => {
    console.log("Amount plan:",plan.amount);
    const amount = parseFloat(plan.amount);
    console.log("Line number 169 amoutn:",amount)
    console.log("Total:",total+(amount*plan.executionCount));
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
