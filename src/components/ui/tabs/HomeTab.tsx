"use client";

import { useAccount } from "wagmi";
import { truncateAddress } from "../../../lib/truncateAddress";
import { useMiniApp } from "@neynar/react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { useEffect, useState } from "react";

// Investment Plan Interface
interface InvestmentPlan {
  id: string;
  name: string;
  status: "active" | "paused" | "completed" | "failed";
  fromToken: string;
  toToken: string;
  amount: string;
  interval: string;
  duration: string;
  createdAt: string;
  nextExecution: string;
  executionCount: number;
  totalExecutions: number;
  totalInvested: string;
  exchangeRate: string;
}

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

// USDC contract address (example: Ethereum mainnet)
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
];

// Investment Plan Interface
interface InvestmentPlan {
  id: string;
  name: string;
  status: "active" | "paused" | "completed" | "failed";
  fromToken: string;
  toToken: string;
  amount: string;
  interval: string;
  duration: string;
  createdAt: string;
  nextExecution: string;
  executionCount: number;
  totalExecutions: number;
  totalInvested: string;
  exchangeRate: string;
}

export function HomeTab() {
  const { address, isConnected } = useAccount();
  const { context } = useMiniApp();

  const { data: usdcRawBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [address],
  });

  // Modal state
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  
  // Slider state
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);

  // Onboarding state
  const onboardingSteps = [
    {
      step: 1,
      title: "Connect Wallet",
      description: "Link your wallet to get started",
      action: "Next",
      icon: "🔗",
    },
    {
      step: 2,
      title: "Create DCA Plan",
      description: "Tell us what you want to invest",
      action: "Next",
      icon: "📊",
    },
    {
      step: 3,
      title: "Review & Approve",
      description: "Confirm your investment strategy",
      action: "Next",
      icon: "✅",
    },
    {
      step: 4,
      title: "Track Progress",
      description: "Monitor your automated investments",
      action: "Got it",
      icon: "📱",
    },
  ];

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

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
    if (currentStepIndex < onboardingSteps.length - 1) {
      setCurrentStepIndex((i) => i + 1);
    } else {
      completeOnboarding();
    }
  };

  const goPrev = () => {
    if (currentStepIndex > 0) setCurrentStepIndex((i) => i - 1);
  };

  // Dummy investment plans data
  const investmentPlans: InvestmentPlan[] = [
    {
      id: "1",
      name: "DCA Strategy #1",
      status: "active",
      fromToken: "USDC",
      toToken: "ETH",
      amount: "$50.00",
      interval: "Daily",
      duration: "3 months",
      createdAt: "2024-01-15T10:30:00Z",
      nextExecution: "2024-01-16T09:00:00Z",
      executionCount: 15,
      totalExecutions: 90,
      totalInvested: "$750.00",
      exchangeRate: "1 USDC = 0.00037 ETH",
    },
    {
      id: "2",
      name: "BTC Accumulation",
      status: "paused",
      fromToken: "USDC",
      toToken: "BTC",
      amount: "$100.00",
      interval: "Weekly",
      duration: "6 months",
      createdAt: "2024-01-10T14:20:00Z",
      nextExecution: "2024-01-17T09:00:00Z",
      executionCount: 8,
      totalExecutions: 24,
      totalInvested: "$800.00",
      exchangeRate: "1 USDC = 0.000023 BTC",
    },
    {
      id: "3",
      name: "SOL DCA Plan",
      status: "active",
      fromToken: "USDC",
      toToken: "SOL",
      amount: "$25.00",
      interval: "Daily",
      duration: "1 month",
      createdAt: "2024-01-20T16:45:00Z",
      nextExecution: "2024-01-21T09:00:00Z",
      executionCount: 5,
      totalExecutions: 30,
      totalInvested: "$125.00",
      exchangeRate: "1 USDC = 0.12 SOL",
    },
  ];

  // Calculate total invested across all plans
  const totalInvested = investmentPlans.reduce((sum, plan) => {
    return sum + parseFloat(plan.totalInvested.replace("$", "").replace(",", ""));
  }, 0);

  const activePlans = investmentPlans.filter(plan => plan.status === "active");
  const pausedPlans = investmentPlans.filter(plan => plan.status === "paused");

  // Plan actions
  const handlePausePlan = (planId: string) => {
    // TODO: Implement pause functionality
    console.log("Pausing plan:", planId);
  };

  const handleResumePlan = (planId: string) => {
    // TODO: Implement resume functionality
    console.log("Resuming plan:", planId);
  };

  const openPlanModal = (plan: InvestmentPlan) => {
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
      prev === investmentPlans.length - 1 ? 0 : prev + 1
    );
  };

  const goToPrevPlan = () => {
    setCurrentPlanIndex((prev) => 
      prev === 0 ? investmentPlans.length - 1 : prev - 1
    );
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        goToPrevPlan();
      } else if (event.key === 'ArrowRight') {
        goToNextPlan();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Dummy data - replace with actual data later
  const userGreeting = `${getTimeGreeting()}, ${context?.user?.username} 👋`;
  const usdcBalance =
    typeof usdcRawBalance === "bigint"
      ? `$${Number(formatUnits(usdcRawBalance, 6)).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "$0.00";

  const step = onboardingSteps[currentStepIndex];
  const progressPercent =
    ((currentStepIndex + 1) / onboardingSteps.length) * 100;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] px-4 py-3 space-y-4 overflow-y-auto">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeOnboarding}
          />
          <div className="relative z-10 w-full max-w-sm mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-2xl" aria-hidden>
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {step.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeOnboarding}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
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

              <div className="mb-3">
                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>
                    Step {currentStepIndex + 1} of {onboardingSteps.length}
                  </span>
                  <span>{Math.round(progressPercent)}%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-950">
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    Connect your wallet and tell us:
                  </p>
                  <pre className="mt-1 text-xs whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                   I want to invest [amount] in [token] every [frequency]
                    for [duration] 
                  </pre>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {onboardingSteps.map((s, idx) => (
                    <div
                      key={s.step}
                      className={`rounded-lg border p-2 ${
                        idx === currentStepIndex
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-400"
                          : "border-gray-200 dark:border-gray-800"
                      }`}
                    >
                      <div className="text-sm" aria-hidden>
                        {s.icon}
                      </div>
                      <div className="text-xs font-medium text-gray-900 dark:text-white mt-1">
                        {s.title}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {s.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  Don&apos;t show again
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={goPrev}
                    disabled={currentStepIndex === 0}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 text-sm"
                  >
                    Back
                  </button>
                  <button
                    onClick={goNext}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm"
                  >
                    {currentStepIndex === onboardingSteps.length - 1
                      ? "Got it"
                      : step.action}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Greeting */}
      <div className="text-left">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {userGreeting}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {address && (
            <div className="text-xs w-full">
              Address:{" "}
              <pre className="inline w-full">{truncateAddress(address)}</pre>
            </div>
          )}
        </p>
      </div>

      {/* USDC Balance Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm opacity-90">Available Balance</p>
            <p className="text-2xl font-bold mt-1">{usdcBalance}</p>
            <p className="text-xs opacity-75 mt-1">USDC</p>
          </div>
          <div className="bg-white/20 rounded-full p-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Total Investment Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Investment Summary
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Total invested across all plans
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              ${totalInvested.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {activePlans.length} active, {pausedPlans.length} paused
            </p>
          </div>
        </div>
      </div>

      {/* Investment Plans Slider */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Your Investment Plans
        </h3>
        
        {/* Plan Card Container */}
        <div className="space-y-3">
          {/* Plan Card */}
          {investmentPlans[currentPlanIndex] && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {investmentPlans[currentPlanIndex].name}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {investmentPlans[currentPlanIndex].fromToken} → {investmentPlans[currentPlanIndex].toToken}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(investmentPlans[currentPlanIndex].status)}`}>
                  {investmentPlans[currentPlanIndex].status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Amount</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {investmentPlans[currentPlanIndex].amount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Interval</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {investmentPlans[currentPlanIndex].interval}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Invested</p>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    {investmentPlans[currentPlanIndex].totalInvested}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Progress</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {investmentPlans[currentPlanIndex].executionCount}/{investmentPlans[currentPlanIndex].totalExecutions}
                  </p>
                </div>
              </div>

              <button
                onClick={() => openPlanModal(investmentPlans[currentPlanIndex])}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                View Details
              </button>
            </div>
          )}

          {/* Navigation Controls */}
          {investmentPlans.length > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={goToPrevPlan}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="Previous plan"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {/* <span className="text-xs">Previous</span> */}
              </button>
              
              <button
                onClick={goToNextPlan}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="Next plan"
              >
                {/* <span className="text-xs">Next</span> */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Plan Indicator */}
        <div className="flex justify-center space-x-1">
          {investmentPlans.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPlanIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentPlanIndex 
                  ? 'bg-blue-600 dark:bg-blue-400' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              aria-label={`Go to plan ${index + 1}`}
            />
          ))}
        </div>
        
        {/* Plan Counter */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          {currentPlanIndex + 1} of {investmentPlans.length}
        </div>
      </div>

      {/* Plan Details Modal */}
      {showPlanModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/50" onClick={closePlanModal} />
          <div className="relative z-10 w-full max-w-xs mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 max-h-[80vh] overflow-y-auto">
            <div className="p-3 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {selectedPlan.name}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Investment Plan Details
                  </p>
                </div>
                <button
                  onClick={closePlanModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(selectedPlan.status)}`}>
                    {selectedPlan.status}
                  </span>
                </div>
                <div className="flex gap-1">
                  {selectedPlan.status === "active" && (
                    <button
                      onClick={() => handlePausePlan(selectedPlan.id)}
                      className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded-md"
                    >
                      Pause
                    </button>
                  )}
                  {selectedPlan.status === "paused" && (
                    <button
                      onClick={() => handleResumePlan(selectedPlan.id)}
                      className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md"
                    >
                      Resume
                    </button>
                  )}
                </div>
              </div>

              {/* Plan Details Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">From Token</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{selectedPlan.fromToken}</p>
                </div>
                <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">To Token</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{selectedPlan.toToken}</p>
                </div>
                <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Amount</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{selectedPlan.amount}</p>
                </div>
                <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Interval</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{selectedPlan.interval}</p>
                </div>
                <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{selectedPlan.duration}</p>
                </div>
                <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Exchange Rate</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{selectedPlan.exchangeRate}</p>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-2">
                <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Created At</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">
                    {new Date(selectedPlan.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Next Execution</p>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {new Date(selectedPlan.nextExecution).toLocaleString()}
                  </p>
                </div>
                <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Execution Progress</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-white">
                      {selectedPlan.executionCount} of {selectedPlan.totalExecutions}
                    </p>
                    <div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${(selectedPlan.executionCount / selectedPlan.totalExecutions) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Invested</p>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">
                    {selectedPlan.totalInvested}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  onClick={closePlanModal}
                  className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
