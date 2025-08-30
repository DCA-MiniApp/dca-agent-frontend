"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMiniApp } from "@neynar/react";
import { ShareButton } from "../Share";

import { type Haptics } from "@farcaster/miniapp-sdk";
import { APP_URL } from "~/lib/constants";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { maxUint256, parseUnits } from "viem";
import { arbitrum } from "wagmi/chains";
import { truncateAddress } from "../../../lib/truncateAddress";
import { ARBITRUM_TOKENS, ERC20_ABI, getTokenInfo, EXECUATOR_ADDRESS } from "../../../lib/tokenContracts";
import { useRouter } from 'next/navigation';
import { IoPersonCircle } from 'react-icons/io5';
// import { TbRobot } from "react-icons/tb";
import { RiRobot2Fill } from "react-icons/ri";
/**
 * ActionsTab component handles mini app actions like sharing, notifications, and haptic feedback.
 *
 * NEW: Now includes a ChatGPT-style chat interface for DCA agent interactions.
 *
 * This component provides the main interaction interface for users to:
 * - Chat with the DCA agent using natural language
 * - Share the mini app with others
 * - Sign in with Farcaster
 * - Send notifications to their account
 * - Trigger haptic feedback
 * - Add the mini app to their client
 * - Copy share URLs
 *
 * The component uses the useMiniApp hook to access Farcaster context and actions.
 * All state is managed locally within this component.
 *
 * @example
 * ```tsx
 * <ActionsTab />
 * ```
 */

// Chat message interface
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  // Confirmation flow fields
  requiresConfirmation?: boolean;
  confirmationId?: string;
  confirmationData?: any;
  // Transaction hash for copy functionality
  transactionHash?: string;
  // Loading state for plan creation
  isCreatingPlan?: boolean;
}

