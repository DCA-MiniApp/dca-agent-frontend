"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMiniApp } from "@neynar/react";
import { APP_URL, QUICKSTART_PREFILL_KEY } from "~/lib/constants";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useWalletClient,
} from "wagmi";
import { arbitrum } from "wagmi/chains";
import {
  ERC20_ABI,
  getTokenInfo,
  EXECUTOR_ADDRESS,
} from "../../../lib/tokenContracts";

import { IoPersonCircle } from "react-icons/io5";
import { RiRobot2Fill } from "react-icons/ri";

import sdk from "@farcaster/miniapp-sdk";
import {
  MANUAL_DISCONNECT_EVENT,
  MANUAL_DISCONNECT_FLAG,
} from "../../providers/WagmiProvider";
import { checkTgBalanceForUser } from "../../../lib/triggerXIntegration";
import { parseUnits } from "viem";

// Import refactored utilities, types, constants, and hooks
import { getEthersSigner } from "./ActionsTab/utils/signer";
import { renderMarkdownText } from "./ActionsTab/utils/markdown";
import { 
  formatAddress, 
  createMessageId,
  isPlanCreationRequest
} from "./ActionsTab/utils/helpers";
import type { 
  ChatMessage, 
} from "./ActionsTab/types";
import { useScrollBehavior, usePlanSimulation, useDepositFlow } from "./ActionsTab/hooks";
import { 
  PlanCreationProgress, 
  LoadingIndicator, 
  ConfirmationButtons, 
  DepositUI,
  QuickActionButtons,
  ChatInput
} from "./ActionsTab/components";

// All types, constants, and utilities are now imported from the ActionsTab folder

