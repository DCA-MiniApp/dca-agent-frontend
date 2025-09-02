import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { gptIntelligence, type DCAPlanData } from '../../../lib/gptIntelligence';
import { planSessionManager } from '../../../lib/planSessionManager';

// Request/Response schemas
const ChatRequestSchema = z.object({
  message: z.string(),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address').optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string().optional(),
  })).optional().default([]),
  // Confirmation flow fields
  confirmationId: z.string().optional(),
  action: z.enum(['confirm', 'cancel']).optional(),
  // Frontend context flags
  isPlanCreationRequest: z.boolean().optional(),
}).refine((data) => {
  // If it's a confirmation action, message can be empty
  if (data.confirmationId && data.action) {
    return true;
  }
  // Otherwise, message must not be empty
  return data.message.trim().length > 0;
}, {
  message: 'Message cannot be empty',
  path: ['message']
});

type ChatRequest = z.infer<typeof ChatRequestSchema>;

interface DCABackendResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

// Configuration for DCA backend connection
const DCA_BACKEND_URL = process.env.DCA_BACKEND_URL || 'http://localhost:3001';
const DCA_API_URL = process.env.DCA_API_URL || 'http://localhost:3002';

/**
 * Chat API endpoint that interfaces with the DCA VibeKit Agent
 * 
 * This endpoint serves as a bridge between the front-end chat interface
 * and the DCA VibeKit backend, providing context-aware responses for
 * DCA investment operations.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const body = await request.json();
    const { message, userAddress, conversationHistory, confirmationId, action, isPlanCreationRequest } = ChatRequestSchema.parse(body);

    console.log('[DCA Chat API] Received:', { message, userAddress, confirmationId, action, isPlanCreationRequest });

    // Handle confirmation actions first
    if (confirmationId && action) {
      const confirmationResponse = await handleConfirmationAction(confirmationId, action, userAddress);
      return NextResponse.json(confirmationResponse);
    }

    // Check if this is a general conversation (not DCA related)
    if (isGeneralConversation(message)) {
      const conversationalResponse = handleGeneralConversation(message, userAddress);
      return NextResponse.json({
        success: true,
        response: conversationalResponse,
        action: 'general_conversation',
      });
    }

    // Get or create session for intelligent plan creation
    const session = planSessionManager.getOrCreateSession(userAddress);
    
    // Check if this is plan creation intent or continuing plan creation
    const isPlanCreation = planSessionManager.isPlanCreationIntent(message, session.id) || isPlanCreationRequest;
    
    if (isPlanCreation) {
      console.log('[Intelligent Plan Creation] Processing plan creation request');
      
      // Add user message to conversation history
      planSessionManager.addToConversationHistory(session.id, 'user', message);
      
      // Use GPT intelligence to extract plan data
      const extractionResult = await gptIntelligence.extractPlanData(
        message,
        planSessionManager.getConversationContext(session.id),
        session.planData
      );
      
      // Update session with extracted data
      planSessionManager.updateSessionPlanData(session.id, extractionResult.planData);
      
      // Check if plan is complete
      if (extractionResult.isComplete) {
        console.log('[Plan Creation] Plan data complete, showing confirmation');
        
        const completePlanData = extractionResult.planData as DCAPlanData;
        const confirmationId = generateConfirmationId(completePlanData);
        const confirmationMessage = gptIntelligence.generatePlanSummary(completePlanData);
        
        // Add assistant response to conversation
        planSessionManager.addToConversationHistory(session.id, 'assistant', confirmationMessage);
        
        return NextResponse.json({
          success: true,
          response: confirmationMessage,
          action: 'plan_confirmation_required',
          data: {
            confirmationId,
            planData: completePlanData
          }
        });
      } else {
        // Plan is incomplete, ask for missing information
        let responseMessage = '';
        
        if (extractionResult.validationErrors && extractionResult.validationErrors.length > 0) {
          responseMessage += `❌ **Issues found:**\n${extractionResult.validationErrors.map(err => `• ${err}`).join('\n')}\n\n`;
        }
        
        if (Object.keys(extractionResult.planData).length > 0) {
          responseMessage += `✅ **Information collected so far:**\n`;
          if (extractionResult.planData.fromToken) responseMessage += `• From token: ${extractionResult.planData.fromToken}\n`;
          if (extractionResult.planData.toToken) responseMessage += `• To token: ${extractionResult.planData.toToken}\n`;
          if (extractionResult.planData.amount) responseMessage += `• Amount: ${extractionResult.planData.amount}\n`;
          if (extractionResult.planData.interval) responseMessage += `• Frequency: ${extractionResult.planData.interval}\n`;
          if (extractionResult.planData.duration) responseMessage += `• Duration: ${extractionResult.planData.duration}\n`;
          responseMessage += '\n';
        }
        
        responseMessage += `❓ **${extractionResult.nextQuestion}**`;
        
        // Add assistant response to conversation
        planSessionManager.addToConversationHistory(session.id, 'assistant', responseMessage);
        
        return NextResponse.json({
          success: true,
          response: responseMessage,
          action: 'collect_plan_data',
          data: {
            planData: extractionResult.planData,
            missingFields: extractionResult.missingFields
          }
        });
      }
    }

    // For non-plan creation messages, send to VibeKit agent
    console.log('[DCA Operation] Sending to VibeKit agent:', message);
    const vibekitResponse = await sendToVibeKitAgent(message, userAddress, conversationHistory);
    
    return NextResponse.json({
      success: true,
      response: vibekitResponse.response,
      action: vibekitResponse.action,
      data: vibekitResponse.data,
    });

  } catch (error) {
    console.error('[DCA Chat API] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle confirmation actions (confirm/cancel)
 */
