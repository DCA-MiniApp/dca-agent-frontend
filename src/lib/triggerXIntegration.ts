/**
 * TriggerX Integration for DCA Agent Frontend
 *
 * This module provides utilities for creating TriggerX jobs and updating
 * DCA plans with job details and IPFS metadata.
 */

import { TriggerXClient, createJob, JobType, ArgType, type TimeBasedJobInput, type CreateJobInput } from 'sdk-triggerx';
import { BrowserProvider } from 'ethers';

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export type TriggerXJobInput = TimeBasedJobInput & {
  jobType: JobType.Time;
  argType: ArgType.Static | ArgType.Dynamic;
};

export interface IPFSMetadata {
  planId: string;
  userAddress: string;
  fromToken: string;
  toToken: string;
  amount: string;
  intervalMinutes: number;
  durationWeeks: number;
  slippage: string;
  createdAt: string;
  jobId?: string; // Will be added after job creation
}

export interface CreateTriggerXJobParams {
  planId: string;
  jobInput: CreateJobInput;
  ipfsMetadata?: IPFSMetadata;
  signer: any; // ethers.Signer instance
}

/**
 * Create a TriggerX job for DCA plan execution
 */
export async function createTriggerXJobForPlan(params: CreateTriggerXJobParams) {
  const { planId, jobInput, ipfsMetadata, signer } = params;

  try {
    console.log('[TriggerX] Creating job for plan:', planId);

    // Initialize TriggerX client
    const client = new TriggerXClient(process.env.NEXT_PUBLIC_TRIGGERX_API_KEY || '');

    // Create the job using SDK
    const result = await createJob(client, { jobInput, signer });

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Job creation failed');
    }

    console.log('[TriggerX] Job created successfully:', result);

    // Extract job ID from response
    const jobId = result.data.job_id || result.data.id;

    // Upload IPFS metadata if provided
    let ipfsLink: string | null = null;
    if (ipfsMetadata) {
      console.log('[TriggerX] Uploading IPFS metadata...');
      ipfsLink = await uploadPlanMetadataToIPFS({
        ...ipfsMetadata,
        jobId: jobId,
      });
      console.log('[TriggerX] IPFS metadata uploaded:', ipfsLink);
    }

    // Update the DCA plan with job details
    await updatePlanWithJobDetails(planId, jobId, ipfsLink);

    return {
      success: true,
      jobId,
      ipfsLink,
      planId,
      data: result.data,
    };

  } catch (error) {
    console.error('[TriggerX] Failed to create job:', error);
    throw new Error(`TriggerX job creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload plan metadata to IPFS
 */
export async function uploadPlanMetadataToIPFS(metadata: IPFSMetadata): Promise<string> {
  try {
    // This is a placeholder for IPFS upload
    // In a real implementation, you would:
    // 1. Use a service like Pinata, Web3.Storage, or NFT.Storage
    // 2. Upload the metadata JSON
    // 3. Return the IPFS hash

    console.log('[IPFS] Uploading metadata:', metadata);

    // Simulate IPFS upload
    const ipfsHash = `Qm${Date.now().toString(36)}${metadata.planId.slice(-16)}`;
    const ipfsLink = `ipfs://${ipfsHash}`;

    console.log('[IPFS] Metadata uploaded to:', ipfsLink);

    return ipfsLink;

  } catch (error) {
    console.error('[IPFS] Upload failed:', error);
    throw new Error(`IPFS upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update DCA plan with job details
 */
export async function updatePlanWithJobDetails(
  planId: string,
  jobId: string | null,
  ipfsLink: string | null
): Promise<void> {
  try {
    console.log('[Plan Update] Updating plan:', planId, { jobId, ipfsLink });

    const response = await fetch(`/api/dca/plans/${planId}/details`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: jobId,
        ipfsLink: ipfsLink,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update plan');
    }

    const result = await response.json();
    console.log('[Plan Update] Plan updated successfully:', result);

  } catch (error) {
    console.error('[Plan Update] Failed to update plan:', error);
    throw error;
  }
}

/**
 * Get signer from user's wallet
 * Automatically detects and uses the connected wallet via wagmi
 */
export async function getSignerFromWallet(): Promise<any> {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('getSignerFromWallet can only be called in browser environment');
    }

    // Check if window.ethereum is available (MetaMask, Coinbase Wallet, etc.)
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet detected. Please install MetaMask, Coinbase Wallet, or another Web3 wallet.');
    }

    // Create ethers provider from the browser's ethereum object
    const provider = new BrowserProvider(window.ethereum);

    // Request accounts if not already connected
    await provider.send('eth_requestAccounts', []);

    // Get the signer for the connected account
    const signer = await provider.getSigner();

    // Verify we have a valid signer
    if (!signer) {
      throw new Error('Failed to get signer from wallet');
    }

    console.log('[Wallet] Signer obtained from wallet:', await signer.getAddress());
    return signer;

  } catch (error) {
    console.error('[Wallet] Failed to get signer from wallet:', error);
    throw new Error(`Wallet connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a minimal TriggerX job input for DCA plans
 */
export function createDCAJobInput(params: {
  planId: string;
  contractAddress: string;
  contractABI: string;
  intervalMinutes: number;
  durationWeeks: number;
}): TimeBasedJobInput & { jobType: JobType.Time; argType: ArgType.Static } {
  const { planId, contractAddress, contractABI, intervalMinutes, durationWeeks } = params;

  return {
    jobType: JobType.Time,
    argType: ArgType.Static,
    jobTitle: `DCA-${planId}`,
    timeFrame: durationWeeks * 7 * 24 * 60 * 60, // weeks to seconds
    scheduleType: 'interval' as const,
    timeInterval: intervalMinutes * 60, // minutes to seconds
    timezone: 'UTC',
    chainId: '1', // Ethereum mainnet
    targetContractAddress: contractAddress,
    targetFunction: 'executeSwap',
    abi: contractABI,
    arguments: [planId],
    autotopupTG: true,
  };
}

/**
 * Complete DCA plan creation workflow with TriggerX integration
 */
export async function createCompleteDCAPlan(params: {
  message: string;
  userAddress: string;
  planData: {
    fromToken: string;
    toToken: string;
    amount: string;
    intervalMinutes: number;
    durationWeeks: number;
    slippage: string;
  };
  contractAddress: string;
  contractABI: string;
}) {
  const { message, userAddress, planData, contractAddress, contractABI } = params;

  try {
    // 1. Create the DCA plan through chat
    const planResponse = await fetch('/api/dca-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        userAddress,
        isPlanCreationRequest: true,
      }),
    });

    const planResult = await planResponse.json();

    if (!planResult.success) {
      throw new Error('Failed to create DCA plan');
    }

    const planId = planResult.data.id;

    // 2. Create minimal TriggerX job input
    const jobInput = createDCAJobInput({
      planId,
      contractAddress,
      contractABI,
      intervalMinutes: planData.intervalMinutes,
      durationWeeks: planData.durationWeeks,
    });

    // 3. Create IPFS metadata (optional)
    const ipfsMetadata: IPFSMetadata = {
      planId,
      userAddress,
      fromToken: planData.fromToken,
      toToken: planData.toToken,
      amount: planData.amount,
      intervalMinutes: planData.intervalMinutes,
      durationWeeks: planData.durationWeeks,
      slippage: planData.slippage,
      createdAt: new Date().toISOString(),
    };

    // 4. Get signer and create job
    const signer = await getSignerFromWallet();
    const result = await createTriggerXJobForPlan({
      planId,
      jobInput,
      ipfsMetadata,
      signer,
    });

    return result;

  } catch (error) {
    console.error('Complete DCA plan creation failed:', error);
    throw error;
  }
}