export function ActionsTab() {
  // --- Hooks ---
  const { notificationDetails, haptics, context } = useMiniApp();

  const { address, isConnected, connector, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Respect manual disconnect flag set from WalletTab / provider.
  const [hasManualDisconnect, setHasManualDisconnect] = useState(false);

  useEffect(() => {
    const readFlag = () =>
      typeof window !== "undefined" &&
      window.sessionStorage?.getItem(MANUAL_DISCONNECT_FLAG) === "true";

    setHasManualDisconnect(readFlag());

    const handler = () => {
      setHasManualDisconnect(readFlag());
    };

    if (typeof window !== "undefined") {
      window.addEventListener(
        MANUAL_DISCONNECT_EVENT,
        handler as EventListener
      );
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          MANUAL_DISCONNECT_EVENT,
          handler as EventListener
        );
      }
    };
  }, []);

  const isWalletConnected = isConnected && !hasManualDisconnect;

  // --- State ---
  const [notificationState, setNotificationState] = useState({
    sendStatus: "",
    shareUrlCopied: false,
  });

  // --- Chat State ---
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: `👋 **Hello!** I'm your DCA investment assistant.\n\n🎯 Create automated strategies\n📊 Track portfolio performance\n⚙️ Manage your plans\n\n Please ensure your DCA plan interval is set to a minimum of 5 minutes. Make sure your plan follows this requirement for optimal automation.\n\n${isWalletConnected
        ? `Wallet connected (${formatAddress(address || "")}) - ready to go!`
        : "Connect wallet to access all features."
        }\n\n**Quick start:** "Create a DCA plan with 0.1 USDC into WETH weekly for 1 month"`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isApprovalLoading, setIsApprovalLoading] = useState(false); // Separate loading state for approval
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "error" | null
  >(null);

  // --- Layout/Refs for better UX ---
  const quickStartInputRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement | null>(null);
  const [inputContainerHeight, setInputContainerHeight] = useState<number>(72);
  
  // Use scroll behavior hook
  const {
    endOfMessagesRef,
    messagesContainerRef,
    showScrollToLatest,
    scrollToBottom,
    handleJumpToLatest,
  } = useScrollBehavior(messages, isLoading);

  // Token approval state
  const [approvalStatus, setApprovalStatus] = useState<
    "idle" | "approving" | "approved" | "error"
  >("idle");
  const [pendingConfirmationId, setPendingConfirmationId] = useState<
    string | null
  >(null);
  const [confirmationStep, setConfirmationStep] = useState<
    "summary" | "approval" | "completed"
  >("summary");
  const [currentPlanData, setCurrentPlanData] = useState<any>(null);
  const [isInPlanCreationFlow, setIsInPlanCreationFlow] = useState(false);
  const [completedConfirmations, setCompletedConfirmations] = useState<
    Set<string>
  >(new Set());
  const [showCreatePlanTokens, setShowCreatePlanTokens] = useState(false);

  // Use plan simulation hook
  const {
    planSimulation,
    microTicker,
    isPlanCreationLoading,
    setIsPlanCreationLoading,
    startPlanCreationSimulation,
    stopPlanCreationSimulation,
  } = usePlanSimulation();

  // Use deposit flow hook
  const {
    depositAmounts,
    depositStatuses,
    isDepositLoading,
    setDepositAmounts,
    handleDeposit: handleDepositFlow,
  } = useDepositFlow();

  // Contract interactions for token approval
  const {
    writeContract,
    data: approvalTxHash,
    error: approvalError,
    isPending: isApprovePending,
  } = useWriteContract();
  const { isLoading: isApprovalConfirming, isSuccess: isApprovalConfirmed } =
    useWaitForTransactionReceipt({
      hash: approvalTxHash,
    });

  // Markdown rendering is now imported from utils

  // Share handler using Farcaster Miniapp SDK
  const handleShareNow = useCallback(async (text: string) => {
    try {
      if ((sdk as any)?.actions?.composeCast) {
        await (sdk as any).actions.composeCast({ text });
      } else if (typeof window !== "undefined") {
        const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(
          text
        )}`;
        console.log("Sharing cast", url);
        window.open(url, "_blank");
      }
    } catch (err) {
      console.error("Failed to open cast composer:", err);
    }
  }, []);

  // isPlanCreationRequest is now imported from utils

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

  const triggerHaptic = useCallback(() => {
    try {
      const result = haptics?.impactOccurred?.("light");
      if (result instanceof Promise) {
        result.catch(() => undefined);
      }
    } catch (err) {
      console.warn("Haptics error:", err);
    }
  }, [haptics]);

  // Wrapper to start plan simulation and add loading message
  const handleStartPlanSimulation = useCallback(() => {
    startPlanCreationSimulation();

    // Ensure a loading message exists to host the simulation panel.
    setMessages((prev) => {
      const alreadyPresent = prev.some((msg) => msg.isCreatingPlan);
      if (alreadyPresent) return prev;
      const loadingMessage: ChatMessage = {
        id: createMessageId("assistant"),
        role: "assistant",
        content: "🪄 Creating your DCA plan...",
        timestamp: new Date(),
        isCreatingPlan: true,
      };
      return [...prev, loadingMessage];
    });
  }, [startPlanCreationSimulation]);

  useEffect(() => {
    // Update chat context when wallet connection changes
    if (isWalletConnected && address) {
      setConnectionStatus("connected");
      // Add a system message about wallet connection
      const connectionMessage: ChatMessage = {
        id: createMessageId("wallet"),
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
    } else if (!isWalletConnected && connectionStatus === "connected") {
      // Wallet was disconnected
      setConnectionStatus(null);
      const disconnectionMessage: ChatMessage = {
        id: createMessageId("wallet-disconnect"),
        role: "assistant",
        content: `⚠️ Your wallet has been disconnected. Some features like creating DCA plans and viewing your portfolio will be limited. Please reconnect your wallet to access all features.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, disconnectionMessage]);
    }
  }, [isConnected, address, connectionStatus]);

  // --- Chat Handlers ---
  const handleSendMessage = useCallback(async () => {
    const canSend =
      isWalletConnected &&
      !isLoading &&
      !isApprovalLoading &&
      !isApprovePending &&
      !isApprovalConfirming &&
      !isPlanCreationLoading &&
      inputMessage.trim().length > 0;
    if (!canSend) return;

    const userMessage: ChatMessage = {
      id: createMessageId("user"),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    setIsLoading(true);
    scrollToBottom(false);

    // Reset approval states when starting new conversation
    setApprovalStatus("idle");
    setPendingConfirmationId(null);
    setCurrentPlanData(null);
    setIsInPlanCreationFlow(false);
    setIsApprovalLoading(false);
    setIsPlanCreationLoading(false);
    setCompletedConfirmations(new Set());

    try {
      setIsPlanCreationLoading(isInPlanCreationFlow);
      // Set connecting status
      setConnectionStatus("connecting");

      // Determine if this is a plan creation request
      const isPlanRequest = isPlanCreationRequest(currentInput);

      console.log('🔍 [ACTIONS TAB] Sending to DCA chat API with address:', address);
      console.log('🔍 [ACTIONS TAB] Address length:', address?.length);
      console.log('🔍 [ACTIONS TAB] Address regex test:', /^0x[a-fA-F0-9]{40}$/.test(address || ''));

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
          fid: context?.user?.fid || 0,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Set connected status on successful response
        setConnectionStatus("connected");

        const assistantMessageId = createMessageId("assistant");

        // Check if this is a plan confirmation response that already contains approval content
        const isPlanConfirmationResponse =
          result.action === "plan_confirmation_required";

        const assistantMessage: ChatMessage = {
          id: assistantMessageId,
          role: "assistant",
          content:
            result.response ||
            "I received your message but had trouble generating a response.",
          timestamp: new Date(),
          // If this is a plan confirmation response, mark it for DCA Chat API response:
          ...(isPlanConfirmationResponse && result.data
            ? {
              requiresConfirmation: true,
              confirmationId: `approve-${result.data.confirmationId}`,
              confirmationData: result.data.planData,
            }
            : {}),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Handle specific actions if provided (but skip plan_confirmation_required since we already handled it)
        if (result.action && result.action !== "plan_confirmation_required") {
          handleChatAction(result.action, result.data, assistantMessageId);
        }

        // If this is a plan confirmation, set the flow state
        if (isPlanConfirmationResponse) {
          setIsInPlanCreationFlow(true);
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
        id: createMessageId("assistant"),
        role: "assistant",
        content: `⚠️ I'm having trouble connecting to the DCA backend right now. Here's a basic response:\n\n${fallbackResponse}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
      setIsPlanCreationLoading(false);
      scrollToBottom(true);
    }
  }, [inputMessage, isLoading, address, messages]);

  // --- Deposit Handler (using hook) ---
  const handleDeposit = useCallback(
    async (messageId: string, amount: string) => {
      await handleDepositFlow(messageId, amount, walletClient, connector, address);
    },
    [handleDepositFlow, walletClient, connector, address]
  );

  // --- Chat Action Handlers ---
  const handleChatAction = useCallback(
    (action: string, data?: any, messageId?: string) => {
      // console.log("Handling chat action:", action, data, messageId);

      switch (action) {
        case "request_wallet_connection":
          // Could trigger wallet connection modal or guide user
          console.log("Action: Request wallet connection");
          break;

        case "plan_confirmation_required":
          // This case is now handled directly in the API response processing
          // to prevent duplicate approval messages
          console.log(
            "Action: Plan confirmation required - handled in response processing"
          );
          break;

        case "collect_plan_data":
          // Plan data collection in progress - no special handling needed
          // The response message already guides the user for next input
          // console.log("Action: Collecting plan data", data);
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
    },
    []
  );

  // Handle approval transaction success
  useEffect(() => {
    if (isApprovalConfirmed && approvalTxHash && pendingConfirmationId) {
      setApprovalStatus("approved");
      setIsApprovalLoading(false);

      // Mark this confirmation as completed
      setCompletedConfirmations((prev) =>
        new Set(prev).add(pendingConfirmationId)
      );

      // Add success message with transaction hash and copy functionality
      const approvalMessage: ChatMessage = {
        id: createMessageId("assistant"),
        role: "assistant",
        content: `✅ Token approval confirmed!\n\n**Transaction Hash:** ${approvalTxHash.slice(
          0,
          10
        )}...${approvalTxHash.slice(-8)}\n\nNow creating your DCA plan...`,
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
      setApprovalStatus("error");
      const currentPendingId = pendingConfirmationId;
      console.log("hahaha currentPendingId",currentPendingId);
      setPendingConfirmationId(null);
      setIsApprovalLoading(false);

      // Check if it's a user rejection (MetaMask cancellation)
      const isUserRejection =
        approvalError.message.includes("User rejected") ||
        approvalError.message.includes("User denied") ||
        approvalError.message.includes("cancelled") ||
        approvalError.message.includes("rejected");

      // Check if it's the getChainId connector error
      const isConnectorError =
        approvalError.message.includes("getChainId") ||
        approvalError.message.includes("is not a function");

      let errorContent: string;
      if (isUserRejection) {
        errorContent =
          "❌ Token approval was cancelled. No plan was created.\n\nYou can try creating the plan again when you're ready.";
      } else if (isConnectorError) {
        errorContent =
          "❌ Token approval failed: Wallet connection issue.\n\nPlease ensure:\n• You're connected to Arbitrum network\n• Your wallet is properly connected\n• Try disconnecting and reconnecting your wallet\n\nThen try creating the plan again.";
      } else {
        errorContent = `❌ Token approval failed: ${approvalError.message}\n\nYou need to approve token spending to create the DCA plan. Please try again.`;
      }

      // Update the confirmation message status to 'cancelled' if user rejected
      if (currentPendingId && isUserRejection) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.confirmationId === `approve-${currentPendingId}`
              ? { ...msg, confirmationStatus: "cancelled" as const }
              : msg
          )
        );
      }

      const errorMessage: ChatMessage = {
        id: createMessageId("assistant"),
        role: "assistant",
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
      setCurrentPlanData(null);
      setIsInPlanCreationFlow(false);
      setConfirmationStep("summary");
    }
  }, [approvalError]);

  // Plan simulation is now handled by the usePlanSimulation hook

  const proceedWithPlanCreation = useCallback(
    async (confirmationId: string) => {
      try {
        console.log(
          "[Confirmation] Creating plan after approval:",
          confirmationId
        );

        handleStartPlanSimulation();

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
            fid: context?.user?.fid || 0,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();

        // Track TriggerX automation success/failure
        let triggerXSuccess = false;
        let triggerXSkipped = false;

        // Check if plan was created successfully
        if (result.success && result.data) {
          console.log("Plan created successfully 1174:", result.data);
          const planId = result.data.agentResponse.id;
          // console.log("Plan created successfully:", planId);

          // TriggerX Job Creation - Create automated job after plan creation
          try {
            // console.log("Starting TriggerX integration...");
            const { createTriggerXJobForPlan } = await import(
              "../../../lib/triggerXIntegration"
            );

            let ethersSigner: any = null;

            try {
              // ✅ Just call the function with connector and walletClient
              ethersSigner = await getEthersSigner(walletClient, connector);

              const signerAddress = await ethersSigner.getAddress();
              console.log('🔍 [ACTIONS TAB] Final signer address before TriggerX job:', signerAddress);
              console.log('🔍 [ACTIONS TAB] Final signer address length:', signerAddress?.length);
              console.log('🔍 [ACTIONS TAB] Final signer address regex test:', /^0x[a-fA-F0-9]{40}$/.test(signerAddress || ''));
              console.log(
                "✅ Signer obtained successfully:",
                signerAddress
              );
              console.log("Signer value:", ethersSigner);

              // Now you can use ethersSigner for your transactions
            } catch (walletErr) {
              console.error("❌ Failed to obtain ethers signer:", walletErr);
              ethersSigner = null;

              // Handle error (show message to user, etc.)
            }

            // Handle case where no signer could be obtained
            if (!ethersSigner) {
              console.warn("⚠️ Could not obtain wallet signer");

              // Mark as skipped (not a failure, but automation wasn't set up)
              triggerXSkipped = true;

              const walletErrorMessage: ChatMessage = {
                id: createMessageId("assistant"),
                role: "assistant",
                content: `⚠️ **Plan Created Successfully**\n\nHowever, we couldn't connect to your wallet to set up automation. Your plan was created but automation setup was skipped.\n\nYou can manually execute swaps or reconnect your wallet to enable automation.`,
                timestamp: new Date(),
              };
              setMessages((prev) => [
                ...prev.filter((msg) => !msg.isCreatingPlan).map((msg) =>
                  msg.confirmationId === `approve-${confirmationId}`
                    ? { ...msg, confirmationStatus: "completed" as const }
                    : msg
                ),
                walletErrorMessage,
              ]);
            } else {
              // Signer obtained successfully, create TriggerX job
              // console.log("🚀 Creating TriggerX job for plan:", planId);
              // console.log("Agent response:", result.data.agentResponse);

              const triggerXResult = await createTriggerXJobForPlan({
                planId: result.data.agentResponse.id,
                userAddress: address || result.data.agentResponse.userAddress,
                fromToken: result.data.agentResponse.fromToken,
                toToken: result.data.agentResponse.toToken,
                amount: result.data.agentResponse.amount,
                // Convert seconds back to minutes/weeks for TriggerX compatibility
                intervalMinutes: result.data.agentResponse.intervalSeconds
                  ? Math.round(result.data.agentResponse.intervalSeconds / 60)
                  : result.data.agentResponse.intervalMinutes,
                durationWeeks: result.data.agentResponse.durationSeconds
                  ? result.data.agentResponse.durationSeconds / 604800
                  : result.data.agentResponse.durationWeeks,
                slippage: result.data.agentResponse.slippage,
                signer: ethersSigner,
                fid: context?.user?.fid || 0,
              });

              // console.log("TriggerX result:", triggerXResult);

              if (triggerXResult.success) {
                // Mark TriggerX as successful
                triggerXSuccess = true;

                // Add success message about automation

                const shareLines = [
                  // Generate the share lines without any trailing whitespace or empty elements
                  ...[
                    "Took the next step in smart investing with DCA Agent 🚀",
                    `• Swap: ${result.data.agentResponse.amount} ${result.data.agentResponse.fromToken} → ${result.data.agentResponse.toToken}`,
                    "Automated,Protected by TriggerX & powered by Vibekit on Arbitrum.",
                    "",
                    "Set it. Forget it. Grow it. 🌿",
                    APP_URL
                  ]
                    // Filter out any empty lines and trim whitespace from each line, then join
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                ];
                const shareText = shareLines.join("\n");
                const automationMessage: ChatMessage = {
                  id: createMessageId("assistant"),
                  role: "assistant",
                  content: `🚀 **Automation Setup Complete!**\n\n✅ TriggerX Job ID: ${triggerXResult.jobId}\n📜 Script IPFS: ${triggerXResult.scriptIpfsUrl}\n\nYour DCA plan is now fully automated and will execute according to your schedule.`,
                  timestamp: new Date(),
                  shareText,
                };
                setMessages((prev) => [
                  ...prev.filter((msg) => !msg.isCreatingPlan).map((msg) =>
                    msg.confirmationId === `approve-${confirmationId}`
                      ? { ...msg, confirmationStatus: "completed" as const }
                      : msg
                  ),
                  automationMessage,
                ]);
              } else {
                console.error(
                  "❌ TriggerX job creation failed:",
                  triggerXResult.error
                );

                // Check if this is a balance error
                console.log('[ActionsTab] Checking error format:', triggerXResult.error);
                console.log('[ActionsTab] Is INSUFFICIENT_BALANCE?', triggerXResult.error?.startsWith('INSUFFICIENT_BALANCE:'));

                let errorContent = `⚠️ **Plan Created but Automation Failed**\n\nYour DCA plan was created successfully, but we couldn't set up automation:\n${triggerXResult.error}\n\nPlease try setting up automation again!`;
                let requiresDeposit = false;
                let depositAmount = '';

                if (triggerXResult.error && triggerXResult.error.includes("Failed to fetch job cost prediction")) {
                  errorContent = `⚠️ **Automation Setup Failed**\n\nWe couldn't estimate the gas costs for your automation job right now. This is likely a temporary network issue.\n\nPlease try creating your plan again.`;
                } else if (triggerXResult.error && triggerXResult.error.includes("Invalid response from /api/fees: missing total_fee")) {
                  errorContent = `⚠️ **Automation Setup Failed**\n\nWe received an invalid response when calculating fees. This might be a temporary server issue.\n\nPlease try creating your plan again.`;
                } else if (triggerXResult.error && triggerXResult.error.startsWith('INSUFFICIENT_BALANCE:')) {
                  const ethAmount = triggerXResult.error.split(':')[1];
                  console.log('[ActionsTab] Extracted ETH amount:', ethAmount);

                  // Fetch current balance to show to user
                  let currentBalance = "0";
                  try {
                    const balance = await checkTgBalanceForUser(address || "");
                    currentBalance = balance ? balance.data?.ethBalance || "0" : "0";
                  } catch (e) {
                    console.error("Failed to fetch balance", e);
                  }

                  if (ethAmount && ethAmount !== 'unknown') {
                    console.log('[ActionsTab] Displaying deposit message with amount:', ethAmount);
                    errorContent = `⚠️ **Automation Setup Failed**\n\nWe couldn't set up automation for your plan due to insufficient balance.\n\n💰 **Current Balance:** ${currentBalance} ETH\n💰 **Required Deposit:** ${ethAmount} ETH\n\n**Quick Deposit:**\nDeposit ETH below to fund your account. This balance will be used to cover transaction and network fees so you can successfully execute your plan. **After depositing, After depositing, please recreate the plan. .**`;
                    requiresDeposit = true;
                    depositAmount = ethAmount;
                  } else {
                    console.log('[ActionsTab] Amount unknown, showing generic balance message');
                    errorContent = `⚠️ **Automation Setup Failed**\n\nWe couldn't set up automation for your plan due to insufficient balance.\n\n💰 **Current Balance:** ${currentBalance} ETH\n\n**Quick Deposit:**\nDeposit ETH below to fund your account. This balance will be used to cover transaction and network fees so you can successfully execute your plan. **After depositing, After depositing, please recreate the plan. .**`;
                    requiresDeposit = true;
                    depositAmount = '';
                  }
                }

                // Add error message about automation failure
                const automationErrorMessageId = createMessageId("assistant");
                const automationErrorMessage: ChatMessage = {
                  id: automationErrorMessageId,
                  role: "assistant",
                  content: errorContent,
                  timestamp: new Date(),
                  requiresDeposit,
                  depositAmount,
                  messageIdForDeposit: automationErrorMessageId,
                };
                setMessages((prev) => [
                  ...prev.filter((msg) => !msg.isCreatingPlan).map((msg) =>
                    msg.confirmationId === `approve-${confirmationId}`
                      ? { ...msg, confirmationStatus: "completed" as const }
                      : msg
                  ),
                  automationErrorMessage,
                ]);
              }
            }
          } catch (triggerXError) {
            console.error("❌ TriggerX integration error:", triggerXError);

            // Add error message about automation failure
            const automationErrorMessage: ChatMessage = {
              id: createMessageId("assistant"),
              role: "assistant",
              content: `⚠️ **Plan Created but Automation Setup Failed**\n\nYour DCA plan was created successfully, but we encountered an error setting up automation:\n${triggerXError instanceof Error
                ? triggerXError.message
                : "Unknown error"
                }\n\nYou can manually execute swaps for now.`,
              timestamp: new Date(),
            };
            setMessages((prev) => [
              ...prev.filter((msg) => !msg.isCreatingPlan).map((msg) =>
                msg.confirmationId === `approve-${confirmationId}`
                  ? { ...msg, confirmationStatus: "completed" as const }
                  : msg
              ),
              automationErrorMessage,
            ]);
          }
        }

        // console.log("Actual response content:", result.response);

        if (result.success) {
          // Only show the backend success message if TriggerX succeeded
          // If TriggerX failed or was skipped, the appropriate error/warning message was already shown
          if (triggerXSuccess) {
            // TriggerX succeeded - success message already shown above with share button
            // No need to show additional confirmation message
            console.log(
              "[Plan Creation] TriggerX automation setup completed successfully"
            );
          } else if (triggerXSkipped) {
            // Wallet signer issue - warning message already shown above
            // No need to show additional confirmation message
            console.log(
              "[Plan Creation] Plan created but automation was skipped due to wallet connection"
            );
          } else {
            // TriggerX failed - error message already shown above
            // No need to show additional confirmation message
            console.log(
              "[Plan Creation] Plan created but automation setup failed"
            );
          }

          // Handle action response
          if (result.action) {
            handleChatAction(result.action, result.data);
          }
        } else {
          throw new Error(result.error || "Failed to create plan");
        }
      } catch (error) {
        console.error("Error creating plan:", error);

        // Remove loading messages
        setMessages((prev) => prev.filter((msg) => !msg.isCreatingPlan));

        const errorMessage: ChatMessage = {
          id: createMessageId("assistant"),
          role: "assistant",
          content:
            error instanceof Error &&
              error.message.includes("wallet connection")
              ? `❌ ${error.message}`
              : "❌ Sorry, I encountered an error while creating your plan. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsPlanCreationLoading(false);
        setIsApprovalLoading(false);
        setApprovalStatus("idle");
        setCurrentPlanData(null);
        setIsInPlanCreationFlow(false);
        setPendingConfirmationId(null);
        setConfirmationStep("summary");
      }
    },
    [address, handleChatAction, startPlanCreationSimulation, walletClient]
  );

  const startApprovalProcess = useCallback(
    async (confirmationId: string, planData: any) => {
      const tokenInfo = getTokenInfo(planData.fromToken);
      if (!tokenInfo) {
        console.error("Unsupported token:", planData.fromToken);
        return;
      }

      // console.log("Plan data", planData);

      // --- Helpers to normalize user-provided interval/duration into minutes ---
      function parseIntervalToMinutes(interval: any): number {
        const raw = interval ?? planData.interval ?? "";
        const s = String(raw).toLowerCase().trim();
        if (!s) return NaN;

        // More flexible regex that handles typos and optional spaces
        // Matches: "5 minutes", "5minutes", "5 minitus", "5minitus", etc.
        const match = s.match(/(\d+(?:\.\d+)?)\s*(minut\w*|hour\w*|day\w*|week\w*|month\w*)/i);
        if (match) {
          const value = parseFloat(match[1]);
          const unit = match[2].toLowerCase(); // Changed from match[3] to match[2] due to non-capturing group
          if (unit.startsWith("minut")) return value; // Handles minute, minutes, minitus, minitues, etc.
          if (unit.startsWith("hour")) return value * 60;
          if (unit.startsWith("day")) return value * 24 * 60;
          if (unit.startsWith("week")) return value * 7 * 24 * 60;
          if (unit.startsWith("month")) return value * 30 * 24 * 60;
        }

        if (s.includes("hour")) return 60;
        if (s.includes("day") || s.includes("daily")) return 24 * 60;
        if (s.includes("week") || s.includes("weekly")) return 7 * 24 * 60;
        if (s.includes("month") || s.includes("monthly")) return 30 * 24 * 60;

        const num = parseFloat(s);
        if (!isNaN(num) && num > 0) return num;

        return NaN;
      }

      function parseDurationToMinutes(duration: any): number {
        console.log("[parseDurationToMinutes] ✅ NEW VERSION LOADED - Using improved regex");
        const s = String(duration ?? planData.duration ?? "")
          .toLowerCase()
          .trim();

        console.log("[parseDurationToMinutes] Input string:", s);
        console.log("[parseDurationToMinutes] String length:", s.length);
        console.log("[parseDurationToMinutes] String charCodes:", Array.from(s).map(c => c.charCodeAt(0)));

        // More flexible regex that handles typos and optional spaces
        // Matches: "6 minutes", "6minutes", "6 minitues", "6minitues", etc.
        const m = s.match(/(\d+(?:\.\d+)?)\s*(minut\w*|hour\w*|day\w*|week\w*|month\w*)/i);
        console.log("[parseDurationToMinutes] Regex match:", m);
        
        // Try a simpler test
        const testMatch = s.match(/minut/i);
        console.log("[parseDurationToMinutes] Simple 'minut' test:", testMatch);
        
        if (m) {
          const value = parseFloat(m[1]);
          const unit = m[2].toLowerCase(); // Changed from m[3] to m[2] due to non-capturing group
          console.log("[parseDurationToMinutes] Parsed value:", value, "unit:", unit);
          if (unit.startsWith("minut")) return value; // Handles minute, minutes, minitues, minitus, etc.
          if (unit.startsWith("hour")) return value * 60;
          if (unit.startsWith("day")) return value * 24 * 60;
          if (unit.startsWith("week")) return value * 7 * 24 * 60;
          if (unit.startsWith("month")) return value * 30 * 24 * 60;
        }

        // keywords fallback - also handle common typos
        if (s.includes("day") || s.includes("daily")) return 24 * 60;
        if (s.includes("week") || s.includes("weekly")) return 7 * 24 * 60;
        if (s.includes("month") || s.includes("monthly")) return 30 * 24 * 60;
        if (s.includes("minut")) {
          const num = parseFloat(s);
          console.log("[parseDurationToMinutes] Fallback extraction:", num);
          return num || NaN;
        }

        console.log("[parseDurationToMinutes] No match found, returning NaN");
        return NaN;
      }

      try {
        const intervalMinutes = parseIntervalToMinutes(planData.interval);
        console.log("[Approval] intervalMinutes:", intervalMinutes);
        const durationMinutes = parseDurationToMinutes(planData.duration);
        console.log("[Approval] durationMinutes:", durationMinutes);
        const amountPerExecutionStr = String(planData.amount ?? "").trim();
        console.log("[Approval] amountPerExecutionStr:", amountPerExecutionStr);
        const decimals =
          typeof tokenInfo.decimals === "number" ? tokenInfo.decimals : 18;
        console.log("[Approval] decimals:", decimals);
        console.log("[Approval] Full planData:", planData);
        
        // Validate before proceeding
        if (
          !amountPerExecutionStr ||
          isNaN(Number(amountPerExecutionStr)) ||
          !Number.isFinite(intervalMinutes) ||
          !Number.isFinite(durationMinutes) ||
          intervalMinutes <= 0 ||
          durationMinutes <= 0
        ) {
          console.error("[Approval] Validation failed:", {
            amountPerExecutionStr,
            isAmountNaN: isNaN(Number(amountPerExecutionStr)),
            intervalMinutes,
            isIntervalFinite: Number.isFinite(intervalMinutes),
            durationMinutes,
            isDurationFinite: Number.isFinite(durationMinutes),
            fullPlanData: planData,
          });

          const errMsg: ChatMessage = {
            id: createMessageId("assistant"),
            role: "assistant",
            content:
              "❌ Invalid plan details for approval. Please review your amount, interval, and duration.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errMsg]);
          setIsApprovalLoading(false);
          setApprovalStatus("idle");
          return;
        }

        // Ensure we're on Arbitrum before proceeding
        if (chainId !== arbitrum.id) {
          const errorMessage: ChatMessage = {
            id: createMessageId("assistant"),
            role: "assistant",
            content: `❌ **Wrong Network**\n\nPlease switch to Arbitrum mainnet to approve tokens. Your current network is ${chainId === 1 ? "Ethereum" : "Unknown"}.\n\nPlease switch to Arbitrum and try again.`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          setApprovalStatus("idle");
          setIsApprovalLoading(false);
          return;
        }

        // Compute total executions
        const totalExecutions = Math.max(
          1,
          Math.floor(durationMinutes / intervalMinutes)
        );

        // Compute required approval amount for this job
        const amountWeiPerExec = parseUnits(amountPerExecutionStr, decimals);
        const requiredAmountWei = amountWeiPerExec * BigInt(totalExecutions);

        // Show initial approval request message
        const initialMessage: ChatMessage = {
          id: createMessageId("assistant"),
          role: "assistant",
          content: `🔐 **Checking Current Allowance**\n\nChecking existing token allowance and calculating total approval needed...\n\n• Amount per execution: ${amountPerExecutionStr} ${planData.fromToken}\n• Executions: ${totalExecutions}\n• Required for this job: ${requiredAmountWei.toString()} (wei)\n\n*Please wait...*`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, initialMessage]);

        setConfirmationStep("approval");
        setApprovalStatus("approving");
        setPendingConfirmationId(confirmationId);
        setIsApprovalLoading(true);

        // Fetch current allowance
        try {
          const allowanceResponse = await fetch('/api/check-allowance', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tokenAddress: tokenInfo.address,
              ownerAddress: address,
              spenderAddress: EXECUTOR_ADDRESS,
            }),
          });

          let currentAllowance = BigInt(0);
          if (allowanceResponse.ok) {
            const allowanceData = await allowanceResponse.json();
            currentAllowance = BigInt(allowanceData.allowance || '0');
          } else {
            console.warn('Failed to fetch allowance, proceeding with 0');
          }

          // Calculate total approval amount (current allowance + required amount)
          const totalApprovalAmount = currentAllowance + requiredAmountWei;

          console.log("[Approval] Allowance calculation:", {
            currentAllowance: currentAllowance.toString(),
            requiredAmount: requiredAmountWei.toString(),
            totalApproval: totalApprovalAmount.toString(),
          });

          // Update approval message with allowance info
          const updatedApprovalMessage: ChatMessage = {
            id: createMessageId("assistant"),
            role: "assistant",
            content: `🔐 **Requesting Token Approval**\n\nPlease approve spending of ${planData.fromToken} tokens so the contract can execute your plan automatically.\n\n• Amount per execution: ${amountPerExecutionStr} ${planData.fromToken}\n• Executions: ${totalExecutions}\n• Current allowance for previous executions: ${currentAllowance.toString()} (wei)\n• Required for this job: ${requiredAmountWei.toString()} (wei)\n• Total approval: ${totalApprovalAmount.toString()} (wei)\n\n*Check your wallet popup...*`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev.slice(0, -1), updatedApprovalMessage]);

          // Trigger wallet approval popup with total amount (current allowance + required)
          writeContract({
            address: tokenInfo.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [EXECUTOR_ADDRESS as `0x${string}`, totalApprovalAmount],
            chainId: arbitrum.id,
          });
        } catch (allowanceError) {
          console.error("Error fetching allowance:", allowanceError);

          // Fallback: proceed with just the required amount if allowance check fails
          const fallbackMessage: ChatMessage = {
            id: createMessageId("assistant"),
            role: "assistant",
            content: `🔐 **Requesting Token Approval**\n\nUnable to check current allowance, proceeding with required amount.\n\n• Amount per execution: ${amountPerExecutionStr} ${planData.fromToken}\n• Executions: ${totalExecutions}\n• Approval amount: ${requiredAmountWei.toString()} (wei)\n\n*Check your wallet popup...*`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev.slice(0, -1), fallbackMessage]);

          writeContract({
            address: tokenInfo.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [EXECUTOR_ADDRESS as `0x${string}`, requiredAmountWei],
            chainId: arbitrum.id,
          });
        }
      } catch (error) {
        console.error("Error starting approval process:", error);

        const errorMessage: ChatMessage = {
          id: createMessageId("assistant"),
          role: "assistant",
          content:
            "❌ Failed to start token approval process. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setApprovalStatus("idle");
      }
    },
    [writeContract, chainId, address]
  );

  // Handle the approve confirmation (after summary)
  const handleApproveConfirm = useCallback(
    async (confirmationId: string) => {
      const originalConfirmationId = confirmationId.replace("approve-", "");
      const confirmationMessage = messages.find(
        (msg) => msg.confirmationId === confirmationId
      );
      triggerHaptic();
      const planData = confirmationMessage?.confirmationData;

      // Update message status to 'proceeding'
      setMessages((prev) =>
        prev.map((msg) =>
          msg.confirmationId === confirmationId
            ? { ...msg, confirmationStatus: "proceeding" as const }
            : msg
        )
      );

      if (planData) {
        setIsApprovalLoading(true);
        try {
        await startApprovalProcess(originalConfirmationId, planData);
        } catch (error) {
          console.error("Error in handleApproveConfirm:", error);
          // Reset states on error
          setIsApprovalLoading(false);
          setApprovalStatus("idle");
          
          const errorMsg: ChatMessage = {
            id: createMessageId("assistant"),
            role: "assistant",
            content: "❌ Failed to process approval. Please try again.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } else {
        // No plan data found, reset loading state
        setIsApprovalLoading(false);
        console.error("No plan data found for confirmation:", confirmationId);
      }
    },
    [messages, startApprovalProcess]
  );

  const handleCancelPlan = useCallback(
    async (confirmationId: string) => {
      triggerHaptic();
      if (!confirmationId) return;

      // Update message status to 'cancelled'
      setMessages((prev) =>
        prev.map((msg) =>
          msg.confirmationId === confirmationId
            ? { ...msg, confirmationStatus: "cancelled" as const }
            : msg
        )
      );

      // Mark this confirmation as completed
      setCompletedConfirmations((prev) => new Set(prev).add(confirmationId));
      setIsPlanCreationLoading(true);

      try {
        // console.log("[Confirmation] Cancelling plan creation:", confirmationId);

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
        // console.log("Plan cancellation response:", result);

        if (result.success) {
          const cancellationMessage: ChatMessage = {
            id: createMessageId("assistant"),
            role: "assistant",
            content:
              result.response ||
              "✅ Action cancelled successfully. No DCA plan was created.",
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
          id: createMessageId("assistant"),
          role: "assistant",
          content: "✅ Action cancelled locally. No DCA plan was created.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsPlanCreationLoading(false);
        setIsApprovalLoading(false);
        setCurrentPlanData(null);
        setApprovalStatus("idle");
        setIsInPlanCreationFlow(false);
        setPendingConfirmationId(null);
        setConfirmationStep("summary");
      }
    },
    [address, handleChatAction]
  );

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

  const adjustInputHeight = useCallback(() => {
    const el = quickStartInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 140;
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${nextHeight}px`;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedPrefill = sessionStorage.getItem(QUICKSTART_PREFILL_KEY);
    if (storedPrefill) {
      sessionStorage.removeItem(QUICKSTART_PREFILL_KEY);
      setInputMessage(storedPrefill);
      setTimeout(() => {
        quickStartInputRef.current?.focus();
        adjustInputHeight();
        handleInputFocus();
      }, 50);
    }
  }, [handleInputFocus, adjustInputHeight]);

  const handleQuickCreateToken = useCallback(
    (symbol: string) => {
      const template = `Create a DCA plan with 10 USDC into ${symbol.toUpperCase()} every 24 hours for 10 days`;
      setInputMessage(template);
      setShowCreatePlanTokens(false);
      setTimeout(() => {
        quickStartInputRef.current?.focus();
        adjustInputHeight();
      }, 0);
    },
    [adjustInputHeight]
  );

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
   * Triggers haptic feedback with the selected intensity.
   *
   * This function calls the haptics.impactOccurred method with the current
   * selectedHapticIntensity setting. It handles errors gracefully by logging them.
   */

  // --- Render ---
  return (
    <div className="flex flex-col h-full overflow-hidden">
  

      {/* Chat Container */}
      <div className="flex-1 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 overflow-hidden flex flex-col">
        {/* Address pill */}
        <div className="flex-shrink-0 flex justify-end p-3 pb-2">
          <div className="px-3 py-1.5 rounded-full bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 border border-[#c199e4]/30 text-xs font-mono text-white/90 shadow-sm flex items-center gap-2">
            {context?.user?.pfpUrl ? (
              <img
                src={context.user.pfpUrl}
                alt="User Avatar"
                className="w-5 h-5 rounded-full object-cover border border-[#c199e4]"
                style={{ background: "#fff" }}
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-[#c199e4]/20 border border-[#c199e4] flex items-center justify-center">
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTvAyrN5PLmvXRRHsJOVxJZN1SRscvJQLL33Q&s"
                  alt="User Avatar"
                  className="w-5 h-5 rounded-full object-cover border border-[#c199e4]"
                  style={{ background: "#fff" }}
                />
              </div>
            )}
            {/* {address ? formatAddress(address) : "Not Connected"} */}
            {!isWalletConnected
              ? "Wallet Not Connected"
              : isWalletConnected && !address
                ? "Connecting..."
                : formatAddress(address as `0x${string}`)}
          </div>
        </div>

        {/* Chat Messages - Scrollable */}
        <div
          ref={messagesContainerRef}
          className="relative flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 space-y-3"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#c199e4 transparent",
          }}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-1.5 ${message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
            >
              {/* Avatar Icon */}
              <div
                className={`flex-shrink-0 size-6 rounded-full flex items-center justify-center ${message.role === "user"
                  ? "bg-gradient-to-br from-[#c199e4] to-[#b380db]"
                  : "bg-gradient-to-br from-white/20 to-white/10 border border-white/30"
                  }`}
              >
                {message.role === "user" ? (
                  <IoPersonCircle className="size-4 text-white" />
                ) : (
                  <RiRobot2Fill className="size-3.5 text-[#c199e4]" />
                )}
              </div>

              {/* Message Content */}
              <div
                className={`rounded-2xl px-3 py-3 ${message.role === "user"
                  ? "max-w-[75%] bg-gradient-to-br from-[#c199e4] to-[#b380db] text-white shadow-lg"
                  : "max-w-[85%] bg-gradient-to-br from-white/15 to-white/10 backdrop-blur-sm text-white border border-white/20"
                  }`}
              >
                <div className="text-sm leading-relaxed break-words overflow-wrap-anywhere">
                  {renderMarkdownText(message.content)}
                  {message.shareText && (
                    <div className="mt-3 flex justify-start">
                      <button
                        onClick={() =>
                          handleShareNow(message.shareText as string)
                        }
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
                      >
                        Share now
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                  {message.isCreatingPlan &&
                    (planSimulation ? (
                      <PlanCreationProgress
                        planSimulation={planSimulation}
                        microTicker={microTicker}
                      />
                    ) : (
                      <LoadingIndicator />
                    ))}
                </div>

                {/* Copy Transaction Hash Button */}
                {message.transactionHash && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(message.transactionHash!);
                        // Could add a toast notification here
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors break-all"
                    >
                      <svg
                        className="w-3 h-3 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                        />
                      </svg>
                      <span className="break-all">Copy Hash</span>
                    </button>
                  </div>
                )}

                {/* Confirmation Buttons */}
                {message.requiresConfirmation && message.confirmationId && (
                  <ConfirmationButtons
                    confirmationId={message.confirmationId}
                    confirmationStatus={message.confirmationStatus}
                    isPlanCreationLoading={isPlanCreationLoading}
                    isApprovalLoading={isApprovalLoading}
                    isApprovePending={isApprovePending}
                    isApprovalConfirming={isApprovalConfirming}
                    onApprove={(confirmationId) => {
                      if (confirmationId.startsWith("approve-")) {
                        handleApproveConfirm(confirmationId);
                              } else {
                        handleCancelPlan(confirmationId);
                      }
                    }}
                    onCancel={handleCancelPlan}
                  />
                  )}

                {/* Deposit UI */}
                {message.requiresDeposit && message.messageIdForDeposit && (
                  <DepositUI
                    messageIdForDeposit={message.messageIdForDeposit}
                    depositAmount={message.depositAmount}
                    depositAmounts={depositAmounts}
                    depositStatuses={depositStatuses}
                    isDepositLoading={isDepositLoading}
                    onDepositAmountChange={(messageId, amount) =>
                      setDepositAmounts((prev) => ({
                            ...prev,
                        [messageId]: amount,
                      }))
                    }
                    onDeposit={handleDeposit}
                  />
                )}


                <div
                  className={`text-xs mt-1 ${message.role === "user" ? "text-white/80" : "text-white/60"
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
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <span className="font-medium">Generating response…</span>
                  <div className="flex space-x-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#c199e4] animate-bounce" />
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-[#c199e4] animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="h-1.5 w-1.5 rounded-full bg-[#c199e4] animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Anchor to scroll to bottom */}
          <div ref={endOfMessagesRef} />

          {showScrollToLatest && (
            <div className="sticky bottom-3 flex justify-center pointer-events-none">
              <button
                onClick={handleJumpToLatest}
                className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#c199e4]/90 to-[#b380db]/90 text-white text-xs font-semibold shadow-lg border border-white/30"
              >
                Jump to latest
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
                    d="M12 5v14m0 0l-6-6m6 6l6-6"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Chat Input - Fixed at Bottom */}
        <div
          ref={inputContainerRef}
          className="flex-shrink-0 border-t border-white/20 px-4 py-2 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-lg"
        // style={{ paddingBottom: Math.max(12, 12 + safeBottom) }}
        >
          {/* Quick Action Buttons */}
          <QuickActionButtons
            showCreatePlanTokens={showCreatePlanTokens}
            onShowMyPlans={() => setInputMessage("Show my DCA plans")}
            onToggleCreatePlan={setShowCreatePlanTokens}
            onShowStats={() => setInputMessage("Platform statistics")}
            onShowHelp={() => setInputMessage("Help me understand DCA")}
            onQuickCreateToken={handleQuickCreateToken}
          />

          {/* Chat Input */}
          <ChatInput
            inputMessage={inputMessage}
            isWalletConnected={isWalletConnected}
            isConnected={isConnected}
            isLoading={isLoading}
            isApprovalLoading={isApprovalLoading}
            isApprovePending={isApprovePending}
            isApprovalConfirming={isApprovalConfirming}
            isPlanCreationLoading={isPlanCreationLoading}
            isInPlanCreationFlow={isInPlanCreationFlow}
            quickStartInputRef={quickStartInputRef}
            onInputChange={setInputMessage}
            onSendMessage={handleSendMessage}
            onInputFocus={handleInputFocus}
            onAdjustHeight={adjustInputHeight}
          />
        </div>
      </div>
    </div>
  );
}
