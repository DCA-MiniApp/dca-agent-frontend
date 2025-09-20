import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createTriggerXJobForPlan, type CreateTriggerXJobParams } from '@/lib/triggerXIntegration';

// Request/Response schemas
const CreateTriggerXJobSchema = z.object({
  planId: z.string().describe('DCA plan ID to create job for'),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address').describe('User wallet address'),
  fromToken: z.string().describe('Source token symbol (e.g., USDC)'),
  toToken: z.string().describe('Target token symbol (e.g., ETH)'),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a valid number').describe('Investment amount per execution'),
  intervalMinutes: z.number().min(1).describe('Execution interval in minutes'),
  durationWeeks: z.number().min(1).describe('Total investment duration in weeks'),
  slippage: z.string().regex(/^\d+(\.\d+)?$/, 'Slippage must be a valid number').describe('Slippage tolerance in percentage'),
  createdAt: z.string().describe('Plan creation timestamp'),
});

type CreateTriggerXJobRequest = z.infer<typeof CreateTriggerXJobSchema>;

// Configuration
const DCA_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

/**
 * API endpoint to create complete TriggerX job with dynamic script
 *
 * This endpoint:
 * 1. Validates the request parameters
 * 2. Generates dynamic DCA script with plan parameters
 * 3. Uploads script and metadata to IPFS
 * 4. Creates TriggerX time-based job
 * 5. Updates DCA plan with jobId and ipfsLink
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const validatedData = CreateTriggerXJobSchema.parse(body);

    const {
      planId,
      userAddress,
      fromToken,
      toToken,
      amount,
      intervalMinutes,
      durationWeeks,
      slippage,
      createdAt,
    } = validatedData;

    console.log('🚀 [Create TriggerX Job] Starting complete workflow for plan:', planId);

    // For now, we'll need to get the signer from the request
    // In production, this should come from the frontend's wallet connection
    // For API routes, we might need to use a different approach

    // TODO: Implement proper signer handling for API routes
    // This is a temporary workaround - in production, the signer should come from the frontend
    const signer = null; // This will need to be implemented properly

    if (!signer) {
      console.warn('[Create TriggerX Job] ⚠️ Signer not available - simulating job creation');

      // Simulate the complete workflow for now
      const simulatedResult = await simulateTriggerXJobCreation(validatedData);

      return NextResponse.json({
        success: true,
        data: simulatedResult,
        message: 'TriggerX job creation simulated successfully',
        warning: 'Signer not implemented - using simulation mode',
      });
    }

    // Create job parameters
    const jobParams: CreateTriggerXJobParams = {
      planId,
      userAddress,
      fromToken,
      toToken,
      amount,
      intervalMinutes,
      durationWeeks,
      slippage,
      createdAt,
      signer,
    };

    // Execute the complete workflow
    const result = await createTriggerXJobForPlan(jobParams);

    if (!result.success) {
      throw new Error(result.error || 'Failed to create TriggerX job');
    }

    console.log('✅ [Create TriggerX Job] Complete workflow finished successfully');

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        planId: result.planId,
        jobId: result.jobId,
        ipfsLink: result.ipfsLink,
        scriptIpfsUrl: result.scriptIpfsUrl,
        metadataIpfsUrl: result.metadataIpfsUrl,
        triggerXData: result.data,
      },
      message: 'TriggerX job with dynamic script created successfully',
    });

  } catch (error) {
    console.error('❌ [Create TriggerX Job] Error:', error);

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
 * Simulate TriggerX job creation for development/testing
 * This will be removed once proper signer handling is implemented
 */