async function handleConfirmationAction(
  confirmationId: string, 
  action: 'confirm' | 'cancel', 
  userAddress?: string
): Promise<{
  success: boolean;
  response: string;
  action?: string;
  data?: any;
}> {
  console.log('[Confirmation] Handling action:', { confirmationId, action, userAddress });
  
  if (action === 'cancel') {
    // Clear the session for this user
    if (userAddress) {
      planSessionManager.clearSession(userAddress);
    }
    
    return {
      success: true,
      response: "✅ **Plan creation cancelled.** No DCA plan was created. Is there anything else I can help you with?",
      action: 'action_cancelled'
    };
  }

  if (action === 'confirm') {
    try {
      if (!userAddress) {
        return {
          success: false,
          response: "❌ **Wallet not connected.** Please connect your wallet to create DCA plans.",
          action: 'wallet_required'
        };
      }

      // Parse the confirmation ID to extract plan details
      // Format: "create-plan-{timestamp}-{base64encodedData}"
      const [, , , encodedData] = confirmationId.split('-');
      const planData = JSON.parse(Buffer.from(encodedData, 'base64').toString());
      
      console.log('[Confirmation] Creating confirmed plan:', planData);
      
      // Clear the session since plan creation is confirmed
      planSessionManager.clearSession(userAddress);
      
      // Create instruction for VibeKit agent
      const createInstruction = `Create DCA plan: Invest ${planData.amount} ${planData.fromToken} into ${planData.toToken} every ${planData.interval} for ${planData.duration} with ${planData.slippage || 2}% slippage`;
      const vibekitResponse = await sendToVibeKitAgent(createInstruction, userAddress);
      
      return {
        success: true,
        response: vibekitResponse.response, // Show the actual SSE response directly
        action: 'plan_confirmed',
        data: { planData, agentResponse: vibekitResponse.data }
      };
    } catch (error) {
      console.error('[Confirmation] Error creating plan:', error);
      return {
        success: false,
        response: '❌ **Failed to create DCA plan.** Please try again or contact support.',
        action: 'confirmation_error',
        data: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  return {
    success: false,
    response: '❌ **Invalid action.** Please try again.',
    action: 'invalid_action'
  };
}

/**
 * Check if user has approved sufficient token spending
 */
async function checkTokenApproval(
  token: string, 
  amount: string, 
  userAddress: string
): Promise<{
  approved: boolean;
  currentAllowance?: string;
  requiredAmount: string;
}> {
  try {
    // For now, simulate approval check (in real implementation, query blockchain)
    console.log('[Token Approval] Checking approval for:', { token, amount, userAddress });
    
    // TODO: Implement actual token approval checking
    // This would involve:
    // 1. Get the DCA contract address
    // 2. Call token.allowance(userAddress, dcaContractAddress)
    // 3. Compare with required amount
    
    // For demo purposes, assume approval is needed
    return {
      approved: false,
      currentAllowance: '0',
      requiredAmount: amount
    };
  } catch (error) {
    console.error('[Token Approval] Error checking approval:', error);
    return {
      approved: false,
      currentAllowance: '0',
      requiredAmount: amount
    };
  }
}

/**
 * Handle direct DCA operations based on message content analysis
 */
async function handleDCAOperation(message: string, userAddress?: string): Promise<{
  success: boolean;
  message?: string;
  action?: string;
  data?: any;
}> {
  const lowerMessage = message.toLowerCase();
  console.log('[DCA Operation] Analyzing message:', message);

  try {
    // Check user's DCA plans
    if (lowerMessage.includes('show') && (lowerMessage.includes('plans') || lowerMessage.includes('strategies'))) {
      if (!userAddress) {
        return {
          success: true,
          message: "I'd be happy to show your DCA plans! However, I need your wallet address to fetch your specific plans. Please connect your wallet first.",
          action: 'request_wallet_connection'
        };
      }

      const plansResponse = await fetch(`${DCA_API_URL}/api/dca/plans/${userAddress}`);
      const plansData: DCABackendResponse = await plansResponse.json();

      if (plansData.success && plansData.data) {
        const plans = plansData.data;
        if (plans.length === 0) {
          return {
            success: true,
            message: "You don't have any DCA plans yet. Would you like me to help you create your first investment strategy?",
            action: 'suggest_create_plan'
          };
        }

        const plansText = plans.map((plan: any, index: number) => 
          `${index + 1}. **${plan.fromToken} → ${plan.toToken}**\n` +
          `   Amount: ${plan.amount} ${plan.fromToken}\n` +
          `   Interval: Every ${plan.intervalMinutes} minutes\n` +
          `   Status: ${plan.status}\n` +
          `   Progress: ${plan.executionCount}/${plan.totalExecutions} executions\n` +
          `   Next: ${plan.nextExecution ? new Date(plan.nextExecution).toLocaleString() : 'Completed'}`
        ).join('\n\n');

        return {
          success: true,
          message: `Here are your current DCA plans:\n\n${plansText}\n\nWould you like to modify any of these plans or create a new one?`,
          action: 'show_plans',
          data: plans
        };
      }
    }

    // Get platform statistics
    if (lowerMessage.includes('stats') || lowerMessage.includes('statistics') || lowerMessage.includes('platform')) {
      const statsResponse = await fetch(`${DCA_API_URL}/api/dca/stats`);
      const statsData: DCABackendResponse = await statsResponse.json();

      if (statsData.success && statsData.data) {
        const stats = statsData.data;
        const message = `📊 **Platform Statistics**\n\n` +
          `💰 Total Plans: ${stats.totalPlans}\n` +
          `🔥 Active Plans: ${stats.activePlans}\n` +
          `👥 Total Users: ${stats.totalUsers}\n` +
          `⚡ Total Executions: ${stats.totalExecutions}\n` +
          `📈 Last 24h: ${stats.last24hExecutions} executions\n` +
          `📅 Last 7 days: ${stats.last7dExecutions} executions\n\n` +
          `The platform is actively helping users with their DCA strategies!`;

        return {
          success: true,
          message,
          action: 'show_stats',
          data: stats
        };
      }
    }

    // Check if asking for help
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return {
        success: true,
        message: `🤖 **I'm your DCA Investment Assistant!** Here's what I can help you with:\n\n` +
          `📈 **Create DCA Plans**: Set up automated investment strategies\n` +
          `💼 **Manage Plans**: View, pause, resume, or cancel your strategies\n` +
          `📊 **Track Performance**: Monitor your investment progress\n` +
          `🎯 **Smart Recommendations**: Get personalized investment advice\n` +
          `⚙️ **Platform Stats**: View overall platform performance\n\n` +
          `**Quick Commands:**\n` +
          `• "Show my plans" - View your DCA strategies\n` +
          `• "Create plan" - Set up new investment strategy\n` +
          `• "Platform stats" - See platform statistics\n` +
          `• "Pause plan [ID]" - Pause a specific plan\n\n` +
          `Just ask me anything in natural language!`,
        action: 'show_help'
      };
    }

    // If no specific operation matched, return false to let VibeKit handle it
    return { success: false };

  } catch (error) {
    console.error('[DCA Operation] Error:', error);
    return { success: false };
  }
}

/**
 * Send message to DCA VibeKit Agent for natural language processing
 */
async function sendToVibeKitAgent(
  message: string, 
  userAddress?: string, 
  conversationHistory: any[] = []
): Promise<{
  response: string;
  action?: string;
  data?: any;
}> {
  try {
    console.log('[VibeKit Agent] Sending instruction:', message);
    console.log('[VibeKit Agent] User address:', userAddress);
    
    // Generate unique request ID to avoid conflicts
    const requestId = Date.now() + Math.floor(Math.random() * 1000);
    console.log('[VibeKit Agent] Using request ID:', requestId);

    // Step 1: First establish SSE connection to get session ID
    console.log('[SSE] Opening SSE connection to get session ID...');
    const { sessionId, reader, response: sseResponse } = await establishSSEConnection();
    console.log('[SSE] Session established:', sessionId);

    // Step 2: Send request with session ID
    const requestBody = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name: 'dca-swapping',
        arguments: {
          instruction: message,
          userAddress: userAddress
        }
      }
    };
    
    console.log('[VibeKit Agent] Request body:', JSON.stringify(requestBody, null, 2));
    
    // Send to DCA skill via MCP tool call format using the session ID
    const response = await fetch(`${DCA_BACKEND_URL}/messages?sessionId=${sessionId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      reader.cancel().catch(() => {});
      const errorText = await response.text();
      throw new Error(`VibeKit agent responded with ${response.status}: ${errorText}`);
    }

    const initialResponse = await response.text();
    console.log('[VibeKit Agent] Initial response:', initialResponse);
    
    // The /messages endpoint returns "Accepted" and the real response comes via SSE
    if (initialResponse === 'Accepted' || initialResponse.includes('Accepted')) {
      console.log('[VibeKit Agent] Request accepted, waiting for SSE response...');
      
      // Step 3: Wait for the actual response via the established SSE connection
      try {
        const sseResponse = await waitForSSEResponseWithReader(requestId, reader, sessionId);
        
        // Parse the SSE response format
        let responseText = 'I understand your request, but I encountered an issue processing it. Could you please try again?';
        
        if (sseResponse.error) {
          responseText = `Error: ${sseResponse.error.message || 'Unknown MCP error'}`;
        } else if (sseResponse.result && sseResponse.result.content) {
          // Look for resource content with task result
          console.log('[Response Parser] SSE result content:', sseResponse.result.content);
          const resourceContent = sseResponse.result.content.find((item: any) => item.type === 'resource');
          if (resourceContent && resourceContent.resource && resourceContent.resource.text) {
            try {
              const taskData = JSON.parse(resourceContent.resource.text);
              console.log('[Response Parser] Parsed task data:', taskData);
              
              // Handle different response structures
              let textPart = null;
              
              if (taskData.parts && Array.isArray(taskData.parts)) {
                // Direct parts array (current structure)
                textPart = taskData.parts.find((part: any) => part.kind === 'text');
              } else if (taskData.status && taskData.status.message && taskData.status.message.parts) {
                // Legacy structure
                textPart = taskData.status.message.parts.find((part: any) => part.kind === 'text');
              }
              
              console.log('[Response Parser] Found text part:', textPart);
              if (textPart && textPart.text) {
                responseText = textPart.text;
              }
            } catch (parseError) {
              console.warn('[Response Parser] Failed to parse resource text:', parseError);
            }
          }
        }
        
        console.log('[VibeKit Agent] Extracted response text:', responseText);
        
        // For regular messages, show the actual VibeKit response
        // Plan creation confirmations are handled at the frontend level now
        
        // Analyze response to determine if any action was taken  
        const action = analyzeResponseForActions(responseText);

        return {
          response: responseText,
          action: action?.type,
          data: action?.data
        };
      } catch (sseError) {
        console.error('[VibeKit Agent] SSE Error:', sseError);
        return {
          response: `⚠️ Your request was accepted but we encountered an issue getting the response. Please try again or check the agent logs.`,
          action: 'sse_error',
          data: { requestId, sessionId, error: sseError instanceof Error ? sseError.message : String(sseError) }
        };
      }
    }
    
    // Handle case where we got a direct response (shouldn't happen but just in case)
    reader.cancel().catch(() => {});
    return {
      response: initialResponse,
      action: undefined,
      data: undefined
    };

  } catch (error) {
    console.error('[VibeKit Agent] Error:', error);
    
    // Fallback to intelligent response based on message content
    return generateFallbackResponse(message, userAddress);
  }
}

/**
 * Establish SSE connection and extract session ID
 */
async function establishSSEConnection(): Promise<{
  sessionId: string;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  response: Response;
}> {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('SSE connection timeout after 10 seconds'));
    }, 10000);

    try {
      console.log('[SSE] Opening SSE connection...');
      const response = await fetch(`${DCA_BACKEND_URL}/sse`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        clearTimeout(timeout);
        reject(new Error(`SSE connection failed: ${response.status}`));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        clearTimeout(timeout);
        reject(new Error('Failed to get SSE stream reader'));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let sessionId: string | null = null;

      try {
        while (!sessionId) {
          const { done, value } = await reader.read();
          if (done) {
            clearTimeout(timeout);
            reject(new Error('SSE stream ended before getting session ID'));
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            // Handle session ID from endpoint data
            if (line.startsWith('data: /messages?sessionId=')) {
              sessionId = line.split('sessionId=')[1].trim();
              console.log('[SSE] Session established:', sessionId);
              clearTimeout(timeout);
              resolve({ sessionId, reader, response });
              return;
            }
          }
        }
      } catch (error) {
        clearTimeout(timeout);
        reader.cancel().catch(() => {});
        reject(error);
      }
    } catch (error) {
      clearTimeout(timeout);
      console.error('[SSE] Connection error:', error);
      reject(error);
    }
  });
}

/**
 * Wait for SSE response using existing reader and session
 */
async function waitForSSEResponseWithReader(
  requestId: number, 
  reader: ReadableStreamDefaultReader<Uint8Array>,
  sessionId: string
): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('SSE response timeout after 60 seconds'));
    }, 60000); // Increased timeout to 60 seconds

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          clearTimeout(timeout);
          reject(new Error('SSE stream ended without finding response'));
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          // Handle message data (actual responses)
          if (line.startsWith('data: ') && !line.includes('keepalive') && !line.includes('sessionId')) {
            try {
              const eventData = line.slice(6).trim(); // Remove 'data: ' prefix
              if (eventData) {
                const data = JSON.parse(eventData);
                console.log('[SSE] Received message data:', {
                  responseId: data.id,
                  expectedId: requestId,
                  sessionId: sessionId,
                  hasResult: !!data.result,
                  hasError: !!data.error
                });
                
                // Check if this is the response to our request
                if (data.id === requestId) {
                  console.log('[SSE] Found matching response for request ID:', requestId);
                  clearTimeout(timeout);
                  reader.cancel();
                  resolve(data);
                  return;
                }
              }
            } catch (parseError) {
              console.warn('[SSE] Failed to parse message data:', line);
            }
          }
        }
      }
    } catch (error) {
      clearTimeout(timeout);
      console.error('[SSE] Reader error:', error);
      reject(error);
    } finally {
      reader.cancel().catch(() => {/* ignore cleanup errors */});
    }
  });
}


/**
 * Analyze agent response to determine what actions were taken
 */
function analyzeResponseForActions(responseText: string): { type: string; data?: any } | null {
  const lowerResponse = responseText.toLowerCase();
  
  if (lowerResponse.includes('plan created') || lowerResponse.includes('dca plan')) {
    return { type: 'plan_created' };
  }
  
  if (lowerResponse.includes('plan paused') || lowerResponse.includes('paused')) {
    return { type: 'plan_paused' };
  }
  
  if (lowerResponse.includes('plan resumed') || lowerResponse.includes('activated')) {
    return { type: 'plan_resumed' };
  }
  
  if (lowerResponse.includes('execution') || lowerResponse.includes('swap')) {
    return { type: 'execution_triggered' };
  }
  
  return null;
}

/**
 * Analyze if the user's message suggests creating a DCA plan
 */
function analyzePlanCreationIntent(userMessage: string, agentResponse: string, isPlanCreationRequest?: boolean): {
  shouldConfirm: boolean;
  planData?: any;
} {
  const lowerUserMessage = userMessage.toLowerCase();
  
  // Check if user wants to create a plan
  const creationKeywords = ['create', 'make', 'set up', 'start', 'begin', 'invest'];
  const planKeywords = ['plan', 'strategy', 'dca', 'investment'];
  
  const hasCreationIntent = creationKeywords.some(keyword => lowerUserMessage.includes(keyword)) &&
                           planKeywords.some(keyword => lowerUserMessage.includes(keyword));
  
  // If frontend flagged this as a plan creation request, be more lenient
  const shouldAnalyze = hasCreationIntent || isPlanCreationRequest;
  
  if (shouldAnalyze) {
    // Try to extract plan parameters from the user message
    const planData = extractPlanParameters(userMessage);
    console.log('[Plan Analysis] Extracted plan data:', planData);
    
    // Check if we have the minimum required data for a plan
    const hasRequiredData = planData.fromToken && planData.toToken && planData.amount;
    console.log('[Plan Analysis] Has required data:', hasRequiredData, {
      fromToken: planData.fromToken,
      toToken: planData.toToken,
      amount: planData.amount
    });
    
    if (hasRequiredData) {
      return {
        shouldConfirm: true,
        planData
      };
    } else if (isPlanCreationRequest) {
      // If frontend explicitly flagged this as plan creation but we don't have complete data,
      // still show confirmation with what we have and let user provide more details
      console.log('[Plan Analysis] Frontend flagged as plan creation but incomplete data, showing confirmation anyway');
      return {
        shouldConfirm: true,
        planData: {
          ...planData,
          // Set defaults for missing fields
          fromToken: planData.fromToken || 'USDC',
          toToken: planData.toToken || 'ETH',
          amount: planData.amount || '100',
          intervalMinutes: planData.intervalMinutes || 10080, // weekly
          durationWeeks: planData.durationWeeks || 4, // 1 month
          slippage: planData.slippage || 200 // 2%
        }
      };
    } else {
      console.log('[Plan Analysis] Missing required data, will let VibeKit handle incomplete request');
    }
  }

  return { shouldConfirm: false };
}

/**
 * Extract plan parameters from user message
 */
function extractPlanParameters(message: string): any {
  // Common token mappings
  const tokenMap: { [key: string]: string } = {
    'usdc': 'USDC', 'usdt': 'USDT', 'dai': 'DAI',
    'eth': 'ETH', 'ethereum': 'ETH', 'weth': 'WETH',
    'btc': 'BTC', 'bitcoin': 'BTC', 'wbtc': 'WBTC',
    'arb': 'ARB', 'arbitrum': 'ARB'
  };
  
  const planData: any = {
    slippage: '200' // Default: 2%
  };

  const lowerMessage = message.toLowerCase();
  console.log('[Parameter Extraction] Processing message:', message);

  // Extract amount and tokens - multiple patterns
  let amountMatch = message.match(/(\d+(?:\.\d+)?)\s*(usdc|usdt|dai|eth|btc|arb|weth|wbtc)/i);
  if (!amountMatch) {
    // Try alternative patterns
    amountMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:usdc|usdt|dai|eth|btc|arb|weth|wbtc)/i);
  }
  if (!amountMatch) {
    // Try $ amount pattern
    amountMatch = message.match(/\$(\d+(?:\.\d+)?)/i);
    if (amountMatch) {
      planData.amount = amountMatch[1];
      planData.fromToken = 'USDC'; // Assume USDC for $ amounts
    }
  } else {
    planData.amount = amountMatch[1];
    planData.fromToken = tokenMap[amountMatch[2].toLowerCase()] || amountMatch[2].toUpperCase();
  }

  // Extract target token - multiple patterns
  let intoMatch = message.match(/(?:into|to|buy|invest\s+in)\s*(usdc|usdt|dai|eth|btc|arb|weth|wbtc)/i);
  if (!intoMatch) {
    // Try pattern like "USDC into ETH"
    intoMatch = message.match(/(?:usdc|usdt|dai|eth|btc|arb|weth|wbtc)\s+(?:into|to)\s*(usdc|usdt|dai|eth|btc|arb|weth|wbtc)/i);
  }
  if (!intoMatch) {
    // Try pattern like "invest in ETH"
    intoMatch = message.match(/invest\s+(?:in\s+)?(usdc|usdt|dai|eth|btc|arb|weth|wbtc)/i);
  }
  
  if (intoMatch) {
    planData.toToken = tokenMap[intoMatch[1].toLowerCase()] || intoMatch[1].toUpperCase();
  }

  // Extract frequency
  if (lowerMessage.includes('daily') || lowerMessage.includes('day')) {
    planData.intervalMinutes = 1440; // 24 hours
  } else if (lowerMessage.includes('weekly') || lowerMessage.includes('week')) {
    planData.intervalMinutes = 10080; // 7 days
  } else if (lowerMessage.includes('monthly') || lowerMessage.includes('month')) {
    planData.intervalMinutes = 43200; // 30 days
  } else if (lowerMessage.includes('hourly') || lowerMessage.includes('hour')) {
    planData.intervalMinutes = 60; // 1 hour
  }

  // Extract duration
  let durationMatch = message.match(/(?:for|over)\s*(\d+)\s*(week|month|day)/i);
  if (!durationMatch) {
    // Try alternative patterns
    durationMatch = message.match(/(\d+)\s*(week|month|day)/i);
  }
  
  if (durationMatch) {
    const duration = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    if (unit.startsWith('week')) {
      planData.durationWeeks = duration;
    } else if (unit.startsWith('month')) {
      planData.durationWeeks = duration * 4;
    } else if (unit.startsWith('day')) {
      planData.durationWeeks = Math.ceil(duration / 7);
    }
  }

  console.log('[Parameter Extraction] Extracted plan data:', planData);
  return planData;
}

/**
 * Generate confirmation ID for tracking
 */
function generateConfirmationId(planData: any): string {
  const timestamp = Date.now();
  const encodedData = Buffer.from(JSON.stringify(planData)).toString('base64');
  return `create-plan-${timestamp}-${encodedData}`;
}

/**
 * Generate confirmation message with plan summary
 */
function generateConfirmationMessage(planData: any): string {
  const frequencyText = planData.intervalMinutes === 1440 ? 'daily' :
                       planData.intervalMinutes === 10080 ? 'weekly' :
                       planData.intervalMinutes === 43200 ? 'monthly' :
                       `every ${planData.intervalMinutes} minutes`;
  
  const durationText = planData.durationWeeks === 4 ? '1 month' :
                      planData.durationWeeks === 52 ? '1 year' :
                      `${planData.durationWeeks} weeks`;
  
  const totalExecutions = Math.floor((planData.durationWeeks * 7 * 24 * 60) / planData.intervalMinutes);
  const totalInvestment = (parseFloat(planData.amount) * totalExecutions).toFixed(2);

  return `🔐 **Token Approval Required**\n\n` +
         `📊 **Plan Summary:**\n` +
         `• **Investment:** ${planData.amount} ${planData.fromToken}\n` +
         `• **Target:** ${planData.toToken}\n` +
         `• **Duration:** ${durationText}\n` +
         `• **frequency:** ${frequencyText}\n` +
         `• **Total Investment:** ${totalInvestment} ${planData.fromToken}\n` +
         `• **Total Executions:** ${totalExecutions}\n` +
         `• **Slippage:** ${planData.slippage/100}%\n\n` +
         `⚠️ **Approval Required:** To create this DCA plan, you need to approve spending of ${totalInvestment} ${planData.fromToken} tokens.\n\n` +
         `Ready to proceed with token approval?`;
}

/**
 * Check if message is general conversation (not DCA related)
 */
function isGeneralConversation(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const dcaKeywords = [
    'dca', 'plan', 'invest', 'strategy', 'swap', 'trade', 'buy', 'sell',
    'usdc', 'eth', 'btc', 'arb', 'token', 'crypto', 'portfolio', 'balance'
  ];
  
  const generalGreetings = [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
    'how are you', 'what\'s up', 'thanks', 'thank you', 'bye', 'goodbye'
  ];

  const generalQuestions = [
    'what can you do', 'who are you', 'what are you', 'how does this work',
    'tell me about', 'explain', 'weather', 'time', 'date', 'joke', 'fun fact'
  ];

  // Check if it's a general greeting or question
  const isGreetingOrGeneral = generalGreetings.some(keyword => lowerMessage.includes(keyword)) ||
                             generalQuestions.some(keyword => lowerMessage.includes(keyword));
  
  // Check if it contains DCA-related keywords
  const hasDCAKeywords = dcaKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // It's general conversation if it's a greeting/general question AND doesn't contain DCA keywords
  return isGreetingOrGeneral && !hasDCAKeywords;
}

/**
 * Handle general conversation responses
 */
function handleGeneralConversation(message: string, userAddress?: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Greetings
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return `👋 **Hello there!** I'm your DCA Investment Assistant. I help you create and manage automated cryptocurrency investment strategies.\n\n` +
           `💡 **Try asking me:**\n` +
           `• "Create a DCA plan to invest 100 USDC into ETH weekly"\n` +
           `• "Show my active DCA plans"\n` +
           `• "What are the platform statistics?"\n\n` +
           `${userAddress ? `I can see your wallet is connected (${userAddress.slice(0, 6)}...${userAddress.slice(-4)}), so we're ready to go!` : 'Connect your wallet to start creating DCA strategies!'}`;
  }

  // Good morning/afternoon/evening
  if (lowerMessage.includes('good morning') || lowerMessage.includes('good afternoon') || lowerMessage.includes('good evening')) {
    const timeGreeting = lowerMessage.includes('morning') ? 'Good morning' : 
                        lowerMessage.includes('afternoon') ? 'Good afternoon' : 'Good evening';
    return `${timeGreeting}! ☀️ Ready to optimize your crypto investments today? I can help you set up automated DCA strategies or check on your existing plans.`;
  }

  // Thanks
  if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
    return `You're very welcome! 😊 I'm here whenever you need help with your DCA investment strategies. Feel free to ask me anything about automated crypto investing!`;
  }

  // What can you do
  if (lowerMessage.includes('what can you do') || lowerMessage.includes('capabilities')) {
    return `🤖 **I'm your DCA Investment Assistant!** Here's what I can help you with:\n\n` +
           `📈 **Create DCA Plans**: Set up automated investment strategies\n` +
           `💼 **Manage Plans**: View, pause, resume, or cancel your strategies\n` +
           `📊 **Track Performance**: Monitor your investment progress\n` +
           `🎯 **Smart Recommendations**: Get personalized investment advice\n` +
           `⚙️ **Platform Stats**: View overall platform performance\n\n` +
           `**Quick Commands:**\n` +
           `• "Show my plans" - View your DCA strategies\n` +
           `• "Create plan" - Set up new investment strategy\n` +
           `• "Platform stats" - See platform statistics\n\n` +
           `Just ask me anything in natural language!`;
  }

  // Who are you / What are you
  if (lowerMessage.includes('who are you') || lowerMessage.includes('what are you')) {
    return `🤖 I'm your **DCA Investment Assistant** - an AI-powered bot specialized in helping you create and manage Dollar Cost Averaging (DCA) strategies for cryptocurrency investments.\n\n` +
           `💡 I can understand natural language and help you:\n` +
           `• Set up automated investment plans\n` +
           `• Monitor your portfolio performance\n` +
           `• Make smart investment decisions\n\n` +
           `Think of me as your personal crypto investment advisor that never sleeps! 🚀`;
  }

  // Generic fallback for other general messages
  return `🤔 I understand you're asking about: "${message}"\n\n` +
         `I'm specialized in helping with DCA (Dollar Cost Averaging) investment strategies. While I love chatting, I'm most helpful when it comes to:\n\n` +
         `💰 **Creating investment plans**\n` +
         `📊 **Tracking your portfolio**\n` +
         `⚙️ **Managing your DCA strategies**\n\n` +
         `Would you like to learn about DCA investing or create your first automated investment plan?`;
}

