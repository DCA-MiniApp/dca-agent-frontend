/**
 * TriggerX Integration for DCA Agent Frontend
 *
 * This module provides utilities for creating TriggerX jobs and updating
 * DCA plans with job details and IPFS metadata.
 */

import { TriggerXClient, createJob, JobType, ArgType, type TimeBasedJobInput, type CreateJobInput } from 'sdk-triggerx';
import { BrowserProvider } from 'ethers';
import {
  SWAP_EXECUTOR_ABI,
  EXECUTOR_CONTRACT_ADDRESS,
  TARGET_FUNCTION_NAME,
  DCA_JOB_CONFIG
} from './abi/SwapExecutor';
import tokenMapData from '../tokenMap_arbitrum.json';
import {
  generateDCAScript,
  validateDCAScriptParams,
  type DCAScriptParams
} from './dcaScriptGenerator';
import {
  uploadDCAScriptToIPFS,
  getPinataService
} from './services/pinataService';

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

// Removed IPFSMetadata interface - no longer needed

export interface CreateTriggerXJobParams {
  planId: string;
  userAddress: string;
  fromToken: string;
  toToken: string;
  amount: string;
  intervalMinutes: number;
  durationWeeks: number;
  slippage: string;
  signer: any; // ethers.Signer instance
}

export interface TriggerXJobCreationResult {
  success: boolean;
  jobId?: string;
  ipfsLink?: string;
  scriptIpfsUrl?: string;
  metadataIpfsUrl?: string;
  planId: string;
  data?: any;
  error?: string;
}

/**
 * Get token address from token map by symbol
 */
function getTokenAddress(symbol: string): string | null {
  try {
    const upperSymbol = symbol.toUpperCase();
    const tokenEntries = (tokenMapData.tokenMap as any)[upperSymbol];

    if (tokenEntries && tokenEntries.length > 0) {
      // Return the first matching token address for the symbol
      return tokenEntries[0].address;
    }

    console.warn(`Token address not found for symbol: ${symbol}`);
    return null;
  } catch (error) {
    console.error('Error getting token address:', error);
    return null;
  }
}

/**
 * Get both token symbol and address
 */
function getTokenInfo(symbol: string): { symbol: string; address: string | null } {
  return {
    symbol: symbol.toUpperCase(),
    address: getTokenAddress(symbol)
  };
}

/**
 * Create a complete TriggerX job for DCA plan with dynamic script
 */
export async function createTriggerXJobForPlan(params: CreateTriggerXJobParams): Promise<TriggerXJobCreationResult> {
  const {
    planId,
    userAddress,
    fromToken,
    toToken,
    amount,
    intervalMinutes,
    durationWeeks,
    slippage,
    signer
  } = params;

  try {
    console.log('🚀 Starting TriggerX job creation for plan:', planId);
    console.log("params", params);

    // Step 1: Get token addresses and validate script parameters
    const fromTokenInfo = getTokenInfo(fromToken);
    const toTokenInfo = getTokenInfo(toToken);

    console.log('🔍 Token info - From:', fromTokenInfo, 'To:', toTokenInfo);

    const scriptParams: DCAScriptParams = {
      userAddress,
      fromToken: fromTokenInfo.symbol,
      toToken: toTokenInfo.symbol,
      amount,
      slippage,
    };

    const validation = validateDCAScriptParams(scriptParams);
    if (!validation.isValid) {
      throw new Error(`Invalid script parameters: ${validation.errors.join(', ')}`);
    }

    // Step 2: Generate and upload minimal script to IPFS
    console.log('📝 Generating minimal DCA script...');
    const uploadResult = await uploadDCAScriptToIPFS(
      scriptParams,
      generateDCAScript
    );

    if (!uploadResult.success || !uploadResult.scriptIpfsUrl) {
      throw new Error(`IPFS upload failed: ${uploadResult.error}`);
    }

    console.log('✅ Minimal script uploaded to IPFS:', uploadResult.scriptIpfsUrl);

    // Step 3: Create TriggerX job input
    const jobInput = createDCAJobInput({
      planId,
      contractAddress: EXECUTOR_CONTRACT_ADDRESS,
      contractABI: JSON.stringify(SWAP_EXECUTOR_ABI),
      intervalMinutes,
      durationWeeks,
      userAddress,
      fromToken,
      amount,
      scriptIpfsUrl: uploadResult.scriptIpfsUrl,
    });

    // Step 4: Create TriggerX job
    console.log('⚡ Creating TriggerX job...');
    const apiKey = process.env.NEXT_PUBLIC_TRIGGERX_API_KEY || '';
    console.log('🔑 API Key exists:', !!apiKey, 'Length:', apiKey.length);
    
    const client = new TriggerXClient(apiKey);
    console.log("📡 TriggerX Client:", client);
    console.log("📝 Job Input (full):", JSON.stringify(jobInput, null, 2));
    console.log("🔗 IPFS URL being passed:", jobInput.dynamicArgumentsScriptUrl);
    console.log("✍️ Signer:", signer);
    
    let result;
    try {
      console.log('📤 Calling createJob...');
      result = await createJob(client, { jobInput, signer });
      console.log('📥 CreateJob result:', result);
    } catch (error) {
      console.error('❌ CreateJob error details:', error);
      // console.error('❌ Error message:', error.message);
      // console.error('❌ Error stack:', error.stack);
      throw error;
    }

    if (!result.success || !result.data) {
      throw new Error(result.error || 'TriggerX job creation failed');
    }

    const jobId = result.data.job_id || result.data.id;
    console.log('✅ TriggerX job created:', jobId);

    // Step 5: Update plan with job details
    const ipfsLink = uploadResult.scriptIpfsUrl;
    await updatePlanWithJobDetails(planId, jobId, ipfsLink);

    console.log('🎉 Complete TriggerX job setup finished!');

    return {
      success: true,
      jobId,
      ipfsLink,
      scriptIpfsUrl: uploadResult.scriptIpfsUrl,
      planId,
      data: result.data,
    };

  } catch (error) {
    console.error('[TriggerX] Failed to create job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      planId,
      error: errorMessage,
    };
  }
}

