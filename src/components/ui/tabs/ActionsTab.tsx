"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMiniApp } from "@neynar/react";

import { type Haptics } from "@farcaster/miniapp-sdk";
import { APP_URL } from "~/lib/constants";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useWalletClient,
  useConnectors,
} from "wagmi";
import { maxUint256 } from "viem";
import { arbitrum } from "wagmi/chains";
import {
  ERC20_ABI,
  getTokenInfo,
  EXECUTOR_ADDRESS,
} from "../../../lib/tokenContracts";
import { useRouter } from "next/navigation";
import { IoPersonCircle } from "react-icons/io5";
import { RiRobot2Fill } from "react-icons/ri";
import { parseUnits } from "viem";
import sdk from "@farcaster/miniapp-sdk";
import { BrowserProvider, JsonRpcSigner } from "ethers";

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
  // Optional share content to enable a "Share now" button
  shareText?: string;
}

type StepStatus = "pending" | "active" | "complete";

interface PlanSimulationStep {
  id: string;
  label: string;
  description: string;
  weight: number;
}

interface PlanSimulationState {
  startedAt: number;
  progress: number;
  etaMs: number;
  activeStepIndex: number;
  stepStatuses: StepStatus[];
}

const PLAN_SIMULATION_DURATION_MS = 120000; // 2 minutes

const PLAN_SIMULATION_STEPS: PlanSimulationStep[] = [
  {
    id: "validate",
    label: "Validating strategy details",
    description: "Double-checking token amounts & frequency",
    weight: 0.18,
  },
  {
    id: "triggerx-shape",
    label: "Forming plan data for TriggerX",
    description: "Passing automation-ready details to TriggerX",
    weight: 0.16,
  },
  {
    id: "automation-config",
    label: "Configuring automation script content",
    description: "Defining the instructions TriggerX will execute",
    weight: 0.17,
  },
  {
    id: "plan-validation",
    label: "Checking plan data validation",
    description: "Re-running guards on interval, duration & totals",
    weight: 0.17,
  },
  {
    id: "tg-balance",
    label: "Checking TG balance (TriggerX)",
    description: "Ensuring TriggerX can execute your plan",
    weight: 0.16,
  },
  {
    id: "finalize",
    label: "Finalizing your plan",
    description: "Locking everything to execute on time",
    weight: 0.16,
  },
];

