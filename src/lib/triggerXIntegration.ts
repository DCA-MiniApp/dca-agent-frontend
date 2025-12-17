/**
 * TriggerX Integration for DCA Agent Frontend
 *
 * This module provides utilities for creating TriggerX jobs and updating
 * DCA plans with job details and IPFS metadata.
 */

import { TriggerXClient, createJob, JobType, ArgType, type TimeBasedJobInput, deleteJob, checkEthBalance, depositEth, withdrawEth } from 'sdk-triggerx';
import { BrowserProvider } from 'ethers';
import {
  SWAP_EXECUTOR_ABI,
  EXECUTOR_CONTRACT_ADDRESS,
  TARGET_FUNCTION_NAME,
  DCA_JOB_CONFIG
} from './abi/SwapExecutor';
// import { deleteJob } from 'sdk-triggerx/dist/api/deleteJob.js';
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
  fid?: number; // optional fid for user identification
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
    signer,
    fid
  } = params;

  try {
    // console.log('🚀 Starting TriggerX job creation for plan:', planId);
    // console.log("params", params);
    console.info('[TRIGGERX INTEGRATION] userAddress from params:', userAddress);
    // console.log('🔍 [TRIGGERX INTEGRATION] Address length:', userAddress?.length);
    // console.log('🔍 [TRIGGERX INTEGRATION] Address regex test:', /^0x[a-fA-F0-9]{40}$/.test(userAddress || ''));

    // Step 1: Get token addresses and validate script parameters
    const fromTokenInfo = getTokenInfo(fromToken);
    const toTokenInfo = getTokenInfo(toToken);

    // console.log('🔍 Token info - From:', fromTokenInfo, 'To:', toTokenInfo);

    const scriptParams: DCAScriptParams = {
      userAddress,
      fromToken: fromTokenInfo.symbol,
      toToken: toTokenInfo.symbol,
      amount,
      slippage,
    };

    console.info('[TRIGGERX INTEGRATION] scriptParams.userAddress:', scriptParams.userAddress);
    // console.log('🔍 [TRIGGERX INTEGRATION] scriptParams address length:', scriptParams.userAddress?.length);
    // console.log('🔍 [TRIGGERX INTEGRATION] scriptParams address regex test:', /^0x[a-fA-F0-9]{40}$/.test(scriptParams.userAddress || ''));

    const validation = validateDCAScriptParams(scriptParams);
    if (!validation.isValid) {
      throw new Error(`Invalid script parameters: ${validation.errors.join(', ')}`);
    }

    // Step 2: Generate and upload minimal script to IPFS
    // console.log('📝 Generating minimal DCA script...');
    const uploadResult = await uploadDCAScriptToIPFS(
      scriptParams,
      generateDCAScript
    );

    if (!uploadResult.success || !uploadResult.scriptIpfsUrl) {
      throw new Error(`IPFS upload failed: ${uploadResult.error}`);
    }

    console.info('Minimal script uploaded to IPFS:', uploadResult.scriptIpfsUrl);
    console.info("Script HASH:", uploadResult.scriptIpfsHash);
    const scriptIpfsUrl = `https://ipfs.io/ipfs/${uploadResult.scriptIpfsHash}`;

    // Step 3: Create TriggerX job input
    // console.log('🔍 [TRIGGERX INTEGRATION] userAddress before createDCAJobInput:', userAddress);
    const jobInput = createDCAJobInput({
      planId,
      contractAddress: EXECUTOR_CONTRACT_ADDRESS,
      contractABI: JSON.stringify(SWAP_EXECUTOR_ABI),
      intervalMinutes,
      durationWeeks,
      userAddress,
      fromToken,
      amount,
      scriptIpfsUrl: scriptIpfsUrl,
    });
    console.info('[TRIGGERX INTEGRATION] jobInput created (check for userAddress in it):', JSON.stringify(jobInput, null, 2));

    // Step 4: Create TriggerX job
    // console.log('⚡ Creating TriggerX job...');
    const apiKey = process.env.NEXT_PUBLIC_TRIGGERX_API_KEY || '';
    // console.log('🔑 API Key exists:', !!apiKey, 'Length:', apiKey.length);

    const client = new TriggerXClient(apiKey);
    // console.log("📡 TriggerX Client:", client);
    console.info("📝 Job Input (full):", JSON.stringify(jobInput, null, 2));
    console.info("🔗 IPFS URL being passed:", jobInput.dynamicArgumentsScriptUrl);
    // console.log("✍️ Signer:", signer);

    let result;
    try {
      // console.log('📤 Calling createJob...');
      result = await createJob(client, { jobInput, signer });
      console.info('CreateJob result:', result);
    } catch (error) {
      console.error('❌ CreateJob error details:', error);
      console.error('❌ Error message:', (error as any)?.message);
      console.error('❌ Error response:', (error as any)?.response);
      console.error('❌ Error status:', (error as any)?.status);
      console.error('❌ Error data:', (error as any)?.data);
      // console.error('❌ Error stack:', error.stack);
      throw error;
    }

    if (!result.success || !result.data) {
      // Preserve the full result object as error so we can access errorType, errorCode, and details
      const error: any = new Error(result.error || 'TriggerX job creation failed');
      error.errorType = result.errorType;
      error.errorCode = result.errorCode;
      error.details = result.details;
      error.error = result.error;
      throw error;
    }

    // Normalize jobId to a single string (backend expects string, not array)
    const jobId = (
      (Array.isArray((result as any)?.data?.job_id) && (result as any).data.job_id[0]) ||
      (Array.isArray((result as any)?.data?.job_ids) && (result as any).data.job_ids[0]) ||
      (result as any)?.data?.job_id ||
      (result as any)?.data?.job_ids ||
      (result as any)?.data?.id ||
      null
    );
    console.info('TriggerX job created:', jobId);

    // Step 5: Update plan with job details
    const ipfsLink = uploadResult.scriptIpfsUrl;
    // Ensure fid is null if undefined, to satisfy type requirements
    await updatePlanWithJobDetails(planId, jobId, ipfsLink, fid === undefined ? null : fid);

    // console.log('🎉 Complete TriggerX job setup finished!');

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
    console.error('[TriggerX] Error type:', typeof error);
    console.error('[TriggerX] Error errorType:', (error as any)?.errorType);
    console.error('[TriggerX] Error errorCode:', (error as any)?.errorCode);
    console.error('[TriggerX] Error error field:', (error as any)?.error);
    console.error('[TriggerX] Error details:', (error as any)?.details);

    // Check if this is a balance error with details
    let errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (error && typeof error === 'object') {
      const errorObj = error as any;

      // Check for BALANCE_ERROR specifically
      if (errorObj.errorCode === 'BALANCE_ERROR' || errorObj.errorType === 'BALANCE_ERROR' || errorObj.error === 'Failed to deposit ETH balance') {
        console.log('[TriggerX] ✅ Detected BALANCE_ERROR, extracting ethAmount...');
        const details = errorObj.details || {};
        const ethAmount = details.ethAmount;

        // console.log('[TriggerX] ethAmount from details:', ethAmount);

        if (ethAmount) {
          // Convert bigint to ETH (assuming wei)
          const ethAmountInEth = (Number(ethAmount) / 1e18).toFixed(6);
          // console.log('[TriggerX] Converted to ETH:', ethAmountInEth);
          errorMessage = `INSUFFICIENT_BALANCE:${ethAmountInEth}`;
        } else {
          errorMessage = 'INSUFFICIENT_BALANCE:unknown';
        }

        console.info('[TriggerX] Final error message:', errorMessage);
      } else {
        console.log('[TriggerX] Not a balance error, using original message');
      }
    }

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
  ipfsLink: string | null,
  fid: number | null
): Promise<void> {
  try {
    const DCA_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3031';
    // console.info('[Plan Update] Updating plan:', planId, { jobId, ipfsLink });

    const response = await fetch(`${DCA_API_URL}/api/dca/plans/${planId}/details`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: jobId,
        ipfsLink: ipfsLink,
        fid: fid,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update plan');
    }

    const result = await response.json();
    console.info('[Plan Update] Plan updated successfully:', result);

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

    // console.log('[Wallet] Signer obtained from wallet:', await signer.getAddress());
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
    // Ensure integer seconds for SDK
    timeFrame: Math.round(durationWeeks * 7 * 24 * 60 * 60), // weeks to seconds
    scheduleType: DCA_JOB_CONFIG.scheduleType, // "interval"
    timeInterval: Math.round(intervalMinutes * 60), // minutes to seconds
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
    isImua: false, // Add missing isImua field
    walletMode: 'regular', // Add missing walletMode field
    safeAddress: '0x27e801a2233D322eB72861F073f9B1F72B103b01', // Add missing safeAddress field
    language: 'go',
  };
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
    safeAddress: '0x27e801a2233D322eB72861F073f9B1F72B103b01'
  };

  // 2. Create client and job
  const client = new TriggerXClient(process.env.NEXT_PUBLIC_TRIGGERX_API_KEY || '');

  // 3. Get signer from wallet
  const signer = await getSignerFromWallet();

  // 4. Create job
  const result = await createJob(client, { jobInput, signer });
  // console.log("result", result);

  // 5. Handle response
  if (result.success && result.data) {
    const jobId = result.data.job_id;
    // console.log('Job created:', jobId);
    return jobId;
  } else {
    throw new Error(result.error || 'Job creation failed');
  }
}

