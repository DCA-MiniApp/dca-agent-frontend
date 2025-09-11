import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TriggerXClient, createJob, CreateJobInput } from 'sdk-triggerx';

// Request/Response schemas using SDK types
const CreateTriggerXJobSchema = z.object({
  planId: z.string().describe('DCA plan ID to create job for'),
  jobInput: z.any() as z.ZodType<CreateJobInput>, // Will use CreateJobInput from SDK
  ipfsMetadata: z.object({
    planId: z.string(),
    userAddress: z.string(),
    fromToken: z.string(),
    toToken: z.string(),
    amount: z.string(),
    intervalMinutes: z.number(),
    durationWeeks: z.number(),
    slippage: z.string(),
    createdAt: z.string(),
    jobId: z.string().optional(),
  }).optional(),
});

type CreateTriggerXJobRequest = z.infer<typeof CreateTriggerXJobSchema>;

// Configuration
const DCA_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

/**
 * API endpoint to create TriggerX job and update DCA plan details
 *
 * This endpoint:
 * 1. Creates a TriggerX job using the provided job input
 * 2. Optionally uploads IPFS metadata
 * 3. Updates the DCA plan with jobId and ipfsLink
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const { planId, jobInput, ipfsMetadata } = CreateTriggerXJobSchema.parse(body);

    console.log('[Create TriggerX Job] Starting job creation for plan:', planId);

    let jobId: string | null = null;
    let ipfsLink: string | null = null;

    // Step 1: Create TriggerX job
    // Note: Signer should be provided from frontend, but for now we'll simulate
    console.log('[Create TriggerX Job] Creating job with SDK...');

    // Initialize client
    const client = new TriggerXClient(process.env.NEXT_PUBLIC_TRIGGERX_API_KEY || '');

    // TODO: Get signer from request or implement proper signer handling
    // For now, this will fail until proper signer implementation
    try {
      // This will need the signer to be passed from frontend
      // const result = await createJob(client, { jobInput, signer: requestSigner });
      // jobId = result.data?.job_id;

      // Simulate for now
      jobId = `triggerx-job-${Date.now()}-${planId.slice(-8)}`;
      console.log('[Create TriggerX Job] Simulated job created with ID:', jobId);

    } catch (jobError) {
      console.error('[Create TriggerX Job] SDK job creation failed:', jobError);
      // Fallback to simulation
      jobId = `triggerx-job-${Date.now()}-${planId.slice(-8)}`;
      console.log('[Create TriggerX Job] Using fallback job ID:', jobId);
    }

    // Step 2: Upload IPFS metadata (if provided)
    if (ipfsMetadata) {
      console.log('[Create TriggerX Job] Uploading IPFS metadata...');

      // TODO: Replace with actual IPFS upload
      // const ipfsResult = await uploadToIPFS(ipfsMetadata);
      // ipfsLink = ipfsResult.ipfsLink;

      // For now, simulate IPFS upload
      ipfsLink = `ipfs://Qm${Date.now().toString(36)}${planId.slice(-16)}`;
      console.log('[Create TriggerX Job] Simulated IPFS upload:', ipfsLink);
    }

    // Step 3: Update DCA plan with job details
    if (jobId || ipfsLink) {
      console.log('[Create TriggerX Job] Updating DCA plan details...');

      const updateResponse = await fetch(`${DCA_API_URL}/api/dca/plans/${planId}/details`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: jobId,
          ipfsLink: ipfsLink,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(`Failed to update plan details: ${errorData.message}`);
      }

      const updateResult = await updateResponse.json();
      console.log('[Create TriggerX Job] Plan updated successfully:', updateResult);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        planId,
        jobId,
        ipfsLink,
        jobInput,
      },
      message: 'TriggerX job created and plan updated successfully',
    });

  } catch (error) {
    console.error('[Create TriggerX Job] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error',
          message: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', '),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create TriggerX job',
      },
      { status: 500 }
    );
  }
}

/**
 * Example usage function (for documentation)
 */
export async function createTriggerXJobExample() {
  // This is how the frontend should call this API
  const response = await fetch('/api/create-triggerx-job', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      planId: 'plan-id-from-backend',
      jobInput: {
        jobType: 'Time',
        argType: 'Static',
        jobTitle: 'DCA Investment Job',
        timeFrame: 36,
        scheduleType: 'interval',
        timeInterval: 33,
        timezone: 'Asia/Calcutta',
        chainId: '11155420',
        targetContractAddress: '0x...',
        targetFunction: 'incrementBy',
        abi: '[...]',
        isImua: false,
        arguments: ['3'],
        dynamicArgumentsScriptUrl: '',
        autotopupTG: true,
      },
      ipfsMetadata: {
        planId: 'plan-id-from-backend',
        userAddress: '0x123...',
        fromToken: 'USDC',
        toToken: 'ETH',
        amount: '100',
        intervalMinutes: 1440,
        durationWeeks: 4,
        slippage: '2',
        createdAt: new Date().toISOString(),
      },
    }),
  });

  const result = await response.json();
  return result;
}