/**
 * Generate fallback response when VibeKit agent is unavailable
 */
function generateFallbackResponse(message: string, userAddress?: string): {
  response: string;
  action?: string;
  data?: any;
} {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('create') && (lowerMessage.includes('plan') || lowerMessage.includes('strategy'))) {
    return {
      response: `I'd be happy to help you create a DCA plan! To get started, I'll need some information:\n\n` +
        `🎯 **Investment Details:**\n` +
        `• Which token do you want to invest FROM? (e.g., USDC, USDT)\n` +
        `• Which token do you want to invest INTO? (e.g., ETH, BTC, ARB)\n` +
        `• How much do you want to invest each time?\n` +
        `• How often? (daily, weekly, monthly)\n` +
        `• For how long? (duration in weeks/months)\n\n` +
        `Example: "Invest 100 USDC into ETH every week for 6 months"\n\n` +
        `${userAddress ? 'I see your wallet is connected, so we can proceed once you provide the details!' : 'Also, please connect your wallet to create the plan.'}`,
      action: 'request_plan_details'
    };
  }
  
  if (lowerMessage.includes('balance') || lowerMessage.includes('portfolio')) {
    return {
      response: `To check your portfolio balance and performance, I need to connect to your wallet data. ` +
        `${userAddress ? `I can see your address (${userAddress.slice(0, 6)}...${userAddress.slice(-4)}), let me fetch your current DCA plans and their performance.` : 'Please connect your wallet first.'}\n\n` +
        `Would you like me to show your active DCA plans and their current status?`,
      action: userAddress ? 'fetch_portfolio' : 'request_wallet_connection'
    };
  }
  
  return {
    response: `I understand you're asking about: "${message}"\n\n` +
      `I'm here to help with your DCA investment strategies! Here are some things you can ask me:\n\n` +
      `💡 **"Create a DCA plan"** - Set up automated investments\n` +
      `📊 **"Show my plans"** - View your current strategies\n` +
      `💰 **"Check my portfolio"** - See your investment performance\n` +
      `⏸️ **"Pause my plan"** - Temporarily stop investments\n` +
      `📈 **"Platform stats"** - View overall platform metrics\n\n` +
      `What would you like to do?`,
    action: 'show_help'
  };
}