// Removed uploadPlanMetadataToIPFS function - no longer needed

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
 * 
 * @deprecated Use triggerXService.ts with useWalletClient hook instead
 * This function doesn't have access to Wagmi context and should be replaced
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
 * Create a complete TriggerX job input for DCA plans with Dynamic arguments
 */
export function createDCAJobInput(params: {
  planId: string;
  contractAddress: string;
  contractABI: string;
  intervalMinutes: number;
  durationWeeks: number;
  userAddress: string;
  fromToken: string;
  amount: string;
  scriptIpfsUrl: string;
}): TimeBasedJobInput & { jobType: JobType.Time; argType: ArgType.Dynamic } {

  const {
    contractAddress,
    contractABI,
    intervalMinutes,
    durationWeeks,
    scriptIpfsUrl
  } = params;


  return {
    jobType: JobType.Time,
    argType: ArgType.Dynamic, // Use proper enum from SDK
    jobTitle: DCA_JOB_CONFIG.jobTitle, // "dca-automate"
    timeFrame: durationWeeks * 7 * 24 * 60 * 60, // weeks to seconds
    scheduleType: DCA_JOB_CONFIG.scheduleType, // "interval"
    timeInterval: intervalMinutes * 60, // minutes to seconds
    timezone: DCA_JOB_CONFIG.timezone, // "Asia/Calcutta"
    chainId: DCA_JOB_CONFIG.chainId, // "42161" (Arbitrum)
    targetContractAddress: contractAddress,
    targetFunction: TARGET_FUNCTION_NAME, // "executeSwap"
    abi: contractABI,
    // For Dynamic argType, arguments array is empty - script provides the args
    arguments: [],
    // Dynamic arguments script URL from IPFS
    dynamicArgumentsScriptUrl: scriptIpfsUrl,
    autotopupTG: DCA_JOB_CONFIG.autotopupTG, // true
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
}): Promise<TriggerXJobCreationResult> {
  const { message, userAddress, planData } = params;

  try {
    console.log('🚀 Starting complete DCA plan creation workflow...');

    // 1. Create the DCA plan through chat
    console.log('📝 Creating DCA plan via chat...');
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
    console.log('✅ DCA plan created:', planId);

    // 2. Get signer and create complete TriggerX job
    console.log('🔐 Getting wallet signer...');
    const signer = await getSignerFromWallet();

    console.log('⚡ Creating TriggerX job with dynamic script...');
    const result = await createTriggerXJobForPlan({
      planId,
      userAddress,
      fromToken: planData.fromToken,
      toToken: planData.toToken,
      amount: planData.amount,
      intervalMinutes: planData.intervalMinutes,
      durationWeeks: planData.durationWeeks,
      slippage: planData.slippage,
      signer,
    });

    if (result.success) {
      console.log('🎉 Complete DCA workflow finished successfully!');
      console.log('📊 Job ID:', result.jobId);
      console.log('🔗 Script IPFS:', result.scriptIpfsUrl);
    } else {
      console.error('❌ DCA workflow failed:', result.error);
    }

    return result;

  } catch (error) {
    console.error('❌ Complete DCA plan creation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      planId: '',
      error: errorMessage,
    };
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
  console.log("result", result);

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
