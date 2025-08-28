import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Request/Response schemas
const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address').optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string().optional(),
  })).optional().default([]),
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
    const { message, userAddress, conversationHistory } = ChatRequestSchema.parse(body);

    console.log('[DCA Chat API] Received message:', { message, userAddress });

    // First, try to determine if this is a specific DCA operation request
    const dcaResponse = await handleDCAOperation(message, userAddress);
    
    if (dcaResponse.success) {
      return NextResponse.json({
        success: true,
        response: dcaResponse.message,
        action: dcaResponse.action,
        data: dcaResponse.data,
      });
    }

    // If not a specific operation, send to VibeKit agent for natural language processing
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
    
    // Use static ID for testing (matches working curl command)
    const requestId = 2;
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
    console.log('[VibeKit Agent] Using request ID:', requestId);
    
    // Send to DCA skill via MCP tool call format using fetch
    const response = await fetch(`${DCA_BACKEND_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`VibeKit agent responded with ${response.status}: ${errorText}`);
    }

    const initialResponse = await response.text();
    console.log('[VibeKit Agent] Initial response:', initialResponse);
    
    // The /messages endpoint returns "Accepted" and the real response comes via SSE
    if (initialResponse === 'Accepted' || initialResponse.includes('Accepted')) {
      console.log('[VibeKit Agent] Request accepted, waiting for SSE response...');
      
      // Wait for the actual response via SSE
      try {
        const sseResponse = await waitForSSEResponse(requestId);
        
        // Parse the SSE response format
        let responseText = 'I understand your request, but I encountered an issue processing it. Could you please try again?';
        
        if (sseResponse.error) {
          responseText = `Error: ${sseResponse.error.message || 'Unknown MCP error'}`;
        } else if (sseResponse.result && sseResponse.result.content) {
          // Look for resource content with task result
          const resourceContent = sseResponse.result.content.find((item: any) => item.type === 'resource');
          if (resourceContent && resourceContent.resource && resourceContent.resource.text) {
            try {
              const taskData = JSON.parse(resourceContent.resource.text);
              if (taskData.status && taskData.status.message && taskData.status.message.parts) {
                const textPart = taskData.status.message.parts.find((part: any) => part.kind === 'text');
                if (textPart && textPart.text) {
                  responseText = textPart.text;
                }
              }
            } catch (parseError) {
              console.warn('[Response Parser] Failed to parse resource text:', parseError);
            }
          }
        }
        
        console.log('[VibeKit Agent] Extracted response text:', responseText);
        
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
          data: { requestId, error: sseError instanceof Error ? sseError.message : String(sseError) }
        };
      }
    }
    
    // Handle case where we got a direct response (shouldn't happen but just in case)
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
 * Wait for SSE response using fetch streaming (Node.js compatible)
 */
async function waitForSSEResponse(requestId: number): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('SSE response timeout after 30 seconds'));
    }, 30000);

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
      let sessionId = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            // Handle endpoint event (session ID)
            if (line.startsWith('event: endpoint')) {
              continue;
            }
            
            // Handle session ID from endpoint data
            if (line.startsWith('data: /messages?sessionId=')) {
              sessionId = line.split('sessionId=')[1];
              console.log('[SSE] Session established:', sessionId);
              continue;
            }

            // Handle message data (actual responses)
            if (line.startsWith('data: ') && !line.includes('keepalive') && !line.includes('sessionId')) {
              try {
                const eventData = line.slice(6).trim(); // Remove 'data: ' prefix
                if (eventData) {
                  const data = JSON.parse(eventData);
                  console.log('[SSE] Received message data:', {
                    responseId: data.id,
                    expectedId: requestId,
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

        clearTimeout(timeout);
        reject(new Error('SSE stream ended without finding response'));
      } finally {
        reader.cancel().catch(() => {/* ignore cleanup errors */});
      }
    } catch (error) {
      clearTimeout(timeout);
      console.error('[SSE] Connection error:', error);
      reject(error);
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
