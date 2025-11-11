"use client";

import { useAccount, useWalletClient } from "wagmi";
import { useMiniApp } from "@neynar/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  HiCurrencyDollar,
  HiOutlineCheck,
  HiOutlineClipboard,
} from "react-icons/hi2";
import { HiOutlineChartBar } from "react-icons/hi";
import { PiStrategyBold } from "react-icons/pi";
import { FaCircleUser } from "react-icons/fa6";
import {
  HiOutlineWallet,
  HiOutlineDocumentChartBar,
  HiOutlineCheckCircle,
  HiOutlineDevicePhoneMobile,
  HiOutlineXMark,
  HiOutlineBell,
} from "react-icons/hi2";
import { HiOutlineArrowNarrowRight } from "react-icons/hi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useRouter } from "next/navigation";
import {
  fetchUserDCAPlans,
  fetchPlatformStats,
  updatePlanStatus,
  deletePlan,
  updatePlanJobId,
  calculateTotalInvested,
  formatInterval,
  formatDuration,
  type DCAPlan,
  type PlatformStats,
  fetchJobSuccessCount,
} from "../../../lib/api";
import { computePlansInvestedUsd, calculateWalletTotalUsdValue } from "../../../lib/utils";
import { deleteTriggerXJobForPlan } from "../../../lib/triggerXIntegration";
import sdk, {
  AddMiniApp,
  ComposeCast,
  MiniAppNotificationDetails,
  SignIn as SignInCore,
  type Context,
} from "@farcaster/miniapp-sdk";