/**
 * Delete a TriggerX job for a DCA plan
 * Note: This function attempts to cancel/stop the job using the TriggerX API
 */
export async function deleteTriggerXJobForPlan(jobId: string, signer: any, chainId: string = '42161'): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // console.log('🗑️ Starting TriggerX job deletion for job:', jobId);

    // Create TriggerX client
    const apiKey = process.env.NEXT_PUBLIC_TRIGGERX_API_KEY || '';
    if (!apiKey) {
      throw new Error('TriggerX API key not found');
    }

    const client = new TriggerXClient(apiKey);
    // console.log('📡 TriggerX Client created for deletion');

    // Wrap signer to detect user rejections at transaction level
    const wrappedSigner = new Proxy(signer, {
      get(target, prop) {
        const original = target[prop as keyof typeof target];

        // Intercept sendTransaction to catch user rejections
        if (prop === 'sendTransaction') {
          return async function (...args: any[]) {
            try {
              const result = await (original as (...args: any[]) => any).apply(target, args);
              return result;
            } catch (error: any) {
              const msg = (error?.message || '').toString().toLowerCase();
              const code = error?.code || error?.error?.code;

              // Check if this is a user rejection
              const isUserRejection =
                code === 'ACTION_REJECTED' ||
                code === 4001 ||
                code === 'USER_REJECTED' ||
                /rejected/i.test(msg) ||
                /user.*cancel/i.test(msg) ||
                /user.*denied/i.test(msg) ||
                /cancelled/i.test(msg);

              if (isUserRejection) {
                // Throw a specific error that we can catch
                const rejectionError: any = new Error('user_rejected');
                rejectionError.code = 'USER_REJECTED';
                rejectionError.isUserRejection = true;
                throw rejectionError;
              }
              throw error;
            }
          };
        }

        // For other properties, return as-is
        if (typeof original === 'function') {
          return original.bind(target);
        }
        return original;
      }
    });

    // Delete the job using the TriggerX SDK (requires signer and chainId)
    try {
      const result = await deleteJob(client, jobId, wrappedSigner, chainId);
      // console.log('deleteJob result:', result);

      // Check if result is an object with success property (like createJob)
      if (result && typeof result === 'object') {
        const resultAny = result as any;

        // If result has success: false, it might indicate user rejection
        if (result.success === false) {
          const errorMsg = (result.error || resultAny.message || '').toString().toLowerCase();
          const isUserRejection =
            /rejected/i.test(errorMsg) ||
            /user.*cancel/i.test(errorMsg) ||
            /user.*denied/i.test(errorMsg) ||
            /cancelled/i.test(errorMsg) ||
            errorMsg.includes('rejected') ||
            errorMsg.includes('user cancelled');

          if (isUserRejection) {
            return { success: false, error: 'user_rejected' };
          }
          return { success: false, error: errorMsg || 'delete_failed' };
        }

        // If result has success: true, check if there's any indication of rejection
        if (result.success === true) {
          // Check if transaction hash exists - if user rejected, there might be no hash
          if (resultAny.txHash || resultAny.transactionHash || resultAny.hash) {
            return { success: true };
          }
          // If no hash but success is true, might be a false positive
          // Still return success but log for debugging
          console.warn('deleteJob returned success but no transaction hash');
          return { success: true };
        }
      }

      // If result doesn't have expected structure, assume success
      // console.log('✅ TriggerX job deleted successfully:', jobId, signer, chainId);
      return { success: true };
    } catch (apiError: any) {
      console.error('❌ Error deleting job via SDK:', apiError);

      // Check if this is a user rejection from the wrapped signer
      if (apiError?.isUserRejection || apiError?.message === 'user_rejected') {
        console.warn('ℹUser rejected the transaction');
        return { success: false, error: 'user_rejected' };
      }

      const msg = (apiError?.message || '').toString().toLowerCase();
      const code = apiError?.code || apiError?.error?.code || apiError?.info?.error?.code;
      console.log('Error code:', code);

      // Enhanced user rejection detection - check multiple patterns
      const isUserRejection =
        code === 'ACTION_REJECTED' ||
        code === 4001 ||
        code === 'USER_REJECTED' ||
        /rejected/i.test(msg) ||
        /user.*cancel/i.test(msg) ||
        /user.*denied/i.test(msg) ||
        /cancelled/i.test(msg) ||
        msg.includes('rejected') ||
        msg.includes('user cancelled');

      // console.log('Is user rejection:', isUserRejection);

      // Propagate user rejection distinctly so UI does NOT update backend
      if (isUserRejection) {
        return { success: false, error: 'user_rejected' };
      }
      return { success: false, error: msg || 'delete_failed' };
    }
  } catch (error) {
    console.error('❌ Error cancelling TriggerX job:', error);
    const msg = (error as any)?.message || 'delete_failed';
    return { success: false, error: msg };
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

export async function checkTgBalanceForUser(userAddress: string, chainId: string = '42161') {
  const balance = await checkEthBalance(userAddress, chainId);
  return balance;
}

export async function depositTgBalanceForUser(ethAmount: bigint, signer: any) {
  const depositResult = await depositEth(ethAmount, signer);
  return depositResult;
}

export async function withdrawTgBalanceForUser(ethAmount: bigint, signer: any) {
  const withdrawResult = await withdrawEth(signer, ethAmount);
  return withdrawResult;
}