async function simulateTriggerXJobCreation(params: CreateTriggerXJobRequest) {
  const {
    planId,
    userAddress,
    fromToken,
    toToken,
    amount,
    intervalMinutes,
    durationWeeks,
    slippage,
    createdAt,
  } = params;

  console.log('[Simulation] 🚀 Simulating TriggerX job creation...');

  // Simulate job creation
  const jobId = `triggerx-job-${Date.now()}-${planId.slice(-8)}`;

  // Simulate IPFS upload
  const scriptIpfsUrl = `https://gateway.pinata.cloud/ipfs/Qm${Date.now().toString(36)}${planId.slice(-16)}-script`;
  const metadataIpfsUrl = `https://gateway.pinata.cloud/ipfs/Qm${Date.now().toString(36)}${planId.slice(-16)}-metadata`;

  // Update DCA plan with simulated details
  try {
    const updateResponse = await fetch(`${DCA_API_URL}/api/dca/plans/${planId}/details`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: jobId,
        ipfsLink: scriptIpfsUrl,
      }),
    });

    if (!updateResponse.ok) {
      console.warn('[Simulation] Failed to update plan details:', await updateResponse.text());
    } else {
      console.log('[Simulation] ✅ Plan updated with simulated details');
    }
  } catch (updateError) {
    console.warn('[Simulation] Failed to update plan:', updateError);
  }

  console.log('[Simulation] ✅ TriggerX job creation simulated');

  return {
    planId,
    jobId,
    ipfsLink: scriptIpfsUrl,
    scriptIpfsUrl,
    metadataIpfsUrl,
    simulated: true,
    message: 'This is a simulation - implement proper signer handling for production',
  };
}

/**
 * Example usage function (for documentation)
 *
 * Shows how to call the new API with individual plan parameters
 * instead of pre-built jobInput objects
 */
export async function createTriggerXJobExample() {
  // This is how the frontend should call this API with the new format
  const response = await fetch('/api/create-triggerx-job', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      planId: 'plan-id-from-backend',
      userAddress: '0x1234567890123456789012345678901234567890',
      fromToken: 'USDC',
      toToken: 'ETH',
      amount: '100.50',
      intervalMinutes: 1440, // 1 day
      durationWeeks: 4,
      slippage: '2.0',
      createdAt: new Date().toISOString(),
    }),
  });

  const result = await response.json();
  console.log('TriggerX Job Creation Result:', result);

  /*
  Expected response format:
  {
    success: true,
    data: {
      planId: 'plan-id-from-backend',
      jobId: 'triggerx-job-1234567890-abcdef12',
      ipfsLink: 'https://gateway.pinata.cloud/ipfs/Qm...',
      scriptIpfsUrl: 'https://gateway.pinata.cloud/ipfs/Qm...',
      metadataIpfsUrl: 'https://gateway.pinata.cloud/ipfs/Qm...',
      triggerXData: { ... } // TriggerX SDK response data
    },
    message: 'TriggerX job with dynamic script created successfully'
  }
  */

  return result;
}

/**
 * Frontend integration example
 *
 * Shows how to integrate with the new workflow from the frontend
 */
export async function frontendIntegrationExample() {
  // Example of how to call from frontend after DCA plan creation

  // 1. First create DCA plan via chat or direct API call
  const planCreationResponse = await fetch('/api/dca-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Create a DCA plan to buy 100 USDC worth of ETH every day for 4 weeks',
      userAddress: '0x1234567890123456789012345678901234567890',
      isPlanCreationRequest: true,
    }),
  });

  const planResult = await planCreationResponse.json();

  if (!planResult.success) {
    throw new Error('Failed to create DCA plan');
  }

  const planId = planResult.data.id;

  // 2. Then create TriggerX job with the plan details
  const jobResponse = await fetch('/api/create-triggerx-job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planId,
      userAddress: '0x1234567890123456789012345678901234567890',
      fromToken: 'USDC',
      toToken: 'ETH',
      amount: '100',
      intervalMinutes: 1440,
      durationWeeks: 4,
      slippage: '2.0',
      createdAt: new Date().toISOString(),
    }),
  });

  const jobResult = await jobResponse.json();

  if (jobResult.success) {
    console.log('🎉 DCA plan with TriggerX automation created successfully!');
    console.log('Job ID:', jobResult.data.jobId);
    console.log('Script IPFS:', jobResult.data.scriptIpfsUrl);
  }

  return jobResult;
}