// Helper to format addresses nicely (e.g., 0x1234...ABCD)
function formatAddress(
  address: string,
  prefixLength = 6,
  suffixLength = 4
): string {
  if (!address) return "";
  if (address.length <= prefixLength + suffixLength) return address;
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

export function ActionsTab() {
  // --- Hooks ---
  const {notificationDetails, haptics, context } =
    useMiniApp();

  const { address, isConnected } = useAccount();
  const router = useRouter();
  
  // --- State ---
  const [notificationState, setNotificationState] = useState({
    sendStatus: "",
    shareUrlCopied: false,
  });
  const [selectedHapticIntensity, setSelectedHapticIntensity] =
    useState<Haptics.ImpactOccurredType>("medium");

  // --- Chat State ---
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hello! I'm your DCA (Dollar Cost Averaging) investment assistant powered by AI. I can help you:\n\n🎯 Create automated investment strategies\n📊 Analyze your portfolio performance\n⚙️ Manage your DCA plans\n${
        isConnected
          ? `I see your wallet is connected (${formatAddress(
              address || ""
            )}) - we're ready to get started!`
          : "Please connect your wallet to access all features."
      }\n\nWhat would you like to do today?\n
      For example you can say "Create a DCA plan with 0.1 USDC into WETH every week for 1 months"`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "error" | null
  >(null);

  // --- Layout/Refs for better UX ---
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const inputContainerRef = useRef<HTMLDivElement | null>(null);
  const [inputContainerHeight, setInputContainerHeight] = useState<number>(72);

  // Token approval state
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'approving' | 'approved' | 'error'>('idle');
  const [pendingConfirmationId, setPendingConfirmationId] = useState<string | null>(null);
  const [confirmationStep, setConfirmationStep] = useState<'summary' | 'approval' | 'completed'>('summary');
  const [currentPlanData, setCurrentPlanData] = useState<any>(null);
  const [isInPlanCreationFlow, setIsInPlanCreationFlow] = useState(false);

  // Contract interactions for token approval
  const { writeContract, data: approvalTxHash, error: approvalError, isPending: isApprovePending } = useWriteContract();
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalConfirmed } = useWaitForTransactionReceipt({
    hash: approvalTxHash,
  });

  // Balance checking for current plan - COMMENTED OUT
  // const [currentTokenBalance, setCurrentTokenBalance] = useState<bigint | null>(null);
  
  // Get token info for current plan
  // const currentTokenInfo = currentPlanData?.fromToken ? getTokenInfo(currentPlanData.fromToken) : null;
  
  // const { data: tokenBalance, isLoading: isBalanceLoading } = useReadContract({
  //   address: currentTokenInfo?.address as `0x${string}` | undefined,
  //   abi: ERC20_ABI,
  //   functionName: 'balanceOf',
  //   args: address ? [address] : undefined,
  //   query: {
  //     enabled: !!currentTokenInfo?.address && !!address,
  //   },
  // });

  // Respect miniapp safe area insets
  const safeTop = context?.client?.safeAreaInsets?.top ?? 0;
  const safeBottom = context?.client?.safeAreaInsets?.bottom ?? 0;

  // --- Utility Functions ---
  
  // Check if user has sufficient balance for the plan - COMMENTED OUT
  // const checkSufficientBalance = useCallback((planData: any): { sufficient: boolean; required: bigint; available: bigint; message: string } => {
  //   console.log("[Balance] Checking sufficiency for plan:", planData);
  //   console.log("[Balance] Current state:", {
  //     address: address?.slice(0, 10) + '...',
  //     isBalanceLoading,
  //     tokenBalance: tokenBalance?.toString(),
  //     currentTokenInfo,
  //     currentPlanData: currentPlanData?.fromToken
  //   });
    
  //   if (!planData) {
  //     return { sufficient: false, required: 0n, available: 0n, message: "No plan data provided" };
  //   }
    
  //   if (!address) {
  //     return { sufficient: false, required: 0n, available: 0n, message: "Wallet not connected" };
  //   }
    
  //   if (isBalanceLoading) {
  //     return { sufficient: false, required: 0n, available: 0n, message: "Checking balance..." };
  //   }
    
  //   if (tokenBalance === undefined || tokenBalance === null) {
  //     console.log("[Balance] Token balance is undefined or null", tokenBalance);
  //     console.log("[Balance] Token info for", planData.fromToken, ":", getTokenInfo(planData.fromToken));
  //     return { sufficient: false, required: 0n, available: 0n, message: "Unable to fetch balance" };
  //   }

  //   const tokenInfo = getTokenInfo(planData.fromToken);
  //   if (!tokenInfo) {
  //     return { sufficient: false, required: 0n, available: 0n, message: "Unsupported token" };
  //   }

  //   const totalExecutions = Math.floor((planData.durationWeeks * 7 * 24 * 60) / planData.intervalMinutes);
  //   console.log("totalExecutions 152:", totalExecutions);
  //   const amountPerExecution = parseUnits(planData.amount, tokenInfo.decimals);
  //   console.log("amountPerExecution 154:", amountPerExecution);
  //   const totalRequired = amountPerExecution * BigInt(totalExecutions);
  //   console.log("totalRequired 156:", totalRequired);
  //   const available = tokenBalance;
  //   console.log("available 158:", available);
  //   const sufficient = available >= totalRequired;
  //   console.log("sufficient 160:", sufficient);
  //   const message = sufficient 
  //     ? `✅ Sufficient balance available`
  //     : `❌ Insufficient balance. Required: ${formatTokenAmount(totalRequired, tokenInfo.decimals)} ${planData.fromToken}, Available: ${formatTokenAmount(available, tokenInfo.decimals)} ${planData.fromToken}`;

  //   return { sufficient, required: totalRequired, available, message };
  // }, [tokenBalance, address, isBalanceLoading, currentTokenInfo, currentPlanData]);

  // Format token amount for display
  const formatTokenAmount = useCallback((amount: bigint, decimals: number): string => {
    const divisor = BigInt(10 ** decimals);
    const quotient = amount / divisor;
    const remainder = amount % divisor;
    
    if (remainder === 0n) {
      return quotient.toString();
    }
    
    const remainderStr = remainder.toString().padStart(decimals, '0');
    const trimmedRemainder = remainderStr.replace(/0+$/, '');
    
    if (trimmedRemainder === '') {
      return quotient.toString();
    }
    
    return `${quotient}.${trimmedRemainder}`;
  }, []);



  // Render markdown text with basic formatting
  const renderMarkdownText = useCallback((text: string): React.ReactNode => {
    if (!text) return null;
    
    // Split by lines to handle line breaks
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      if (line.trim() === '') {
        return <br key={lineIndex} />;
      }
      
      // Handle bold text (**text**)
      const parts = line.split(/(\*\*.*?\*\*)/g);
      
      return (
        <span key={lineIndex}>
          {parts.map((part, partIndex) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              // Bold text
              const boldText = part.slice(2, -2);
              return (
                <strong key={partIndex} className="font-bold">
                  {boldText}
                </strong>
              );
            }
            return part;
          })}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      );
    });
  }, []);

  // Helper to detect if user is requesting plan creation
  const isPlanCreationRequest = useCallback((message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    
    // Keywords that indicate plan creation intent
    const planCreationKeywords = [
      'create', 'start', 'set up', 'begin', 'initiate', 'establish',
      'dca plan', 'investment plan', 'strategy', 'automated',
      'buy', 'invest', 'purchase', 'dollar cost average'
    ];
    
    // Check if message contains plan creation keywords
    const hasPlanKeywords = planCreationKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );
    
    // Also check for specific tokens and amounts (indicating concrete plan)
    const hasTokenMentions = /(usdc|usdt|dai|eth|btc|arb|link|uni)\s+\d+/.test(lowerMessage);
    const hasAmountMentions = /\$\d+|\d+\s*(usdc|usdt|dai|eth|btc|arb|link|uni)/i.test(lowerMessage);
    
    return hasPlanKeywords && (hasTokenMentions || hasAmountMentions);
  }, []);

  useEffect(() => {
    // Keep input height in sync (handles textarea growth and device rotations)
    if (!inputContainerRef.current) return;
    const el = inputContainerRef.current;
    const updateHeight = () =>
      setInputContainerHeight(el.getBoundingClientRect().height);
    updateHeight();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => updateHeight());
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, []);

  const scrollToBottom = (smooth = true) => {
    endOfMessagesRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
      block: "end",
    });
  };

  useEffect(() => {
    // Auto-scroll on new messages or while loading
    scrollToBottom(true);
  }, [messages, isLoading]);

  // Update current token balance when plan data changes - COMMENTED OUT
  // useEffect(() => {
  //   console.log('[Balance] Token balance updated:', {
  //     tokenBalance: tokenBalance?.toString(),
  //     isBalanceLoading,
  //     currentPlanData: currentPlanData?.fromToken,
  //     currentTokenInfo: currentTokenInfo,
  //     address: address?.slice(0, 10) + '...',
  //     enabled: !!currentTokenInfo?.address && !!address
  //   });
    
  //   if (tokenBalance !== undefined) {
  //     setCurrentTokenBalance(tokenBalance);
  //   }
  // }, [tokenBalance, isBalanceLoading, currentPlanData, currentTokenInfo, address]);

  useEffect(() => {
    // Update chat context when wallet connection changes
    if (isConnected && address) {
      setConnectionStatus("connected");
      // Add a system message about wallet connection
      const connectionMessage: ChatMessage = {
        id: `wallet-${Date.now()}`,
        role: "assistant",
        content: `✅ Great! Your wallet (${formatAddress(
          address
        )}) is now connected. I can now help you with:\n\n• Creating DCA investment plans\n• Viewing your existing strategies\n• Managing plan status (pause/resume)\n• Tracking your portfolio performance\n\nWhat would you like to do first?`,
        timestamp: new Date(),
      };

      setMessages((prev) => {
        // Only add if not already added for this address
        const hasConnectionMessage = prev.some((msg) =>
          msg.content.includes(formatAddress(address))
        );
        if (!hasConnectionMessage) {
          return [...prev, connectionMessage];
        }
        return prev;
      });
    } else if (!isConnected && connectionStatus === "connected") {
      // Wallet was disconnected
      setConnectionStatus(null);
      const disconnectionMessage: ChatMessage = {
        id: `wallet-disconnect-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Your wallet has been disconnected. Some features like creating DCA plans and viewing your portfolio will be limited. Please reconnect your wallet to access all features.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, disconnectionMessage]);
    }
  }, [isConnected, address, connectionStatus]);

  // --- Chat Handlers ---
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    console.log("userMessage", userMessage);

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    setIsLoading(true);
    scrollToBottom(false);


    try {
      // Set connecting status
      setConnectionStatus("connecting");

      // Determine if this is a plan creation request
      const isPlanRequest = isPlanCreationRequest(currentInput);
      
      // Call our DCA chat API endpoint
      const response = await fetch("/api/dca-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          userAddress: address,
          conversationHistory: messages.slice(-6), // Include last 6 messages for context
          isPlanCreationRequest: isPlanRequest, // Flag to help API determine response type
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      console.log("DCA Chat API response:", result);

      if (result.success) {
        // Set connected status on successful response
        setConnectionStatus("connected");

        const assistantMessageId = (Date.now() + 1).toString();
        const assistantMessage: ChatMessage = {
          id: assistantMessageId,
          role: "assistant",
          content:
            result.response ||
            "I received your message but had trouble generating a response.",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Handle specific actions if provided
        if (result.action) {
          handleChatAction(result.action, result.data, assistantMessageId);
        }
      } else {
        setConnectionStatus("error");
        throw new Error(result.error || "Unknown API error");
      }
    } catch (error) {
      setConnectionStatus("error");
      console.error("Error sending message to DCA backend:", error);

      // Fallback to local response generation on error
      const fallbackResponse = generateAssistantResponse(currentInput);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `⚠️ I'm having trouble connecting to the DCA backend right now. Here's a basic response:\n\n${fallbackResponse}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
      scrollToBottom(true);
    }
  }, [inputMessage, isLoading, address, messages]);

  // --- Chat Action Handlers ---
  const handleChatAction = useCallback((action: string, data?: any, messageId?: string) => {
    console.log("Handling chat action:", action, data, messageId);

    switch (action) {
      case "request_wallet_connection":
        // Could trigger wallet connection modal or guide user
        console.log("Action: Request wallet connection");
        break;

      case "plan_confirmation_required":
        // Show confirmation UI for DCA plan creation - ONLY when we have complete plan data
        console.log("Action: Plan confirmation required", data);
        if (data?.confirmationId && data?.planData && messageId) {
          // Validate that we have all required plan data
          const planData = data.planData;
          const requiredFields = ['fromToken', 'toToken', 'amount', 'intervalMinutes', 'durationWeeks', 'slippage'];
          const hasAllRequiredFields = requiredFields.every(field => planData[field] !== undefined && planData[field] !== null);
          
          if (hasAllRequiredFields) {
            console.log("Complete plan data received, showing confirmation flow");
            setIsInPlanCreationFlow(true);
            // Update the message to show confirmation state
            setMessages(prev => prev.map(msg => 
              msg.id === messageId 
                ? { 
                    ...msg, 
                    requiresConfirmation: true, 
                    confirmationId: data.confirmationId, 
                    confirmationData: data.planData 
                  }
                : msg
            ));
          } else {
            console.log("Incomplete plan data, not showing confirmation yet");
            // Don't show confirmation if data is incomplete
          }
        }
        break;

      case "plan_created":
      case "plan_confirmed":
        // Plan was successfully created
        console.log("Action: Plan created/confirmed successfully");
        break;

      case "action_cancelled":
        // User cancelled the action
        console.log("Action: Action cancelled by user");
        break;

      case "approval_required":
        // Token approval required
        console.log("Action: Token approval required", data);
        break;

      case "show_plans":
        // Could display plans in a structured format or table
        console.log("Action: Show user plans", data);
        break;

      case "show_stats":
        // Could display stats in a chart or structured format
        console.log("Action: Show platform stats", data);
        break;

      case "execution_triggered":
        // Could show transaction status or redirect to transaction view
        console.log("Action: DCA execution triggered");
        break;

      case "plan_paused":
      case "plan_resumed":
        // Could show confirmation message
        console.log("Action: Plan status changed");
        break;

      default:
        console.log("Unknown action:", action);
    }
  }, []);

  // Handle approval transaction success
  useEffect(() => {
    if (isApprovalConfirmed && approvalTxHash && pendingConfirmationId) {
      setApprovalStatus('approved');
      
      // Add success message with transaction hash and copy functionality
      const approvalMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant", 
        content: `✅ Token approval confirmed!\n\n**Transaction Hash:** ${approvalTxHash.slice(0, 10)}...${approvalTxHash.slice(-8)}\n\nNow creating your DCA plan...`,
        timestamp: new Date(),
        // Add transaction hash data for copy functionality
        transactionHash: approvalTxHash,
      };
      setMessages((prev) => [...prev, approvalMessage]);

      // Proceed with plan creation after approval
      proceedWithPlanCreation(pendingConfirmationId);
      setPendingConfirmationId(null);
    }
  }, [isApprovalConfirmed, approvalTxHash, pendingConfirmationId]);

  // Handle approval error
  useEffect(() => {
    if (approvalError) {
      setApprovalStatus('error');
      setPendingConfirmationId(null);
      
      // Check if it's a user rejection (MetaMask cancellation)
      const isUserRejection = approvalError.message.includes('User rejected') || 
                             approvalError.message.includes('User denied') ||
                             approvalError.message.includes('cancelled') ||
                             approvalError.message.includes('rejected');
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: isUserRejection 
          ? "❌ Token approval was cancelled. No plan was created.\n\nYou can try creating the plan again when you're ready."
          : `❌ Token approval failed: ${approvalError.message}\n\nYou need to approve token spending to create the DCA plan. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
      setCurrentPlanData(null);
    }
  }, [approvalError]);

  // Proceed with plan creation after approval
  const proceedWithPlanCreation = useCallback(async (confirmationId: string) => {
    try {
      console.log('[Confirmation] Creating plan after approval:', confirmationId);
      
      // Add loading message for plan creation
      const loadingMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "🔄 Creating your DCA plan...",
        timestamp: new Date(),
        isCreatingPlan: true,
      };
      setMessages((prev) => [...prev, loadingMessage]);
      
      // Call the API with confirmation
      const response = await fetch("/api/dca-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "", // Empty message for confirmation actions
          userAddress: address,
          confirmationId: confirmationId,
          action: "confirm",
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      console.log("Plan confirmation response:", result);
      console.log("Actual response content:", result.response);

      if (result.success) {
        // Remove loading message and show success
        setMessages((prev) => prev.filter(msg => !msg.isCreatingPlan));
        
        // Show the actual response from the backend/SSE
        const confirmationMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: result.response || "🎉 DCA plan created successfully!\n\nYour automated investment strategy is now active and will execute according to your schedule.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, confirmationMessage]);

        // Handle action response
        if (result.action) {
          handleChatAction(result.action, result.data);
        }
      } else {
        throw new Error(result.error || "Failed to create plan");
      }
    } catch (error) {
      console.error("Error creating plan:", error);
      
      // Remove loading message
      setMessages((prev) => prev.filter(msg => !msg.isCreatingPlan));
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "❌ Sorry, I encountered an error while creating your plan. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setApprovalStatus('idle');
      setCurrentPlanData(null);
      setIsInPlanCreationFlow(false);
    }
  }, [address, handleChatAction]);

  // Start approval process after user confirms the plan summary
  const startApprovalProcess = useCallback(async (confirmationId: string, planData: any) => {
    const tokenInfo = getTokenInfo(planData.fromToken);
    if (!tokenInfo) {
      console.error('Unsupported token:', planData.fromToken);
      return;
    }

    try {
      const totalExecutions = Math.floor((planData.durationWeeks * 7 * 24 * 60) / planData.intervalMinutes);
      const totalAmount = parseFloat(planData.amount) * totalExecutions;

      // Show approval request message
      const approvalMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: `🔐 **Requesting Token Approval**\n\nPlease check your wallet and approve spending of ${totalAmount.toFixed(6)} ${planData.fromToken} tokens. This allows our contract to execute your DCA plan automatically.\n\n*Check your wallet popup...*`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, approvalMessage]);

      setConfirmationStep('approval');
      setApprovalStatus('approving');
      setPendingConfirmationId(confirmationId);

      console.log('[Approval] Starting token approval process:', {
        token: tokenInfo.symbol,
        amount: totalAmount,
        totalExecutions,
      });

      // Trigger wallet approval popup  
      writeContract({
        address: tokenInfo.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [EXECUATOR_ADDRESS as `0x${string}`, maxUint256],
        chainId: arbitrum.id,
      });

    } catch (error) {
      console.error("Error starting approval process:", error);
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "❌ Failed to start token approval process. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setApprovalStatus('idle');
    }
  }, [writeContract]);

  // --- Confirmation Handlers ---
  const handleConfirmPlan = useCallback(async (confirmationId: string) => {
    if (!confirmationId || !address) return;
    
    setIsLoading(true);
    
    // First, get the confirmation data to show plan summary
    const confirmationMessage = messages.find(msg => msg.confirmationId === confirmationId);
    const planData = confirmationMessage?.confirmationData;
    
    if (!planData) {
      console.error('No plan data found for confirmation');
      setIsLoading(false);
      return;
    }

    const tokenInfo = getTokenInfo(planData.fromToken);
    if (!tokenInfo) {
      console.error('Unsupported token:', planData.fromToken);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Unsupported token: ${planData.fromToken}. Please choose a different token.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
      return;
    }

        // Set current plan data for balance checking - COMMENTED OUT
    // setCurrentPlanData(planData);

    // Wait for balance to load, then check - COMMENTED OUT
    // let retryCount = 0;
    // const maxRetries = 15; // 15 seconds max wait
    
    // const checkBalance = () => {
    //   console.log("[Balance] Check attempt", retryCount + 1, "of", maxRetries);
    //   console.log("[Balance] Current state:", {
    //     isBalanceLoading,
    //     tokenBalance: tokenBalance?.toString(),
    //     currentTokenInfo,
    //     address: address?.slice(0, 10) + '...'
    //   });
      
    //   if (isBalanceLoading && retryCount < maxRetries) {
    //     // Still loading, wait a bit more
    //     retryCount++;
    //     setTimeout(checkBalance, 1000);
    //     return;
    //   }
      
    //   if (retryCount >= maxRetries) {
    //     // Timeout reached
    //     const errorMessage: ChatMessage = {
    //       id: Date.now().toString(),
    //       role: "assistant",
    //       content: "❌ **Balance check timeout**\n\nUnable to fetch your token balance. Please ensure your wallet is connected and try again.",
    //       timestamp: new Date(),
    //     };
    //     setMessages((prev) => [...prev, errorMessage]);
    //     setIsLoading(false);
    //     setCurrentPlanData(null);
    //     return;
    //   }
      
    //   const balanceCheck = checkSufficientBalance(planData);
    //   console.log("[Balance] Balance check result:", balanceCheck);
      
    //   if (balanceCheck.message === "Unable to fetch balance" || balanceCheck.message === "Checking balance...") {
    //     // Balance still not available, retry
    //     retryCount++;
    //     setTimeout(checkBalance, 1000);
    //     return;
    //   }
        
    //     if (!balanceCheck.sufficient) {
    //       const errorMessage: ChatMessage = {
    //         id: Date.now().toString(),
    //         role: "assistant",
    //         content: `❌ **Insufficient Balance**\n\n${balanceCheck.message}\n\nPlease ensure you have enough ${planData.fromToken} tokens before creating this plan.`,
    //         timestamp: new Date(),
    //       };
    //       setMessages((prev) => [...prev, errorMessage]);
    //       setIsLoading(false);
    //       setCurrentPlanData(null);
    //       return;
    //     }

    // Calculate total investment details for summary
    const totalExecutions = Math.floor((planData.durationWeeks * 7 * 24 * 60) / planData.intervalMinutes);
    const totalAmount = parseFloat(planData.amount) * totalExecutions;
    
    const frequencyText = planData.intervalMinutes === 60 ? 'hourly' :
                         planData.intervalMinutes === 1440 ? 'daily' :
                         planData.intervalMinutes === 10080 ? 'weekly' :
                         planData.intervalMinutes === 43200 ? 'monthly' :
                         `every ${planData.intervalMinutes} minutes`;
    
    const durationText = planData.durationWeeks === 1 ? '1 week' :
                        planData.durationWeeks === 4 ? '1 month' :
                        planData.durationWeeks === 52 ? '1 year' :
                        `${planData.durationWeeks} weeks`;

    // Show plan summary WITHOUT balance confirmation
    const summaryMessage: ChatMessage = {
      id: `summary-${Date.now()}`,
      role: "assistant",
      content: `📊 **Investment Plan Summary**\n\n` +
              `• **Investment Amount:** ${planData.amount} ${planData.fromToken} per execution\n` +
              `• **Target Token:** ${planData.toToken}\n` +
              `• **Frequency:** ${frequencyText}\n` +
              `• **Duration:** ${durationText}\n` +
              `• **Total Executions:** ${totalExecutions}\n` +
              `• **Total Investment:** ${totalAmount.toFixed(6)} ${planData.fromToken}\n` +
              `• **Slippage:** ${planData.slippage/100}%\n\n` +
              `⚠️ **Important:** This will create an automated investment plan that will execute transactions from your wallet. Please review the details carefully.\n\n` +
              `Ready to proceed with token approval?`,
      timestamp: new Date(),
      requiresConfirmation: true,
      confirmationId: `approve-${confirmationId}`,
      confirmationData: planData,
    };
    
    setMessages((prev) => [...prev, summaryMessage]);
    setConfirmationStep('summary');
    setIsLoading(false);
    
    // Start checking balance - COMMENTED OUT
    // checkBalance();
  }, [address, messages]);

  // Handle the approve confirmation (after summary)
  const handleApproveConfirm = useCallback(async (confirmationId: string) => {
    const originalConfirmationId = confirmationId.replace('approve-', '');
    const confirmationMessage = messages.find(msg => msg.confirmationId === originalConfirmationId);
    const planData = confirmationMessage?.confirmationData;
    
    if (planData) {
      await startApprovalProcess(originalConfirmationId, planData);
    }
  }, [messages, startApprovalProcess]);

  const handleCancelPlan = useCallback(async (confirmationId: string) => {
    if (!confirmationId) return;
    
    setIsLoading(true);
    
    try {
      console.log('[Confirmation] Cancelling plan creation:', confirmationId);
      
      // Call the API with cancellation
      const response = await fetch("/api/dca-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "", // Empty message for confirmation actions
          userAddress: address,
          confirmationId: confirmationId,
          action: "cancel",
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      console.log("Plan cancellation response:", result);

      if (result.success) {
        const cancellationMessage: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: result.response || "✅ Action cancelled successfully. No DCA plan was created.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, cancellationMessage]);

        // Handle action response
        if (result.action) {
          handleChatAction(result.action, result.data);
        }
      } else {
        throw new Error(result.error || "Failed to cancel");
      }
    } catch (error) {
      console.error("Error cancelling plan:", error);
      
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: "✅ Action cancelled locally. No DCA plan was created.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setCurrentPlanData(null);
      setApprovalStatus('idle');
      setIsInPlanCreationFlow(false);
    }
  }, [address, handleChatAction]);

  const generateAssistantResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes("create") && lowerInput.includes("strategy")) {
      return "I'll help you create a DCA strategy! Here are some popular options:\n\n1. **Daily DCA**: Invest $10-50 daily into ETH\n2. **Weekly DCA**: Invest $100-500 weekly into BTC\n3. **Monthly DCA**: Invest $500-2000 monthly into a crypto basket\n\nWhat's your preferred investment amount and frequency?";
    }

    if (lowerInput.includes("balance") || lowerInput.includes("portfolio")) {
      return "Your current portfolio status:\n\n💰 **USDC Balance**: $1,250.75\n📈 **Total Invested**: $2,450.00\n🎯 **Active Strategies**: 1\n📊 **Portfolio Value**: $2,680.50 (+9.4%)\n\nWould you like to see detailed breakdown or adjust your strategy?";
    }

    if (lowerInput.includes("eth") || lowerInput.includes("ethereum")) {
      return "Ethereum is a great choice for DCA! Here's what I recommend:\n\n📊 **Current ETH Price**: $3,240\n💡 **Strategy**: Daily $25-50 into ETH\n📈 **Historical Performance**: ETH has shown strong long-term growth\n\nShould I set up an automated ETH DCA strategy for you?";
    }

    if (lowerInput.includes("stop") || lowerInput.includes("pause")) {
      return "I can help you pause or modify your investment strategy. Currently you have:\n\n⏸️ **DCA Strategy #1**: Active (Daily $50 into ETH)\n\nWould you like to:\n1. Pause this strategy temporarily\n2. Modify the investment amount\n3. Change the frequency\n4. Stop completely\n\nWhat would you prefer?";
    }

    if (lowerInput.includes("help") || lowerInput.includes("what can you do")) {
      return "I'm your DCA investment assistant! Here's what I can help you with:\n\n🎯 **Create Strategies**: Set up automated investment plans\n💰 **Portfolio Management**: Track your investments and performance\n📊 **Market Analysis**: Get insights on crypto trends\n⚙️ **Strategy Adjustments**: Modify or pause your DCA plans\n💡 **Investment Advice**: Get personalized recommendations\n\nJust ask me anything about your investments!";
    }

    return (
      "I understand you're asking about: \"" +
      userInput +
      "\"\n\nI'm here to help with your DCA investment strategy. You can ask me to:\n\n• Create a new investment strategy\n• Check your portfolio balance\n• Modify existing strategies\n• Get market insights\n• Pause or stop investments\n\nWhat would you like to do?"
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputFocus = () => {
    // Ensure the input is visible above the keyboard in miniapp environments
    setTimeout(() => scrollToBottom(false), 50);
  };

  // --- Original Handlers (Commented for now) ---
  /**
   * Sends a notification to the current user's Farcaster account.
   *
   * This function makes a POST request to the /api/send-notification endpoint
   * with the user's FID and notification details. It handles different response
   * statuses including success (200), rate limiting (429), and errors.
   *
   * @returns Promise that resolves when the notification is sent or fails
   */
  const sendFarcasterNotification = useCallback(async () => {
    setNotificationState((prev) => ({ ...prev, sendStatus: "" }));
    if (!notificationDetails || !context) {
      return;
    }
    try {
      const response = await fetch("/api/send-notification", {
        method: "POST",
        mode: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: context.user.fid,
          notificationDetails,
        }),
      });
      if (response.status === 200) {
        setNotificationState((prev) => ({ ...prev, sendStatus: "Success" }));
        return;
      } else if (response.status === 429) {
        setNotificationState((prev) => ({
          ...prev,
          sendStatus: "Rate limited",
        }));
        return;
      }
      const responseText = await response.text();
      setNotificationState((prev) => ({
        ...prev,
        sendStatus: `Error: ${responseText}`,
      }));
    } catch (error) {
      setNotificationState((prev) => ({
        ...prev,
        sendStatus: `Error: ${error}`,
      }));
    }
  }, [context, notificationDetails]);

  /**
   * Copies the share URL for the current user to the clipboard.
   *
   * This function generates a share URL using the user's FID and copies it
   * to the clipboard. It shows a temporary "Copied!" message for 2 seconds.
   */
  const copyUserShareUrl = useCallback(async () => {
    if (context?.user?.fid) {
      const userShareUrl = `${APP_URL}/share/${context.user.fid}`;
      await navigator.clipboard.writeText(userShareUrl);
      setNotificationState((prev) => ({ ...prev, shareUrlCopied: true }));
      setTimeout(
        () =>
          setNotificationState((prev) => ({ ...prev, shareUrlCopied: false })),
        2000
      );
    }
  }, [context?.user?.fid]);

  /**
   * Triggers haptic feedback with the selected intensity.
   *
   * This function calls the haptics.impactOccurred method with the current
   * selectedHapticIntensity setting. It handles errors gracefully by logging them.
   */
  const triggerHapticFeedback = useCallback(async () => {
    try {
      await haptics.impactOccurred(selectedHapticIntensity);
    } catch (error) {
      console.error("Haptic feedback failed:", error);
    }
  }, [haptics, selectedHapticIntensity]);

  // --- Render ---
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      {/* <div className="flex-shrink-0 bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center border border-[#c199e4]/20">
            <svg className="w-6 h-6 text-[#c199e4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              DCA Chat Assistant
            </h2>
            <p className="text-sm text-white/70">
              Get help with your dollar cost averaging strategies
            </p>
          </div>
        </div>
      </div> */}

      {/* Chat Container */}
      <div className="flex-1 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 overflow-hidden flex flex-col">
        {/* Address pill */}
        <div className="flex-shrink-0 flex justify-end p-3 pb-2">
          <div className="px-3 py-1.5 rounded-full bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 border border-[#c199e4]/30 text-xs font-mono text-white/90 shadow-sm flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-[#c199e4]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.866 0-7 3.134-7 7h2c0-2.761 2.239-5 5-5s5 2.239 5 5h2c0-3.866-3.134-7-7-7z" />
            </svg>
            {address ? formatAddress(address) : 'Not Connected'}
          </div>
        </div>

        {/* Chat Messages - Scrollable */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3"
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: '#c199e4 transparent'
          }}
        >

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-1.5 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar Icon */}
              <div className={`flex-shrink-0 size-6 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-gradient-to-br from-[#c199e4] to-[#b380db]' 
                  : 'bg-gradient-to-br from-white/20 to-white/10 border border-white/30'
              }`}>
                {message.role === 'user' ? (
                  <IoPersonCircle className="size-4 text-white" />
                ) : (
                  <RiRobot2Fill className="size-3.5 text-[#c199e4]" />
                )}
              </div>

              {/* Message Content */}
              <div
                className={`rounded-2xl px-3 py-3 ${
                  message.role === 'user'
                    ? 'max-w-[75%] bg-gradient-to-br from-[#c199e4] to-[#b380db] text-white shadow-lg'
                    : 'bg-gradient-to-br from-white/15 to-white/10 backdrop-blur-sm text-white border border-white/20'
                }`}
              >
                <div className="text-sm leading-relaxed">
                  {renderMarkdownText(message.content)}
                  {message.isCreatingPlan && (
                    <div className="mt-2 flex space-x-1">
                      <div className="w-2 h-2 bg-[#c199e4] rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-[#c199e4] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-[#c199e4] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  )}
                </div>
                
                {/* Copy Transaction Hash Button */}
                {message.transactionHash && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(message.transactionHash!);
                        // Could add a toast notification here
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy Full Hash
                    </button>
                  </div>
                )}
                
                {/* Confirmation Buttons */}
                {message.requiresConfirmation && message.confirmationId && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => {
                          if (message.confirmationId?.startsWith('approve-')) {
                            handleApproveConfirm(message.confirmationId);
                          } else {
                            handleConfirmPlan(message.confirmationId as string);
                          }
                        }}
                        disabled={isLoading || isApprovePending || isApprovalConfirming}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {(isApprovePending || isApprovalConfirming) ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {isApprovePending ? "Wallet Approval..." : "Confirming Approval..."}
                          </>
                        ) : isLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            {message.confirmationId?.startsWith('approve-') ? 'Starting Approval...' : 'Creating Plan...'}
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {message.confirmationId?.startsWith('approve-') ? 'Proceed with Approval' : 'Review Plan Details'}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleCancelPlan(message.confirmationId!)}
                        disabled={isLoading || isApprovePending || isApprovalConfirming}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                <div
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-white/80' : 'text-white/60'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] bg-gradient-to-br from-white/15 to-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[#c199e4] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#c199e4] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-[#c199e4] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* Anchor to scroll to bottom */}
          <div ref={endOfMessagesRef} />
        </div>

        {/* Chat Input - Fixed at Bottom */}
        <div
          ref={inputContainerRef}
          className="flex-shrink-0 border-t border-white/20 px-4 py-2 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-lg"
          // style={{ paddingBottom: Math.max(12, 12 + safeBottom) }}
        >
          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              onClick={() => setInputMessage('Show my DCA plans')}
              className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
            >
              My Plans
            </button>
            <button
              onClick={() => setInputMessage('Create a new DCA strategy')}
              className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
            >
              Create Plan
            </button>
            <button
              onClick={() => setInputMessage('Platform statistics')}
              className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
            >
              Stats
            </button>
            <button
              onClick={() => setInputMessage('Help me understand DCA')}
              className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
            >
              Help
            </button>
          </div>

          {/* Connection Status Indicator */}
          {connectionStatus && (
            <div className="flex items-center gap-2 mb-1 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400' : 
                connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
                'bg-red-400'
              }`} />
              <span className="text-white/70">
                {connectionStatus === 'connected' && 'Connected to DCA Backend'}
                {connectionStatus === 'connecting' && 'Connecting...'}
                {connectionStatus === 'error' && 'Connection Error'}
              </span>
            </div>
          )}

          {/* Plan Creation Mode Indicator */}
          {isInPlanCreationFlow && (
            <div className="flex items-center gap-2 mb-1 text-xs">
              <div className="w-2 h-2 rounded-full bg-[#c199e4] animate-pulse" />
              <span className="text-[#c199e4]/80">
                Plan Creation Mode - Review your investment details
              </span>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                onFocus={handleInputFocus}
                placeholder={
                  isInPlanCreationFlow 
                    ? "Review the plan details above and click 'Review Plan Details' to proceed..." 
                    : isConnected 
                      ? "Ask me anything about DCA investing..." 
                      : "Connect wallet first, then ask about DCA strategies"
                }
                className="w-full px-4 py-1.5 border border-white/30 rounded-2xl bg-white/10 backdrop-blur-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#c199e4]/50 focus:border-[#c199e4]/50 transition-all duration-300"
                style={{ minHeight: 44 }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="h-11 w-11 p-0 bg-gradient-to-br from-[#c199e4] to-[#b380db] hover:from-[#d9b3ed] hover:to-[#c199e4] disabled:from-white/20 disabled:to-white/10 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-300 flex items-center justify-center shadow-lg backdrop-blur-sm"
              aria-label="Send message"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19V5m0 0l-7 7m7-7l7 7"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>


      {/* Original Actions (Commented out for now) */}
      {/*
      <div className="space-y-3 px-6 w-full max-w-md mx-auto">
        <ShareButton
          buttonText="Share Mini App"
          cast={{
            text: 'Check out this awesome frame @1 @2 @3! 🚀🪐',
            bestFriends: true,
            embeds: [`${APP_URL}/share/${context?.user?.fid || ''}`],
          }}
          className="w-full"
        />

        <SignIn />

        <Button
          onClick={() =>
            actions.openUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
          }
          className="w-full"
        >
          Open Link
        </Button>

        <Button onClick={actions.addMiniApp} disabled={added} className="w-full">
          Add Mini App to Client
        </Button>

        {notificationState.sendStatus && (
          <div className="text-sm w-full">
            Send notification result: {notificationState.sendStatus}
          </div>
        )}
        <Button
          onClick={sendFarcasterNotification}
          disabled={!notificationDetails}
          className="w-full"
        >
          Send notification
        </Button>

        <Button
          onClick={copyUserShareUrl}
          disabled={!context?.user?.fid}
          className="w-full"
        >
          {notificationState.shareUrlCopied ? 'Copied!' : 'Copy share URL'}
        </Button>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Haptic Intensity
          </label>
          <select
            value={selectedHapticIntensity}
            onChange={(e) =>
              setSelectedHapticIntensity(
                e.target.value as Haptics.ImpactOccurredType
              )
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value={'light'}>Light</option>
            <option value={'medium'}>Medium</option>
            <option value={'heavy'}>Heavy</option>
            <option value={'soft'}>Soft</option>
            <option value={'rigid'}>Rigid</option>
          </select>
          <Button onClick={triggerHapticFeedback} className="w-full">
            Trigger Haptic Feedback
          </Button>
        </div>
      </div>
      */}
    </div>
  );
}