/**
 * Get plan details including job and IPFS information
 */
export async function getPlanDetails(planId: string) {
  try {
    const response = await fetch(`/api/dca/plans/${planId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch plan details');
    }

    const result = await response.json();
    return result.data;

  } catch (error) {
    console.error('Failed to get plan details:', error);
    throw error;
  }
}

/**
 * Minimal example of how to use TriggerX SDK with DCA
 *
 * This shows the absolute minimum code needed to:
 * 1. Create a time-based job input
 * 2. Create the job using the SDK
 * 3. Handle the response
 */

//currently not used
export async function minimalTriggerXExample() {
  const { TriggerXClient, createJob, JobType, ArgType } = await import('sdk-triggerx');

  // 1. Create minimal job input
  const jobInput = {
    jobType: JobType.Time,
    argType: ArgType.Static,
    jobTitle: 'My DCA Job',
    timeFrame: 604800, // 1 week in seconds
    scheduleType: 'interval' as const,
    timeInterval: 86400, // 1 day in seconds
    timezone: 'UTC',
    chainId: '1',
    targetContractAddress: '0x...',
    targetFunction: 'executeSwap',
    abi: '[...]',
    arguments: ['plan-id'],
    autotopupTG: true,
  };

  // 2. Create client and job
  const client = new TriggerXClient(process.env.NEXT_PUBLIC_TRIGGERX_API_KEY || '');

  // 3. Get signer from wallet
  const signer = await getSignerFromWallet();

  // 4. Create job
  const result = await createJob(client, { jobInput, signer });

  // 5. Handle response
  if (result.success && result.data) {
    const jobId = result.data.job_id;
    console.log('Job created:', jobId);
    return jobId;
  } else {
    throw new Error(result.error || 'Job creation failed');
  }
}

/**
 * Check if a plan has an active TriggerX job
 */

//currently not used
export async function checkPlanJobStatus(planId: string) {
  try {
    const plan = await getPlanDetails(planId);

    return {
      hasJob: !!plan.jobId,
      hasIPFS: !!plan.ipfsLink,
      jobId: plan.jobId,
      ipfsLink: plan.ipfsLink,
      status: plan.status,
    };

  } catch (error) {
    console.error('Failed to check plan job status:', error);
    throw error;
  }
}
