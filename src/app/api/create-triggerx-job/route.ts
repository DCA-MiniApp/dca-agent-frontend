import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createTriggerXJobForPlan, type CreateTriggerXJobParams } from '../../../lib/triggerXIntegration';

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
});

type CreateTriggerXJobRequest = z.infer<typeof CreateTriggerXJobSchema>;

// Configuration
const DCA_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

/**
 * API endpoint for TriggerX job creation
 * 
 * NOTE: This API is deprecated in favor of frontend-only job creation
 * using the triggerXService.ts which has direct access to wallet signers.
 * 
 * Use the useTriggerXJobCreation hook instead of this API.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const validatedData = CreateTriggerXJobSchema.parse(body);

    console.log('🚨 [Deprecated] TriggerX Job API called - use frontend service instead');

    // API routes cannot access wallet signers directly
    // TriggerX job creation should be done on the frontend using triggerXService.ts
    return NextResponse.json(
      {
        success: false,
        error: 'API Deprecated',
        message: 'TriggerX job creation has moved to frontend. Use useTriggerXJobCreation hook instead.',
        recommendation: {
          service: 'triggerXService.ts',
          hook: 'useTriggerXJobCreation',
          reason: 'API routes cannot access wallet signers. Frontend has direct wallet access.',
        },
      },
      { status: 410 } // Gone - resource is no longer available
    );

    // This code is no longer executed - API is deprecated

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

// Removed simulateTriggerXJobCreation function - no longer needed

// Removed example functions - no longer needed