// Legacy interface for compatibility - will be replaced with DCAPlan
/**
 * HomeTab component displays the main landing content for the mini app.
 *
 * This is the default tab that users see when they first open the mini app.
 * It provides a user greeting, active investment plans, and USDC balance.
 *
 * @example
 * ```tsx
 * <HomeTab />
 * ```
 */

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeTab() {
  const { address, isConnected } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();
  const {
    // context,
    setActiveTab,
    // notificationDetails,
    // added,
    // isSDKLoaded,
    /* actions available in SDK */ actions,
  } = useMiniApp() as any;
  const router = useRouter();

  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [context, setContext] = useState<Context.MiniAppContext>();
  const [notificationDetails, setNotificationDetails] =
    useState<MiniAppNotificationDetails | null>(null);

  // Track latest notificationDetails as it may populate shortly after addMiniApp
  const latestNotifDetailsRef = useRef(notificationDetails);
  useEffect(() => {
    latestNotifDetailsRef.current = notificationDetails;
  }, [notificationDetails]);

  const [added, setAdded] = useState(false);
  const [lastEvent, setLastEvent] = useState("");
  const [addFrameResult, setAddFrameResult] = useState("");

  const waitForNotificationDetails = useCallback(
    async (timeoutMs = 5000, intervalMs = 200) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (latestNotifDetailsRef.current) return latestNotifDetailsRef.current;
        await new Promise((r) => setTimeout(r, intervalMs));
      }
      return null;
    },
    []
  );

  // Dynamic data state
  const [userPlans, setUserPlans] = useState<DCAPlan[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [totalInvested, setTotalInvested] = useState(0);
  const [portfolioUsd, setPortfolioUsd] = useState<number | null>(null);
  const [walletTotalUsd, setWalletTotalUsd] = useState<number | null>(null);
  const [isWalletValueLoading, setIsWalletValueLoading] = useState(false);

  // Modal state
  const [selectedPlan, setSelectedPlan] = useState<DCAPlan | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  //Plan status state
  const [isDeleting, setIsDeleting] = useState(false);

  // Slider state
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);

  // Success count state
   const [successCount, setSuccessCount] = useState<number>(0);

  // Notification state
  const [hasNotifications, setHasNotifications] = useState(false);

  // Onboarding state
  const [onboardingSteps, setOnboardingSteps] = useState([
    {
      step: 1,
      title: "Connect Wallet",
      description: "Link your wallet to get started",
      action: "Next",
      icon: <HiOutlineWallet className="w-6 h-6 text-[#c199e4]" />,
      completed: false,
    },
    {
      step: 2,
      title: "Create DCA Plan",
      description: "Tell us what you want to invest",
      action: "Next",
      icon: <HiOutlineDocumentChartBar className="w-6 h-6 text-[#c199e4]" />,
      completed: false,
    },
    {
      step: 3,
      title: "Review & Approve",
      description: "Confirm your investment strategy",
      action: "Next",
      icon: <HiOutlineCheckCircle className="w-6 h-6 text-[#c199e4]" />,
      completed: false,
    },
    {
      step: 4,
      title: "Track Progress",
      description: "Monitor your automated investments",
      action: "Got it",
      icon: <HiOutlineDevicePhoneMobile className="w-6 h-6 text-[#c199e4]" />,
      completed: false,
    },
  ]);

  // Control whether to show the notification enable UI
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [notificationsEnabledBadge, setNotificationsEnabledBadge] =
    useState(false);
  const autoRequestRef = useRef(false);
  const [isNotificationResolving, setIsNotificationResolving] = useState(true);

  // Keep live refs to SDK notification state so we can poll after user confirms
  const addedRef = useRef(added);
  const detailsRef = useRef(notificationDetails);
  useEffect(() => {
    addedRef.current = added;
  }, [added]);
  useEffect(() => {
    detailsRef.current = notificationDetails;
  }, [notificationDetails]);

  // Check notification status when SDK is ready
  useEffect(() => {
    if (!isSDKLoaded) {
      setIsNotificationResolving(true);
      return;
    }
    const enabledNow = !!(added && notificationDetails);
    setShowNotificationPrompt(!enabledNow);
    setNotificationsEnabledBadge(enabledNow);
    setIsNotificationResolving(false);
    // If user disabled/removed app later, allow auto-request again
    if (!enabledNow) {
      autoRequestRef.current = false;
    }
  }, [isSDKLoaded, added, notificationDetails]);

  // Auto-request addMiniApp on mount when in miniapp and not enabled yet
  useEffect(() => {
    if (!isSDKLoaded) return;
    if (autoRequestRef.current) return;
    // Skip if already enabled
    if (added && notificationDetails) return;
    // Trigger once per disabled stint
    autoRequestRef.current = true;
    (async () => {
      try {
        setIsNotificationResolving(true);
        if ((await sdk.context).client.added) {
          console.log("frame added to client.");
        } else {
          await addFrame();
        }
        setIsNotificationResolving(false);
      } catch (err) {
        console.log("Error auto-adding mini app:", err);
        setIsNotificationResolving(false);
      }
    })();
  }, [isSDKLoaded, added, notificationDetails, added, context?.user?.fid]);

  useEffect(() => {
    const load = async () => {
      const context = await sdk.context;
      setContext(context);
      setAdded(context.client.added);

      sdk.on("miniAppAdded", ({ notificationDetails }) => {
        setLastEvent(
          `miniAppAdded${
            !!notificationDetails ? ", notifications enabled" : ""
          }`
        );
        setAdded(true);
        console.log("Mini app added!");
        if (notificationDetails) {
          setNotificationDetails(notificationDetails);
        }
      });

      sdk.on("miniAppAddRejected", ({ reason }) => {
        setLastEvent(`miniAppAddRejected, reason ${reason}`);
      });

      sdk.on("miniAppRemoved", () => {
        setLastEvent("miniAppRemoved");
        setAdded(false);
        // console.log(
        //   "Call API endpoint to update Isnotification:false and null on the Notificationtoken! when user removes our mini app"
        // );
        setNotificationDetails(null);
      });

      sdk.on("notificationsEnabled", ({ notificationDetails }) => {
        setLastEvent("notificationsEnabled");
        setNotificationDetails(notificationDetails);
      });
      sdk.on("notificationsDisabled", () => {
        setLastEvent("notificationsDisabled");
        setNotificationDetails(null);
        // console.log(
        //   "Call API endpoint to update Isnotification:false and null on the Notificationtoken! when user disabled our mini app"
        // );
      });

      sdk.on("primaryButtonClicked", () => {
        console.log("primaryButtonClicked");
      });

      const ethereumProvider = await sdk.wallet.getEthereumProvider();
      ethereumProvider?.on("chainChanged", (chainId) => {
        // console.log("[ethereumProvider] chainChanged", chainId);
      });
      ethereumProvider?.on("connect", (connectInfo) => {
        console.log("[ethereumProvider] connect", connectInfo);
      });

      sdk.actions.ready({});
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
      return () => {
        sdk.removeAllListeners();
      };
    }
  }, [isSDKLoaded]);

  const addFrame = useCallback(async () => {
    try {
      setNotificationDetails(null);
      const result = await sdk.actions.addFrame();

      if (result.notificationDetails) {
        setNotificationDetails(result.notificationDetails);
      }
      // console.log(
      //   "Result of notification:",
      //   result.notificationDetails?.token,
      //   result.notificationDetails?.url
      // );
      setAddFrameResult(
        result.notificationDetails
          ? `Added, got notificaton token ${result.notificationDetails.token} and url ${result.notificationDetails.url}`
          : "Added, got no notification details"
      );
      if (result.notificationDetails) {
        // Prefer sending immediately with known fid and details
        const ctx = await sdk.context;
        const fidCandidate = ctx.user?.fid;
        const fid =
          typeof fidCandidate === "string"
            ? Number(fidCandidate)
            : fidCandidate;
        if (typeof fid === "number" && !Number.isNaN(fid)) {
          await handleNotification(fid as number, result.notificationDetails);
        }
      } else {
        console.log("User added mini app without enabling notifications.");
      }
    } catch (error) {
      if (error instanceof AddMiniApp.RejectedByUser) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      if (error instanceof AddMiniApp.InvalidDomainManifest) {
        setAddFrameResult(`Not added: ${error.message}`);
      }

      setAddFrameResult(`Error: ${error}`);
    }
  }, []);

    const handleNotification = async (fidParam?: number, detailsParam?: MiniAppNotificationDetails | null) => {
    // rely solely on SDK/context values if params not provided

    try {
      setIsNotificationResolving(true);

      // Resolve fid and details
      const ctx = await sdk.context;
      const fid = ctx.user?.fid;
      const details = detailsParam ?? notificationDetails ?? null;
      if (!fid) {
        // console.log("No fid available to send notification.");
        setIsNotificationResolving(false);
        return;
      }

      // console.log("Sending notification to fid:", fid);
      const response = await fetch("/api/send-notification", {
        method: "POST",
        mode: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid,
          notificationDetails: details,
          title: "Welcome to DCA Agent 🥳",
          body: "We'll keep you updated on your plan performance.🔔",
        }),
      });
      await response.json().catch(() => null);
      setShowNotificationPrompt(false);
      setNotificationsEnabledBadge(true);
      setIsNotificationResolving(false);
    } catch (err) {
      console.log("Error enabling notifications:", err);
      setIsNotificationResolving(false);
    }
  };

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [stepAnimation, setStepAnimation] = useState<"enter" | "exit" | "idle">(
    "idle"
  );
  const [showStepCelebration, setShowStepCelebration] = useState(false);
  const [completedStepIndex, setCompletedStepIndex] = useState<number | null>(
    null
  );
  const [isAutoAdvancing, setIsAutoAdvancing] = useState(false);
  const [notificationState, setNotificationState] = useState({
    sendStatus: "",
    shareUrlCopied: false,
    isEnabling: false,
  });
  const [showFinalBanner, setShowFinalBanner] = useState(false);

  // Derive notifications availability defensively (covers browser vs client)
  // const hasNotificationsDerived =
  //   !!notificationDetails || !!context?.notificationDetails || !!added;

  useEffect(() => {
    if (!isSDKLoaded) return;

    // Check if the mini app is already added
    if (added) {
      console.log("Mini app has been added.");

      // Check if notifications are enabled
      if (notificationDetails) {
        // console.log("Notifications are enabled.");
        // console.log("Notification token:", notificationDetails.token);
        // console.log("Notification URL:", notificationDetails.url);
        setHasNotifications(true);
      } else {
        console.log("Notifications are NOT enabled.");
      }
    } else {
      console.log("Mini app is NOT added yet.");
    }
  }, [isSDKLoaded, added, notificationDetails]);

  // Fetch user data when address changes
  const fetchUserData = useCallback(async () => {
    if (!address) {
      setUserPlans([]);
      setTotalInvested(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [plans, stats] = await Promise.all([
        fetchUserDCAPlans(address),
        fetchPlatformStats(),
      ]);

      setUserPlans(plans);
      setPlatformStats(stats);
      const totalInvested = calculateTotalInvested(plans);
      setTotalInvested(calculateTotalInvested(plans));
      // Compute USD value across plans using CoinGecko
      try {
        // console.log('plans in computePlansInvestedUsd', plans);
        const usd = await computePlansInvestedUsd(
          plans.map((p) => ({
            userAddress: p.userAddress,
            fromToken: p.fromToken,
            amount: p.amount,
            jobId: p.jobId,
          }))
        );
        setPortfolioUsd(usd);
      } catch (e) {
        setPortfolioUsd(null);
      }

      // Reset current plan index if we have fewer plans now
      if (plans.length > 0 && currentPlanIndex >= plans.length) {
        setCurrentPlanIndex(0);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [address, currentPlanIndex]);

  // Fetch data on mount and address change
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Fetch wallet total USD value using Alchemy API
  useEffect(() => {
    if (!address) {
      setWalletTotalUsd(null);
      setIsWalletValueLoading(false);
      return;
    }

    let cancelled = false;
    setIsWalletValueLoading(true);

    const loadWalletValue = async () => {
      try {
        const totalUsd = await calculateWalletTotalUsdValue(address);
        if (!cancelled) {
          setWalletTotalUsd(totalUsd);
        }
      } catch (error) {
        console.error("Error loading wallet value:", error);
        if (!cancelled) {
          setWalletTotalUsd(null);
        }
      } finally {
        if (!cancelled) {
          setIsWalletValueLoading(false);
        }
      }
    };

    loadWalletValue();

    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const completed = window.localStorage.getItem("dca_onboarding_completed");
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("dca_onboarding_completed", "true");
    }
    setShowOnboarding(false);
  };

  const closeOnboarding = () => {
    if (dontShowAgain && typeof window !== "undefined") {
      window.localStorage.setItem("dca_onboarding_completed", "true");
    }
    setShowOnboarding(false);
  };

  const goNext = () => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    setStepAnimation("exit");

    // Show celebration for completed step
    if (currentStepIndex < onboardingSteps.length - 1) {
      setCompletedStepIndex(currentStepIndex);
      setShowStepCelebration(true);

      setTimeout(() => {
        setShowStepCelebration(false);
        setCompletedStepIndex(null);
      }, 1500);
    }

    setTimeout(() => {
      if (currentStepIndex < onboardingSteps.length - 1) {
        // Mark current step as completed
        setOnboardingSteps((prev) =>
          prev.map((step, idx) =>
            idx === currentStepIndex ? { ...step, completed: true } : step
          )
        );

        setCurrentStepIndex((i) => i + 1);
        setStepAnimation("enter");

        setTimeout(() => {
          setStepAnimation("idle");
          setIsTransitioning(false);
        }, 300);
      } else {
        completeOnboarding();
      }
    }, 200);
  };

  const goPrev = () => {
    if (isTransitioning || currentStepIndex === 0) return;

    setIsTransitioning(true);
    setStepAnimation("exit");

    setTimeout(() => {
      setCurrentStepIndex((i) => i - 1);
      setStepAnimation("enter");

      setTimeout(() => {
        setStepAnimation("idle");
        setIsTransitioning(false);
      }, 300);
    }, 200);
  };

  const handleCopyPlanId = () => {
    if (selectedPlan?.jobId) {
      navigator.clipboard.writeText(selectedPlan.jobId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  // Calculate active and paused plans from real data
  const activePlans = userPlans.filter((plan) => plan.status === "ACTIVE");

  // Plan actions with real API calls
  const handleDeletePlan = async (plan: DCAPlan) => {
    try {
      setIsDeleting(true);

      // First, delete the TriggerX job if it exists
      if (plan.jobId) {
        // console.log("🗑️ Deleting TriggerX job:", plan.jobId);
        // Obtain ethers signer (prefer Wagmi transport, fallback to window.ethereum)
        let signer: any = null;
        try {
          const { BrowserProvider } = await import("ethers");

          if (
            wagmiWalletClient?.transport &&
            (wagmiWalletClient.transport as any).request
          ) {
            // console.log(
            //   "Using Wagmi transport to create provider for deletion"
            // );
            const provider: any = new BrowserProvider(
              wagmiWalletClient.transport as any
            );
            const addr = wagmiWalletClient?.account?.address;
            signer = addr
              ? await provider.getSigner(addr)
              : await provider.getSigner();
          } else if (
            typeof window !== "undefined" &&
            (window as any).ethereum
          ) {
            console.log(
              "Using window.ethereum to create provider for deletion"
            );
            const provider = new BrowserProvider((window as any).ethereum);
            // Ensure at least one account is available
            try {
              const accounts = await provider.send("eth_accounts", []);
              if (!accounts || accounts.length === 0) {
                await provider.send("eth_requestAccounts", []);
              }
            } catch {}
            signer = await provider.getSigner();
          } else {
            console.warn(
              "No wallet provider available to obtain signer for deletion"
            );
          }
        } catch (e) {
          console.error("Failed to create signer for deletion:", e);
        }

        if (!signer) {
          console.error(
            "❌ Could not obtain signer; aborting TriggerX job deletion"
          );
          setIsDeleting(false);
          return;
        }
        // console.log("Signer obtained for deletion:", signer);

        // Use Arbitrum chainId by default
        const deleteJobResult = await deleteTriggerXJobForPlan(
          plan.jobId,
          signer,
          "42161"
        );

        console.log("Delete job result:", deleteJobResult);

        // Explicitly check for user rejection - don't update backend if user cancelled
        if (deleteJobResult.error === 'user_rejected') {
          console.log("ℹ️ User cancelled job deletion");
          setIsDeleting(false);
          return; // Exit early, don't update backend
        }

        if (deleteJobResult.success === true) {
          // console.log("✅ TriggerX job deleted successfully");

          // Update the plan's jobId to null in the backend
          const updateSuccess = await updatePlanJobId(
            plan.userAddress,
            plan.jobId
          );
          if (updateSuccess) {
            // console.log("✅ Plan jobId updated to null successfully");
            await fetchUserData(); // Refresh data
            setShowPlanModal(false); // Close modal
            setIsDeleting(false);
          } else {
            console.error("❌ Failed to update plan jobId to null");
            setIsDeleting(false);
          }
        } else {
          console.error(
            "❌ Failed to delete TriggerX job:",
            deleteJobResult.error
          );
          setIsDeleting(false);
        }
      } else {
        console.log("⚠️ No jobId found for plan, skipping TriggerX deletion");
        setIsDeleting(false);
      }
    } catch (error) {
      setIsDeleting(false);
      console.error("❌ Error deleting plan:", error);
    }
  };

  const openPlanModal = (plan: DCAPlan) => {
    setSelectedPlan(plan);
    setShowPlanModal(true);
  };

  const closePlanModal = () => {
    setShowPlanModal(false);
    setSelectedPlan(null);
  };

  // Slider navigation functions
  const goToNextPlan = () => {
    setCurrentPlanIndex((prev) =>
      prev === userPlans.length - 1 ? 0 : prev + 1
    );
  };

  const goToPrevPlan = () => {
    setCurrentPlanIndex((prev) =>
      prev === 0 ? userPlans.length - 1 : prev - 1
    );
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        goToPrevPlan();
      } else if (event.key === "ArrowRight") {
        goToNextPlan();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const userGreeting = `${getTimeGreeting()}, ${context?.user?.username} 👋`;
  const walletBalanceDisplay =
    walletTotalUsd !== null
      ? `$${walletTotalUsd.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : isWalletValueLoading
      ? "..."
      : "$0.00";

  const step = onboardingSteps[currentStepIndex];

  return (
    <div className="flex flex-col h-full py-3 px-2 space-y-6 overflow-y-auto">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeOnboarding}
          />

          {/* Step Transition Overlay */}
          {isTransitioning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-[#c199e4]/30 shadow-2xl"
              >
                <div className="text-center space-y-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-12 h-12 border-4 border-[#c199e4]/30 border-t-[#c199e4] rounded-full mx-auto"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      {stepAnimation === "exit"
                        ? "Moving to next step..."
                        : "Loading step..."}
                    </h3>
                    <p className="text-sm text-white/70">
                      Step {currentStepIndex + 1} of {onboardingSteps.length}
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Final Success Banner Overlay (after 'Okay, got it') */}
          {showFinalBanner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.55 }}
                className="bg-gradient-to-br from-emerald-500/15 to-emerald-400/10 border border-emerald-400/40 rounded-3xl shadow-2xl p-6 text-center max-w-sm w-full mx-4"
              >
                <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-emerald-400/30 border border-emerald-300/50 flex items-center justify-center">
                  <motion.svg
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-8 h-8 text-emerald-300"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </motion.svg>
                </div>
                <h3 className="text-white text-lg font-bold">All set now — let&apos;s go!</h3>
                <p className="text-white/80 text-sm mt-1">
                  Start your investment journey with DCA Agent.
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* Step Completion Celebration */}
          {showStepCelebration && completedStepIndex !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 pointer-events-none"
            >
              {/* Confetti particles */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    opacity: 0,
                    scale: 0,
                    x: Math.random() * 400 - 200,
                    y: Math.random() * 400 - 200,
                  }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: Math.random() * 600 - 300,
                    y: Math.random() * 600 - 300,
                    rotate: Math.random() * 360,
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.1,
                    ease: "easeOut",
                  }}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: [
                      "#c199e4",
                      "#10b981",
                      "#f59e0b",
                      "#ef4444",
                    ][i % 4],
                    left: "50%",
                    top: "50%",
                  }}
                />
              ))}

              {/* Success message */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="absolute top-1/2 left-1/2"
              >
                <div className="bg-green-500/90 backdrop-blur-lg rounded-2xl p-4 border border-green-400/50 shadow-2xl">
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.5, type: "spring" }}
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center"
                    >
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </motion.div>
                    <div>
                      <h4 className="text-white font-bold text-sm">
                        Step {completedStepIndex + 1} Completed!
                      </h4>
                      <p className="text-white/90 text-xs">
                        Great job! Moving to next step...
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-md mx-auto bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl shadow-2xl border border-[#c199e4]/20 max-h-[65vh] overflow-y-auto -top-[40px]"
          >
            <div className="p-6 space-y-4">
              {/* Header */}
              <motion.div
                key={`header-${currentStepIndex}`}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex items-start justify-between"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    key={`icon-${currentStepIndex}`}
                    initial={{ scale: 0.8, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      duration: 0.5,
                      type: "spring",
                      stiffness: 200,
                    }}
                    className="w-12 h-12 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center group-hover:from-[#c199e4]/30 group-hover:to-[#c199e4]/20 transition-all duration-300 border border-[#c199e4]/20 group-hover:scale-110"
                    aria-hidden
                  >
                    {step.icon}
                  </motion.div>
                  <div>
                    <motion.h3
                      key={`title-${currentStepIndex}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="text-xl font-bold text-[#c199e4] transition-colors duration-300"
                    >
                      {step.title}
                    </motion.h3>
                    <motion.p
                      key={`desc-${currentStepIndex}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                      className="text-sm text-white/70"
                    >
                      {step.description}
                    </motion.p>
                  </div>
                </div>
                <button
                  onClick={closeOnboarding}
                  className="text-white/70 hover:text-white transition-colors duration-200 p-2 hover:bg-white/10 rounded-xl"
                >
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </motion.div>

              {/* Success Banner */}
              {/* <motion.div
                key={`success-banner-${currentStepIndex}`}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.35 }}
                className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-400/30 rounded-2xl p-3"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-7 h-7 rounded-full bg-emerald-400/30 flex items-center justify-center border border-emerald-300/40"
                >
                  <svg className="w-4 h-4 text-emerald-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </motion.div>
                <div>
                  <p className="text-sm font-semibold text-white">All set now — let&apos;s go!</p>
                  <p className="text-xs text-white/70">You can explore the app anytime.</p>
                </div>
              </motion.div> */}

              {/* Step Indicators */}
              {/* <motion.div
                key={`indicators-${currentStepIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                className="flex items-center justify-center gap-2"
              >
                {onboardingSteps.map((s, idx) => (
                  <div key={s.step} className="flex items-center">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{
                        scale: idx === currentStepIndex ? 1.2 : 1,
                        backgroundColor:
                          idx === currentStepIndex
                            ? "#c199e4"
                            : idx < currentStepIndex
                            ? "#10b981"
                            : "#6b7280",
                      }}
                      transition={{ duration: 0.3, type: "spring" }}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        idx === currentStepIndex
                          ? "ring-2 ring-[#c199e4]/50"
                          : ""
                      }`}
                    />
                    {idx < onboardingSteps.length - 1 && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: idx < currentStepIndex ? 1 : 0.3 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className={`w-8 h-0.5 mx-2 rounded-full ${
                          idx < currentStepIndex
                            ? "bg-green-400"
                            : "bg-gray-600"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </motion.div> */}

              {/* Quick Start Guide */}
              <motion.div
                key={`guide-${currentStepIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                className="rounded-2xl p-4 border border-[#c199e4]/20"
              >
                <p className="text-sm text-gray-300 font-medium mb-2">
                  Quick Start Guide
                </p>
                <div className="backdrop-blur-lg rounded-xl p-3 border border-[#c199e4]/20">
                  <p className="text-sm text-gray-100 font-medium">
                    Connect your wallet and tell us:
                  </p>
                  <p className="text-sm text-gray-200 mt-1 italic">
                    &ldquo;I want create a DCA plan with [amount] [fromtoken] to
                    [totoken] every [interval] for [duration]&rdquo;
                  </p>
                </div>
              </motion.div>

              {/* Enhanced Steps Grid */}
              <motion.div
                key={`steps-grid-${currentStepIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.7 }}
                className="grid grid-cols-2 gap-2"
              >
                {onboardingSteps.map((s, idx) => (
                  <motion.div
                    key={s.step}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 * idx }}
                    className="backdrop-blur-lg rounded-2xl p-3 border transition-all duration-300 group relative overflow-hidden border-[#c199e4]/50 shadow-lg ring-2 ring-[#c199e4]/30"
                  >
                    {/* Completion indicator */}
                    {idx < currentStepIndex && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="absolute top-2 right-2 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center"
                      >
                        <svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </motion.div>
                    )}

                    {/* Current step indicator */}
                    {idx === currentStepIndex && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center"
                      >
                        {/* <motion.div
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [1, 0.7, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          className="w-2 h-2 bg-white rounded-full"
                        /> */}
                        {/* <motion.div
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.3, 0, 0.3],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.5,
                          }}
                          className="absolute inset-0 bg-[#c199e4] rounded-full"
                        /> */}
                      </motion.div>
                    )}

                    <div className="mb-2" aria-hidden>
                      {s.icon}
                    </div>
                    <div
                      className={`text-sm font-bold transition-colors duration-300 mb-1 ${
                        idx === currentStepIndex
                          ? "text-[#c199e4]"
                          : idx < currentStepIndex
                          ? "text-green-400"
                          : "text-white group-hover:text-gray-200"
                      }`}
                    >
                      {s.title}
                    </div>
                    <div className="text-xs text-gray-400 leading-relaxed">
                      {s.description}
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Controls */}
              <motion.div
                key={`controls-${currentStepIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.8 }}
                className="space-y-3"
              >
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-gray-400 bg-white/10 text-[#c199e4] focus:ring-[#c199e4] focus:ring-2"
                  />
                  Don&apos;t show this again
                </label>

                {/* Single Acknowledge Button */}
                <div className="pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (isTransitioning || showFinalBanner) return;
                      setShowFinalBanner(true);
                      setTimeout(() => {
                        completeOnboarding();
                        setShowFinalBanner(false);
                      }, 1200);
                    }}
                    disabled={isTransitioning || showFinalBanner}
                    className="w-full bg-gradient-to-r from-[#c199e4]/20 to-[#c199e4]/10 hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 text-sm border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg relative overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {showFinalBanner ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white/30 rounded-full"
                          style={{ borderTop: "2px solid white", borderRightColor: "transparent" }}
                        />
                      ) : null}
                      {showFinalBanner ? "Closing..." : "Okay, got it"}
                    </span>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}

      {/* User Greeting */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
        <h1 className="text-xl font-bold text-white">
          {isConnected ? userGreeting : "Please connect your wallet !"}
        </h1>
        {!isConnected && (
          <div className="mt-3">
            <p className="text-sm text-white/70 mb-2">
              Connect your wallet to view balances and manage your DCA
              strategies.
            </p>
            <button
              onClick={() => setActiveTab("wallet" as any)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#c199e4]/20 to-[#b380db]/10 hover:from-[#c199e4]/30 hover:to-[#b380db]/20 text-white text-sm font-medium rounded-xl border border-[#c199e4]/30 hover:border-[#c199e4]/50 transition-all duration-300"
            >
              Go to Wallet
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
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
          </div>
        )}
        {address && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-1.5 text-white/70">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse aspect-square"></div>
              <span className="text-sm">Connected:</span>
              <code className="text-xs bg-white/20 px-2 py-1 rounded-md">
                {address.slice(0, 6)}...{address.slice(-4)}
              </code>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Total Value Card */}
      <div className="bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 backdrop-blur-lg rounded-3xl p-6 text-white border border-[#c199e4]/30 shadow-lg hover:shadow-xl hover:border-[#c199e4]/50 transition-all duration-500 hover:scale-[1.02] group">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#c199e4]/30 to-[#c199e4]/20 rounded-full flex items-center justify-center group-hover:from-[#c199e4]/40 group-hover:to-[#c199e4]/30 transition-all duration-300">
                <HiCurrencyDollar className="text-[#c199e4] size-6" />
              </div>
              <div>
                <span className="text-sm text-white/90 font-medium">
                  Wallet Value (USDC)
                </span>
                {/* <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-white/70">Real-time</span>
                </div> */}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-bold text-white group-hover:text-[#c199e4] transition-colors duration-300">
                {walletBalanceDisplay}
              </p>
              <p className="text-sm text-white/70">
                Total balance across connected wallet
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span
              className={`text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 bg-green-400/20 text-green-300 border border-green-400/40 group-hover:bg-green-400/30 uppercase`}
            >
              TOTAL
            </span>
          </div>
        </div>
      </div>

      {/* Total Investment Summary */}
      <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 hover:shadow-lg hover:from-[#c199e4]/5 hover:to-white/5 group">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center group-hover:from-[#c199e4]/30 group-hover:to-[#c199e4]/20 transition-all duration-300 border border-[#c199e4]/20">
                <HiOutlineChartBar className="text-[#c199e4] size-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white group-hover:text-[#c199e4] transition-colors duration-300">
                  Portfolio Overview
                </h2>
                <p className="text-sm text-white/70">
                  Your investment performance
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <p className="text-3xl font-bold text-[#c199e4]">
                    {isLoading || portfolioUsd === null
                      ? "..."
                      : `${portfolioUsd?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                  </p>
                  <span className="text-sm text-white/60 font-medium">
                    Total Invested{portfolioUsd !== null ? " (USD)" : ""}
                  </span>
                </div>
                <p className="text-sm text-white/70">
                  {isLoading
                    ? "Loading..."
                    : `Across ${userPlans.length} ${
                        userPlans.length === 1 ? "strategy" : "strategies"
                      }`}
                </p>
                {/* {portfolioUsd !== null && (
                  <p className="text-xs text-white/60 mt-1">
                    Est. USD Value: ${portfolioUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )} */}
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-white/90 font-medium">
                    {activePlans.length} Active Plans
                  </span>
                </div>
                {/* <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm text-white/90 font-medium">
                    {pausedPlans.length} Paused Plans
                  </span>
                </div> */}
              </div>
            </div>
          </div>

          <div className="ml-6 flex flex-col items-end">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400/20 to-green-500/20 rounded-2xl flex items-center justify-center border border-emerald-400/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
              <FaCircleUser className="text-emerald-400 size-6" />
            </div>
            {/* <div className="mt-2 text-center">
              <div className="text-xs text-emerald-400 font-semibold">+24.5%</div>
              <div className="text-xs text-white/60">This month</div>
            </div> */}
          </div>
        </div>
      </div>

      {/* Investment Plans Slider */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Active Strategies</h3>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 bg-white/40 rounded-full"></div>
            <div className="w-1 h-1 bg-white/40 rounded-full"></div>
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
        </div>

        {/* Plan Card Container */}
        <div className="space-y-4">
          {/* Show loading state */}
          {isLoading && (
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/20 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-white/20 rounded w-32"></div>
                  <div className="h-3 bg-white/20 rounded w-24"></div>
                </div>
                <div className="h-6 w-16 bg-white/20 rounded-full"></div>
              </div>
              <div className="space-y-3">
                <div className="h-20 bg-white/10 rounded-2xl"></div>
                <div className="h-16 bg-white/10 rounded-2xl"></div>
                <div className="h-12 bg-white/10 rounded-2xl"></div>
              </div>
            </div>
          )}
          {/* Show message when no plans */}
          {!isLoading && userPlans.length === 0 && (
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-8 border border-white/20 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#c199e4]/20">
                <PiStrategyBold className="text-[#c199e4] size-8" />
              </div>
              <h4 className="text-xl font-bold text-white mb-2">
                No Active Strategies
              </h4>

              {isConnected && (
                <>
                  <p className="text-white/70 text-sm mb-4">
                    Create your first DCA strategy to start automated investing
                  </p>
                  <div className="text-xs text-white/50">
                    Use the chat to get started 💡
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => router.push("/chat")}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#c199e4]/20 to-[#b380db]/10 hover:from-[#c199e4]/30 hover:to-[#b380db]/20 text-white text-sm font-semibold rounded-2xl border border-[#c199e4]/30 hover:border-[#c199e4]/50 transition-all duration-300"
                    >
                      Talk to Agent
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
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </button>
                  </div>
                </>
              )}
              <p className="text-white/70 text-sm mb-4">
                {!isConnected &&
                  "Connect your wallet to create your first DCA strategy."}
              </p>
            </div>
          )}

          {/* Plan Card */}
          {!isLoading &&
            userPlans.length > 0 &&
            userPlans[currentPlanIndex] && (
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 hover:shadow-xl hover:from-[#c199e4]/10 hover:to-white/10 group">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center group-hover:from-[#c199e4]/30 group-hover:to-[#c199e4]/20 transition-all duration-300 border border-[#c199e4]/20 group-hover:scale-110">
                      <PiStrategyBold className="text-[#c199e4] size-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-white group-hover:text-[#c199e4] transition-colors duration-300 mb-1">
                        DCA Strategy #{currentPlanIndex + 1}
                      </h4>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-white/90 font-medium">
                          {userPlans[currentPlanIndex].fromToken}
                        </span>
                        <HiOutlineArrowNarrowRight />
                        <span className="text-sm text-white/90 font-medium">
                          {userPlans[currentPlanIndex].toToken}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 ${
                        userPlans[currentPlanIndex].jobStatus === "completed"
                          ? "bg-green-400/20 text-green-300 border border-green-400/40 group-hover:bg-green-400/30"
                          : userPlans[currentPlanIndex].jobStatus === "running"
                          ? "bg-blue-400/20 text-blue-300 border border-blue-400/40 group-hover:bg-blue-400/30"
                          : userPlans[currentPlanIndex].jobStatus === "pending"
                          ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 group-hover:bg-yellow-400/30"
                          : userPlans[currentPlanIndex].jobStatus === "deleted"
                          ? "bg-red-400/20 text-red-300 border border-red-400/40 group-hover:bg-red-400/30"
                          : "bg-gray-400/20 text-gray-300 border border-gray-400/40"
                      }`}
                    >
                      {userPlans[currentPlanIndex].jobStatus || userPlans[currentPlanIndex].status || "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-white/5 to-transparent rounded-2xl p-4 border border-white/10 hover:border-[#c199e4]/30 transition-all duration-300 group/item">
                      <p className="text-xs text-white/70 mb-2 font-medium">
                        Investment Amount
                      </p>
                      <p className="text-2xl font-bold text-white group-hover/item:text-[#c199e4] transition-colors duration-300">
                        {parseFloat(userPlans[currentPlanIndex].amount).toFixed(
                          5
                        )}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-white/5 to-transparent rounded-2xl p-4 border border-white/10 hover:border-[#c199e4]/30 transition-all duration-300 group/item">
                      <p className="text-xs text-white/70 mb-2 font-medium">
                        Frequency
                      </p>
                      <p className="text-2xl font-bold text-white group-hover/item:text-[#c199e4] transition-colors duration-300">
                        {formatInterval(
                          userPlans[currentPlanIndex].intervalMinutes
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#c199e4]/10 to-transparent rounded-2xl p-4 border border-[#c199e4]/20">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-white/90 font-medium">
                        Total Invested
                      </p>
                      <p className="text-sm text-[#c199e4] font-medium">
                        {userPlans[currentPlanIndex].successCount}/
                        {userPlans[currentPlanIndex].totalExecutions} executions
                      </p>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-2xl font-bold text-[#c199e4]">
                        {(
                          parseFloat(userPlans[currentPlanIndex].amount) *
                          userPlans[currentPlanIndex].successCount || 0
                        ).toFixed(5)}
                      </p>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-[#c199e4] to-emerald-400 h-3 rounded-full transition-all duration-700 shadow-sm"
                        style={{
                          width: `${
                            (userPlans[currentPlanIndex].successCount /
                              userPlans[currentPlanIndex].totalExecutions) *
                            100
                          }%`,
                        }}
                      />
                    </div>  
                  </div>
                </div>

                <button
                  onClick={() => openPlanModal(userPlans[currentPlanIndex])}
                  className="w-full bg-gradient-to-r from-[#c199e4]/20 to-[#c199e4]/10 hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 text-sm border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg group-hover:scale-[1.02]"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>View Strategy Details</span>
                    <HiOutlineArrowNarrowRight className="size-5" />
                  </div>
                </button>
              </div>
            )}

          {/* Navigation Controls */}
          {userPlans.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={goToPrevPlan}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white/80 hover:text-white transition-all duration-300 flex items-center justify-center backdrop-blur-lg"
                aria-label="Previous plan"
              >
                <FaChevronLeft />
              </button>

              <button
                onClick={goToNextPlan}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white/80 hover:text-white transition-all duration-300 flex items-center justify-center backdrop-blur-lg"
                aria-label="Next plan"
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </div>

        {/* Plan Indicator */}
        {userPlans.length > 1 && (
          <div className="flex justify-center space-x-2">
            {userPlans.map((_, index: number) => (
              <button
                key={index}
                onClick={() => setCurrentPlanIndex(index)}
                className={`size-1.5 rounded-full transition-all duration-300 ${
                  index === currentPlanIndex
                    ? "bg-white shadow-lg scale-125"
                    : "bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to plan ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Plan Counter */}
        {/* <div className="text-center text-sm text-white/60">
          {currentPlanIndex + 1} of {investmentPlans.length} strategies
        </div> */}
      </div>

      {/* Plan Details Modal */}
      {showPlanModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closePlanModal}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-md mx-auto bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl shadow-2xl border border-[#c199e4]/20 max-h-[65vh] overflow-y-auto -top-[40px]"
          >
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center group-hover:from-[#c199e4]/30 group-hover:to-[#c199e4]/20 transition-all duration-300 border border-[#c199e4]/20 group-hover:scale-110">
                    <PiStrategyBold className="text-[#c199e4] size-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#c199e4] transition-colors duration-300">
                      DCA Strategy
                    </h3>
                    <p className="text-sm text-white/70">
                      {selectedPlan.fromToken} → {selectedPlan.toToken}{" "}
                      Investment Plan
                    </p>
                  </div>
                </div>
                <button
                  onClick={closePlanModal}
                  className="text-white/70 hover:text-white transition-colors duration-200 p-2 hover:bg-white/10 rounded-xl"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between p-3 backdrop-blur-lg rounded-2xl border border-[#c199e4]/20">
                {/* Left: Plan ID label */}
                <span className="text-sm text-gray-400 font-medium">
                  JOB ID (TriggerX):
                </span>
                {/* Right: Plan ID value and copy icon */}
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">
                    {selectedPlan.jobId.slice(0, 6)}...
                    {selectedPlan.jobId.slice(-4)}
                  </span>
                  <button
                    onClick={handleCopyPlanId}
                    className="ml-2 text-[#c199e4] hover:text-white transition-colors"
                    title="Copy Plan ID"
                  >
                    {copied ? (
                      <HiOutlineCheck className="w-5 h-5 text-green-400" />
                    ) : (
                      <HiOutlineClipboard className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-3  backdrop-blur-lg rounded-2xl border border-[#c199e4]/20">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 ${
                      selectedPlan.jobStatus === "completed"
                        ? "bg-green-400/20 text-green-300 border border-green-400/40 group-hover:bg-green-400/30"
                        : selectedPlan.jobStatus === "running"
                        ? "bg-blue-400/20 text-blue-300 border border-blue-400/40 group-hover:bg-blue-400/30"
                        : selectedPlan.jobStatus === "pending"
                        ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 group-hover:bg-yellow-400/30"
                        : selectedPlan.jobStatus === "deleted"
                        ? "bg-red-400/20 text-red-300 border border-red-400/40 group-hover:bg-red-400/30"
                        : "bg-gray-400/20 text-gray-300 border border-gray-400/40"
                    }`}
                  >
                    {selectedPlan.jobStatus || selectedPlan.status || "Unknown"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeletePlan(selectedPlan)}
                    className={`w-full bg-gradient-to-r from-red-500/20 to-red-500/10 hover:from-red-500/30 hover:to-red-500/20 text-white font-semibold py-3 px-5 rounded-2xl transition-all duration-300 text-sm border border-red-500/30 hover:border-red-500/50 hover:shadow-lg group-hover:scale-[1.02] cursor-pointer ${
                      isDeleting ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete Plan"}
                  </button>
                </div>
              </div>

              {/* Plan Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="backdrop-blur-lg rounded-2xl p-3 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    From Token
                  </p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">
                    {selectedPlan.fromToken}
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-3 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    To Token
                  </p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">
                    {selectedPlan.toToken}
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-3 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    Amount
                  </p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">
                    {parseFloat(selectedPlan.amount).toFixed(5)}
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-3 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    Interval
                  </p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">
                    {formatInterval(selectedPlan.intervalMinutes)}
                  </p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-3 border border-[#c199e4]/20 transition-all duration-300 group col-span-2">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    Duration
                  </p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">
                    {formatDuration(selectedPlan.durationWeeks)}
                  </p>
                </div>
              </div>

              {/* Slippage */}
              <div className="rounded-2xl p-4 border border-[#c199e4]/20">
                <p className="text-sm text-gray-300 font-medium mb-2">
                  Slippage Tolerance
                </p>
                <p className="text-lg font-bold text-gray-100">
                  {parseFloat(selectedPlan.slippage).toFixed(2)}%
                </p>
              </div>
              {/* Progress Section */}
              <div className="space-y-4">
                <div className="backdrop-blur-lg rounded-2xl p-4 border border-[#c199e4]/20">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-300 font-medium">
                      Execution Progress
                    </p>
                    <p className="text-sm text-gray-200 font-medium">
                      {selectedPlan.successCount}/
                      {selectedPlan.totalExecutions}
                    </p>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3 mb-2">
                    <div
                      className="bg-gradient-to-r from-[#c199e4]/40 to-[#c199e4]/30 h-3 rounded-full transition-all duration-700 shadow-sm"
                      style={{
                        width: `${
                          (selectedPlan.successCount /
                            selectedPlan.totalExecutions) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {Math.round(
                      (selectedPlan.successCount /
                        selectedPlan.totalExecutions) *
                        100
                    )}
                    % Complete
                  </p>
                </div>

                <div className=" rounded-2xl p-4 border border-[#c199e4]/20">
                  <p className="text-sm text-gray-300 font-medium mb-2">
                    Total Invested
                  </p>
                  <p className="text-2xl font-bold text-gray-100">
                    {(
                      parseFloat(selectedPlan.amount) *
                      Number(selectedPlan.successCount || 0)
                    ).toFixed(5)}{" "}
                    {selectedPlan.fromToken}
                  </p>
                </div>
              </div>

              {/* Timeline Details */}
              <div className="space-y-3">
                <div className="rounded-2xl p-4 border border-[#c199e4]/20">
                  <p className="text-sm text-gray-400 mb-2 font-medium">
                    Created
                  </p>
                  <p className="text-sm font-semibold text-gray-200">
                    {new Date(selectedPlan.createdAt).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
                <div className="rounded-2xl p-4 border border-[#c199e4]/20">
                  <p className="text-sm text-gray-300 font-medium mb-2">
                    Next Execution
                  </p>
                  <p className="text-sm font-bold text-gray-100">
                    {selectedPlan.nextExecution
                      ? new Date(selectedPlan.nextExecution).toLocaleString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }
                        )
                      : "No upcoming execution"}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