const formatFastEta = (etaMs: number, ticker = 0): string => {
  const totalMs = Math.max(0, Math.floor(etaMs));
  const minutes = Math.floor(totalMs / 60000)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor((totalMs % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  const centis = (ticker % 100).toString().padStart(2, "0");
  return `${minutes}:${seconds}:${centis}`;
};

const calculateStepState = (
  progress: number
): { activeIndex: number; statuses: StepStatus[] } => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  let cumulative = 0;
  let activeIndex = PLAN_SIMULATION_STEPS.length - 1;

  for (let i = 0; i < PLAN_SIMULATION_STEPS.length; i++) {
    cumulative += PLAN_SIMULATION_STEPS[i].weight;
    if (clampedProgress <= cumulative) {
      activeIndex = i;
      break;
    }
  }

  const statuses = PLAN_SIMULATION_STEPS.map((_, index) => {
    if (index < activeIndex) return "complete";
    if (index === activeIndex)
      return clampedProgress >= 1 ? "complete" : "active";
    return "pending";
  });

  return { activeIndex, statuses };
};

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

// Helper to format long text for mobile display
function formatLongText(text: string, maxLength = 20): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, 8)}...${text.slice(-6)}`;
}

const createMessageId = (prefix = "msg"): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function getEthersSigner(
  walletClient: any,
  connector: any
): Promise<JsonRpcSigner> {
  try {
    const isFarcasterConnector =
      connector?.id === "farcaster" || connector?.name === "Farcaster";

    // 1. Try Wagmi walletClient transport first (works for Farcaster and other connectors)
    if (
      walletClient &&
      walletClient.account?.address &&
      walletClient.transport
    ) {
      console.log(
        isFarcasterConnector
          ? "Detected Farcaster connector → trying Wagmi transport first"
          : "Using Wagmi walletClient transport path"
      );
      console.log("Wallet Client:", walletClient);
      console.log("Wallet Client chain ID:", walletClient?.chain?.id);

      const requestFn = (walletClient.transport as any).request;
      if (typeof requestFn === "function") {
        try {
          const eip1193Provider = {
            request: requestFn.bind(walletClient.transport),
          };

          const provider = walletClient.chain
            ? new BrowserProvider(eip1193Provider, walletClient.chain.id)
            : new BrowserProvider(eip1193Provider);

          console.log("Provider:", provider);

          const signer = await Promise.race([
            provider.getSigner(walletClient.account.address),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Wagmi signer timeout")), 30000)
            ),
          ]);

          console.log("Signer:", signer);

          const address = await signer.getAddress();
          try {
            const balance = await provider.getBalance(address);
            console.log(
              "Balance of signer (Wagmi transport):",
              balance.toString()
            );
          } catch (balanceErr) {
            console.warn("Could not fetch signer balance:", balanceErr);
          }
          console.log(
            isFarcasterConnector
              ? "✅ Signer obtained via Wagmi transport (Farcaster connector)"
              : "✅ Signer obtained via Wagmi transport",
            address
          );
          return signer;
        } catch (wagmiError) {
          console.warn("⚠️ Wagmi transport failed:", wagmiError);
          // If Farcaster connector and Wagmi transport failed, fall through to SDK provider
          if (!isFarcasterConnector) {
            throw wagmiError;
          }
        }
      }
    }

    // 2. Fallback: If Farcaster connector and Wagmi transport didn't work → use SDK provider
    if (isFarcasterConnector) {
      console.log(
        "Farcaster connector detected but Wagmi transport unavailable/unsuccessful → falling back to SDK provider"
      );
      const farcasterProvider = await sdk.wallet.getEthereumProvider();
      if (!farcasterProvider) {
        throw new Error("Farcaster SDK did not return a provider");
      }

      // Wrap with Ethers provider
      const provider = new BrowserProvider(farcasterProvider);
      const signer = await Promise.race([
        provider.getSigner(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Farcaster signer timeout")), 30000)
        ),
      ]);

      const address = await signer.getAddress();
      try {
        const balance = await provider.getBalance(address);
        console.log("Balance of signer (Farcaster SDK):", balance.toString());
      } catch (balanceErr) {
        console.warn("Could not fetch signer balance:", balanceErr);
      }
      console.log("✅ Signer obtained via Farcaster SDK (fallback):", address);
      return signer;
    }

    // 3. Fallback: window.ethereum
    if (typeof window !== "undefined" && (window as any).ethereum) {
      console.log("Falling back to window.ethereum provider");
      const provider = new BrowserProvider((window as any).ethereum as any);

      // Check accounts
      let accounts: string[] = [];
      try {
        accounts = (await Promise.race([
          provider.send("eth_accounts", []),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("eth_accounts timeout")), 8000)
          ),
        ])) as string[];
      } catch (err) {
        console.warn("eth_accounts call failed:", err);
        // We can attempt requestAccounts
      }

      if (!accounts || accounts.length === 0) {
        await Promise.race([
          provider.send("eth_requestAccounts", []),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("User did not connect wallet")),
              60000
            )
          ),
        ]);
      }

      const signer = await Promise.race([
        provider.getSigner(0),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("getSigner timeout")), 30000)
        ),
      ]);

      const address = await signer.getAddress();
      console.log("Signer obtained via window.ethereum:", address);
      return signer;
    }

    throw new Error("Could not obtain signer from any source");
  } catch (err) {
    console.error("getEthersSigner failure:", err);
    throw err;
  }
}

export function ActionsTab() {
  // --- Hooks ---
  const { notificationDetails, haptics, context } = useMiniApp();

  const { address, isConnected, connector } = useAccount();
  const { data: walletClient } = useWalletClient();

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
      content: `👋 **Hello!** I'm your DCA investment assistant.\n\n🎯 Create automated strategies\n📊 Track portfolio performance\n⚙️ Manage your plans\n\n Please ensure your DCA plan interval is set to a minimum of 1 hour. Make sure your plan follows this requirement for optimal automation.\n\n${
        isConnected
          ? `Wallet connected (${formatAddress(address || "")}) - ready to go!`
          : "Connect wallet to access all features."
      }\n\n**Quick start:** "Create a DCA plan with 0.1 USDC into WETH weekly for 1 month"`,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isApprovalLoading, setIsApprovalLoading] = useState(false); // Separate loading state for approval
  const [isPlanCreationLoading, setIsPlanCreationLoading] = useState(false); // Separate loading state for plan creation
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "error" | null
  >(null);

  // --- Layout/Refs for better UX ---
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputContainerRef = useRef<HTMLDivElement | null>(null);
  const [inputContainerHeight, setInputContainerHeight] = useState<number>(72);

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
  const [planSimulation, setPlanSimulation] =
    useState<PlanSimulationState | null>(null);
  const [microTicker, setMicroTicker] = useState(0);
  const [showScrollToLatest, setShowScrollToLatest] = useState(false);
  const messagesPinnedRef = useRef(true);

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

  // Render markdown text with basic formatting
  const renderMarkdownText = useCallback((text: string): React.ReactNode => {
    if (!text) return null;

    // Split by lines to handle line breaks
    const lines = text.split("\n");

    return lines.map((line, lineIndex) => {
      if (line.trim() === "") {
        return <br key={lineIndex} />;
      }

      // Handle bold text (**text**)
      const parts = line.split(/(\*\*.*?\*\*)/g);

      return (
        <span key={lineIndex} className="block break-words">
          {parts.map((part, partIndex) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              // Bold text
              const boldText = part.slice(2, -2);
              return (
                <strong key={partIndex} className="font-bold break-words">
                  {boldText}
                </strong>
              );
            }
            return (
              <span key={partIndex} className="break-words">
                {part}
              </span>
            );
          })}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      );
    });
  }, []);

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

  // Helper to detect if user is requesting plan creation
  const isPlanCreationRequest = useCallback((message: string): boolean => {
    const lowerMessage = message.toLowerCase();

    // Keywords that indicate plan creation intent
    const planCreationKeywords = [
      "create",
      "start",
      "set up",
      "begin",
      "initiate",
      "establish",
      "dca plan",
      "investment plan",
      "strategy",
      "automated",
      "buy",
      "invest",
      "purchase",
      "dollar cost average",
    ];

    // Check if message contains plan creation keywords
    const hasPlanKeywords = planCreationKeywords.some((keyword) =>
      lowerMessage.includes(keyword)
    );

    // Also check for specific tokens and amounts (indicating concrete plan)
    const hasTokenMentions = /(usdc|usdt|dai|eth|btc|arb|link|uni)\s+\d+/.test(
      lowerMessage
    );
    const hasAmountMentions =
      /\$\d+|\d+\s*(usdc|usdt|dai|eth|btc|arb|link|uni)/i.test(lowerMessage);

    // Check for frequency indicators
    const hasFrequencyIndicators =
      /(daily|weekly|monthly|hourly|every\s+\d+)/i.test(lowerMessage);

    // Check for duration indicators
    const hasDurationIndicators =
      /(for\s+\d+|over\s+\d+|weeks?|months?|days?)/i.test(lowerMessage);

    // Return true if we have plan keywords AND either specific details OR frequency/duration indicators
    return (
      hasPlanKeywords &&
      (hasTokenMentions ||
        hasAmountMentions ||
        hasFrequencyIndicators ||
        hasDurationIndicators)
    );
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

  const scrollToBottom = useCallback(
    (smooth = true) => {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
      } else {
        endOfMessagesRef.current?.scrollIntoView({
          behavior: smooth ? "smooth" : "auto",
          block: "end",
        });
      }
    },
    []
  );

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const threshold = 120;
    const isPinned = distanceFromBottom <= threshold;
    messagesPinnedRef.current = isPinned;
    setShowScrollToLatest(!isPinned);
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


  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", handleMessagesScroll, {
      passive: true,
    });
    handleMessagesScroll();
    return () => container.removeEventListener("scroll", handleMessagesScroll);
  }, [handleMessagesScroll]);

  useEffect(() => {
    if (messagesPinnedRef.current) {
      scrollToBottom(messages.length < 4);
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isLoading && messagesPinnedRef.current) {
      scrollToBottom(true);
    }
  }, [isLoading, scrollToBottom]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const handler = () => {
      if (messagesPinnedRef.current) {
        setTimeout(() => scrollToBottom(false), 60);
      }
    };
    window.visualViewport.addEventListener("resize", handler);
    return () => {
      window.visualViewport?.removeEventListener("resize", handler);
    };
  }, [scrollToBottom]);

  const handleJumpToLatest = useCallback(() => {
    messagesPinnedRef.current = true;
    scrollToBottom(true);
  }, [scrollToBottom]);

  useEffect(() => {
    // Update chat context when wallet connection changes
    if (isConnected && address) {
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
    } else if (!isConnected && connectionStatus === "connected") {
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
      isConnected &&
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
          fid: context?.user?.fid || 727291,
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
      setPendingConfirmationId(null);
      setIsApprovalLoading(false);

      // Check if it's a user rejection (MetaMask cancellation)
      const isUserRejection =
        approvalError.message.includes("User rejected") ||
        approvalError.message.includes("User denied") ||
        approvalError.message.includes("cancelled") ||
        approvalError.message.includes("rejected");

      const errorMessage: ChatMessage = {
        id: createMessageId("assistant"),
        role: "assistant",
        content: isUserRejection
          ? "❌ Token approval was cancelled. No plan was created.\n\nYou can try creating the plan again when you're ready."
          : `❌ Token approval failed: ${approvalError.message}\n\nYou need to approve token spending to create the DCA plan. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
      setCurrentPlanData(null);
      setIsInPlanCreationFlow(false);
      setConfirmationStep("summary");
    }
  }, [approvalError]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let finalizeTimeout: NodeJS.Timeout | null = null;

    if (isPlanCreationLoading) {
      const startedAt = Date.now();
      const initialState = calculateStepState(0);
      setPlanSimulation({
        startedAt,
        progress: 0,
        etaMs: PLAN_SIMULATION_DURATION_MS,
        activeStepIndex: initialState.activeIndex,
        stepStatuses: initialState.statuses,
      });

      interval = setInterval(() => {
        const elapsed = Date.now() - startedAt;
        const rawProgress = Math.min(
          elapsed / PLAN_SIMULATION_DURATION_MS,
          0.98
        );
        const etaMs = Math.max(PLAN_SIMULATION_DURATION_MS - elapsed, 0);
        const { activeIndex, statuses } = calculateStepState(rawProgress);

        setPlanSimulation((prev) =>
          prev
            ? {
                ...prev,
                progress: rawProgress,
                etaMs,
                activeStepIndex: activeIndex,
                stepStatuses: statuses,
              }
            : prev
        );
      }, 900);
    } else {
      setPlanSimulation((prev) =>
        prev
          ? {
              ...prev,
              progress: 1,
              etaMs: 0,
              activeStepIndex: PLAN_SIMULATION_STEPS.length - 1,
              stepStatuses: PLAN_SIMULATION_STEPS.map(() => "complete"),
            }
          : prev
      );
      finalizeTimeout = setTimeout(() => setPlanSimulation(null), 600);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (finalizeTimeout) clearTimeout(finalizeTimeout);
    };
  }, [isPlanCreationLoading]);

  useEffect(() => {
    let microInterval: NodeJS.Timeout | null = null;
    if (isPlanCreationLoading) {
      microInterval = setInterval(() => {
        setMicroTicker((prev) => (prev + Math.floor(Math.random() * 7) + 1) % 100);
      }, 40);
    } else {
      setMicroTicker(0);
    }
    return () => {
      if (microInterval) clearInterval(microInterval);
    };
  }, [isPlanCreationLoading]);

  const proceedWithPlanCreation = useCallback(
    async (confirmationId: string) => {
      try {
        console.log(
          "[Confirmation] Creating plan after approval:",
          confirmationId
        );

        setIsPlanCreationLoading(true);

        // Add loading message for plan creation
        const loadingMessage: ChatMessage = {
          id: createMessageId("assistant"),
          role: "assistant",
          content: "🪄 Creating your DCA plan...",
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
            fid: context?.user?.fid || 727291,
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

              console.log(
                "✅ Signer obtained successfully:",
                await ethersSigner.getAddress()
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
                ...prev.filter((msg) => !msg.isCreatingPlan),
                walletErrorMessage,
              ]);
            } else {
              // Signer obtained successfully, create TriggerX job
              // console.log("🚀 Creating TriggerX job for plan:", planId);
              // console.log("Agent response:", result.data.agentResponse);

              const triggerXResult = await createTriggerXJobForPlan({
                planId: result.data.agentResponse.id,
                userAddress: result.data.agentResponse.userAddress,
                fromToken: result.data.agentResponse.fromToken,
                toToken: result.data.agentResponse.toToken,
                amount: result.data.agentResponse.amount,
                intervalMinutes: result.data.agentResponse.intervalMinutes,
                durationWeeks: result.data.agentResponse.durationWeeks,
                slippage: result.data.agentResponse.slippage,
                signer: ethersSigner,
                fid: context?.user?.fid || 727291,
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
                  ...prev.filter((msg) => !msg.isCreatingPlan),
                  automationMessage,
                ]);
              } else {
                console.error(
                  "❌ TriggerX job creation failed:",
                  triggerXResult.error
                );

                // Add error message about automation failure
                const automationErrorMessage: ChatMessage = {
                  id: createMessageId("assistant"),
                  role: "assistant",
                  content: `⚠️ **Plan Created but Automation Failed**\n\nYour DCA plan was created successfully, but we couldn't set up automation:\n${triggerXResult.error}\n\nPlease try setting up automation again!`,
                  timestamp: new Date(),
                };
                setMessages((prev) => [
                  ...prev.filter((msg) => !msg.isCreatingPlan),
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
              content: `⚠️ **Plan Created but Automation Setup Failed**\n\nYour DCA plan was created successfully, but we encountered an error setting up automation:\n${
                triggerXError instanceof Error
                  ? triggerXError.message
                  : "Unknown error"
              }\n\nYou can manually execute swaps for now.`,
              timestamp: new Date(),
            };
            setMessages((prev) => [
              ...prev.filter((msg) => !msg.isCreatingPlan),
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
    [address, handleChatAction, walletClient, setMessages]
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
        const s = String(interval ?? planData.interval ?? "")
          .toLowerCase()
          .trim();

        // numeric value fallback
        const num = parseFloat(s);
        if (!isNaN(num) && num > 0) return num;

        if (s.includes("minute")) return num || 1; // default 1 min
        if (s.includes("hour")) return (num || 1) * 60;
        if (s.includes("day") || s.includes("daily"))
          return (num || 1) * 24 * 60;
        if (s.includes("week") || s.includes("weekly"))
          return (num || 1) * 7 * 24 * 60;
        if (s.includes("month") || s.includes("monthly"))
          return (num || 1) * 30 * 24 * 60;

        return NaN;
      }

      function parseDurationToMinutes(duration: any): number {
        const s = String(duration ?? planData.duration ?? "")
          .toLowerCase()
          .trim();

        const m = s.match(/(\d+(\.\d+)?)\s*(minute|hour|day|week|month)/i);
        if (m) {
          const value = parseFloat(m[1]);
          const unit = m[3].toLowerCase();
          if (unit.startsWith("minute")) return value;
          if (unit.startsWith("hour")) return value * 60;
          if (unit.startsWith("day")) return value * 24 * 60;
          if (unit.startsWith("week")) return value * 7 * 24 * 60;
          if (unit.startsWith("month")) return value * 30 * 24 * 60;
        }

        // keywords fallback
        if (s.includes("day") || s.includes("daily")) return 24 * 60;
        if (s.includes("week") || s.includes("weekly")) return 7 * 24 * 60;
        if (s.includes("month") || s.includes("monthly")) return 30 * 24 * 60;

        return NaN;
      }

      try {
        const intervalMinutes = parseIntervalToMinutes(planData.interval);
        // console.log("intervalMinutes", intervalMinutes);
        const durationMinutes = parseDurationToMinutes(planData.duration);
        // console.log("durationMinutes", durationMinutes);
        const amountPerExecutionStr = String(planData.amount ?? "").trim();
        // console.log("amountPerExecutionStr", amountPerExecutionStr);
        const decimals =
          typeof tokenInfo.decimals === "number" ? tokenInfo.decimals : 18;
        // console.log("decimals", decimals);
        // Validate before proceeding
        if (
          !amountPerExecutionStr ||
          isNaN(Number(amountPerExecutionStr)) ||
          !Number.isFinite(intervalMinutes) ||
          !Number.isFinite(durationMinutes) ||
          intervalMinutes <= 0 ||
          durationMinutes <= 0
        ) {
          console.error("Invalid planData for approval:", {
            amount: planData.amount,
            interval: planData.interval,
            duration: planData.duration,
          });

        const errMsg: ChatMessage = {
          id: createMessageId("assistant"),
            role: "assistant",
            content:
              "❌ Invalid plan details for approval. Please review your amount, interval, and duration.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errMsg]);
          return;
        }

        // Compute total executions
        const totalExecutions = Math.floor(durationMinutes / intervalMinutes);
        // console.log("totalExecutions", totalExecutions);
        // Compute approval amount
        const amountWeiPerExec = parseUnits(amountPerExecutionStr, decimals);
        const totalAmountWei = amountWeiPerExec * BigInt(totalExecutions);
        // console.log("totalAmountWei", totalAmountWei);
        // Show approval request message
        const approvalMessage: ChatMessage = {
          id: createMessageId("assistant"),
          role: "assistant",
          content: `🔐 **Requesting Token Approval**\n\nPlease approve spending of ${
            planData.fromToken
          } tokens so the contract can execute your plan automatically.\n\n• Amount per execution: ${amountPerExecutionStr} ${
            planData.fromToken
          }\n• Executions: ${totalExecutions}\n• Total approval: ${totalAmountWei.toString()} (wei)\n\n*Check your wallet popup...*`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, approvalMessage]);

        setConfirmationStep("approval");
        setApprovalStatus("approving");
        setPendingConfirmationId(confirmationId);
        setIsApprovalLoading(true);

        // console.log("[Approval] Starting token approval process:", {
        //   token: tokenInfo.symbol,
        //   amountPerExecution: amountPerExecutionStr,
        //   totalExecutions,
        //   decimals,
        //   totalAmountWei: totalAmountWei.toString(),
        // });

        // Trigger wallet approval popup with dynamic total amount
        writeContract({
          address: tokenInfo.address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [EXECUTOR_ADDRESS as `0x${string}`, totalAmountWei],
          chainId: arbitrum.id,
        });
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
    [writeContract]
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

      if (planData) {
        setIsApprovalLoading(true);
        await startApprovalProcess(originalConfirmationId, planData);
      }
    },
    [messages, startApprovalProcess]
  );

  const handleCancelPlan = useCallback(
    async (confirmationId: string) => {
      triggerHaptic();
      if (!confirmationId) return;

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
            {!isConnected
              ? "Wallet Not Connected"
              : isConnected && !address
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
              className={`flex items-start gap-1.5 ${
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`flex-shrink-0 size-6 rounded-full flex items-center justify-center ${
                  message.role === "user"
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
                className={`rounded-2xl px-3 py-3 ${
                  message.role === "user"
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
                      <div className="mt-3 space-y-4 rounded-2xl border border-white/15 bg-gradient-to-b from-black/50 to-black/10 p-4 shadow-[0_15px_40px_rgba(0,0,0,0.35)]">
                        <div className="flex items-center justify-between text-[13px] font-semibold text-white">
                          <span className="tracking-wide">
                            Step{" "}
                            <span className="text-[#c199e4]">
                              {planSimulation.activeStepIndex + 1}
                            </span>{" "}
                            of {PLAN_SIMULATION_STEPS.length}
                          </span>
                          <span className="text-sm font-bold text-[#c199e4]">
                            ETA {formatFastEta(planSimulation.etaMs, microTicker)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#c199e4] via-[#b380db] to-[#8c6fd5] transition-all duration-500"
                            style={{
                              width: `${Math.max(
                                planSimulation.progress * 100,
                                4
                              ).toFixed(1)}%`,
                            }}
                          />
                        </div>
                        <div className="space-y-3">
                          {PLAN_SIMULATION_STEPS.map((step, index) => {
                            const status =
                              planSimulation.stepStatuses[index] || "pending";
                            const statusClasses =
                              status === "complete"
                                ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                                : status === "active"
                                ? "border-[#c199e4] bg-[#c199e4]/10 text-white"
                                : "border-white/15 bg-white/5 text-white/50";

                            return (
                              <div
                                key={step.id}
                                className={`flex items-start gap-3 rounded-2xl border px-3 py-2 transition-colors ${statusClasses}`}
                              >
                                <span className="mt-0.5 flex size-6 items-center justify-center rounded-full border border-white/20 bg-black/30">
                                  {status === "complete" ? (
                                    <svg
                                      className="size-3.5"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  ) : status === "active" ? (
                                    <span className="size-2.5 rounded-full bg-current animate-ping" />
                                  ) : (
                                    <span className="size-1.5 rounded-full bg-current/60" />
                                  )}
                                </span>
                                <div className="flex-1">
                                  <div
                                    className={`text-sm font-semibold ${
                                      status === "pending"
                                        ? "text-white/70"
                                        : "text-white"
                                    }`}
                                  >
                                    {step.label}
                                  </div>
                                  <div className="text-[12px] text-white/70 leading-snug">
                                    {step.description}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-[12px] text-white/60">
                          Almost there,we&apos;re running deep checks so your
                          automation launches safely.
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex space-x-1">
                        <div className="h-2 w-2 animate-bounce rounded-full bg-[#c199e4]"></div>
                        <div
                          className="h-2 w-2 animate-bounce rounded-full bg-[#c199e4]"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="h-2 w-2 animate-bounce rounded-full bg-[#c199e4]"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
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
                {message.requiresConfirmation &&
                  message.confirmationId &&
                  !completedConfirmations.has(message.confirmationId) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => {
                            if (
                              message.confirmationId?.startsWith("approve-")
                            ) {
                              handleApproveConfirm(message.confirmationId);
                            } else {
                              // This case should ideally not be reached for plan creation requests
                              // but as a fallback, we can call handleConfirmPlan if it were still here
                              // For now, we'll just show the cancel button
                              handleCancelPlan(
                                message.confirmationId as string
                              );
                            }
                          }}
                          disabled={
                            isPlanCreationLoading ||
                            isApprovalLoading ||
                            isApprovePending ||
                            isApprovalConfirming
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          {isApprovePending || isApprovalConfirming ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              {isApprovePending
                                ? "Wallet Approval..."
                                : "Confirming Approval..."}
                            </>
                          ) : isApprovalLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              {message.confirmationId?.startsWith("approve-")
                                ? "Starting Approval..."
                                : "Creating Plan..."}
                            </>
                          ) : isPlanCreationLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              &apos;Processing...&apos;
                            </>
                          ) : (
                            <>
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
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              {message.confirmationId?.startsWith("approve-")
                                ? "Proceed with Approval"
                                : "Review Plan Details"}
                            </>
                          )}
                        </button>
                        <button
                          onClick={() =>
                            handleCancelPlan(message.confirmationId!)
                          }
                          disabled={
                            isPlanCreationLoading ||
                            isApprovalLoading ||
                            isApprovePending ||
                            isApprovalConfirming
                          }
                          className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                        >
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                <div
                  className={`text-xs mt-1 ${
                    message.role === "user" ? "text-white/80" : "text-white/60"
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
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              onClick={() => setInputMessage("Show my DCA plans")}
              className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
            >
              My Plans
            </button>
            <button
              onClick={() =>
                setInputMessage(
                  "Create a DCA plan with 0.1 USDC into WETH every 15 minutes for 1 hour"
                )
              }
              className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
            >
              Create Plan
            </button>
            <button
              onClick={() => setInputMessage("Platform statistics")}
              className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
            >
              Stats
            </button>
            <button
              onClick={() => setInputMessage("Help me understand DCA")}
              className="px-3 py-1.5 text-xs bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 text-white/90 border border-[#c199e4]/30 rounded-full hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 transition-all duration-300"
            >
              Help
            </button>
          </div>

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
                  const canSend =
                    isConnected &&
                    !isLoading &&
                    !isApprovalLoading &&
                    !isApprovePending &&
                    !isApprovalConfirming &&
                    !isPlanCreationLoading &&
                    inputMessage.trim().length > 0;
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canSend) handleSendMessage();
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
              disabled={
                !isConnected ||
                !inputMessage.trim() ||
                isLoading ||
                isApprovalLoading ||
                isApprovePending ||
                isApprovalConfirming ||
                isPlanCreationLoading
              }
              className="h-11 w-11 p-0 bg-gradient-to-br from-[#c199e4] to-[#b380db] hover:from-[#d9b3ed] hover:to-[#c199e4] disabled:from-white/20 disabled:to-white/10 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-300 flex items-center justify-center shadow-lg backdrop-blur-sm"
              aria-label="Send message"
            >
              {isLoading || isApprovalLoading || isPlanCreationLoading ? (
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
    </div>
  );
}
