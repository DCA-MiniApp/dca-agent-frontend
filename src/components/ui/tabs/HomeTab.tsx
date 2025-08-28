"use client";

import { useAccount } from "wagmi";
import { truncateAddress } from "../../../lib/truncateAddress";
import { useMiniApp } from "@neynar/react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HiCurrencyDollar } from "react-icons/hi2";
import { HiOutlineChartBar } from "react-icons/hi";
import { PiStrategyBold } from "react-icons/pi";
import { FaArrowTrendUp } from "react-icons/fa6";

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
    <div className="flex flex-col h-full py-3 px-2 space-y-6 overflow-y-auto">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeOnboarding}
          />
          <div className="relative z-10 w-full max-w-sm mx-auto bg-[#341e64] rounded-2xl shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
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
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
        <h1 className="text-xl font-bold text-white">
          {userGreeting}
        </h1>
        {address && (
          <div className="flex items-center gap-2 text-white/70 mt-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">Connected:</span>
            <code className="text-xs bg-white/20 px-2 py-1 rounded-md">{truncateAddress(address)}</code>
          </div>
        )}
      </div>

      {/* USDC Balance Card */}
      <div className="bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 backdrop-blur-lg rounded-3xl p-6 text-white border border-[#c199e4]/30 shadow-lg hover:shadow-xl hover:border-[#c199e4]/50 transition-all duration-500 hover:scale-[1.02] group">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#c199e4]/30 to-[#c199e4]/20 rounded-full flex items-center justify-center group-hover:from-[#c199e4]/40 group-hover:to-[#c199e4]/30 transition-all duration-300">
              <HiCurrencyDollar className="text-[#c199e4] size-6"/>
              </div>
              <div>
                <span className="text-sm text-white/90 font-medium">Available Balance</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-white/70">Real-time</span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-bold text-white group-hover:text-[#c199e4] transition-colors duration-300">{usdcBalance}</p>
              <p className="text-sm text-white/70">Ready for smart investments</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 bg-green-400/20 text-green-300 border border-green-400/40 group-hover:bg-green-400/30 uppercase`}>
                    Active</span>
          </div>
        </div>
      </div>

      {/* Total Investment Summary */}
      <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 hover:shadow-lg hover:from-[#c199e4]/5 hover:to-white/5 group">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center group-hover:from-[#c199e4]/30 group-hover:to-[#c199e4]/20 transition-all duration-300 border border-[#c199e4]/20">
              <HiOutlineChartBar className="text-[#c199e4] size-6"/>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white group-hover:text-[#c199e4] transition-colors duration-300">Portfolio Overview</h2>
                <p className="text-sm text-white/70">Your investment performance</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-baseline gap-2 mb-1">
                  <p className="text-3xl font-bold text-[#c199e4]">
                    ${totalInvested.toLocaleString()}
                  </p>
                  <span className="text-sm text-white/60 font-medium">Total Invested</span>
                </div>
                <p className="text-sm text-white/70">Across all active strategies</p>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-white/90 font-medium">{activePlans.length} Active Plans</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm text-white/90 font-medium">{pausedPlans.length} Paused Plans</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="ml-6 flex flex-col items-end">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400/20 to-green-500/20 rounded-2xl flex items-center justify-center border border-emerald-400/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
            <FaArrowTrendUp className="text-emerald-400 size-6"/>
            </div>
            <div className="mt-2 text-center">
              <div className="text-xs text-emerald-400 font-semibold">+24.5%</div>
              <div className="text-xs text-white/60">This month</div>
            </div>
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
          {/* Plan Card */}
          {investmentPlans[currentPlanIndex] && (
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 hover:shadow-xl hover:from-[#c199e4]/10 hover:to-white/10 group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center group-hover:from-[#c199e4]/30 group-hover:to-[#c199e4]/20 transition-all duration-300 border border-[#c199e4]/20 group-hover:scale-110">
                  <PiStrategyBold className="text-[#c199e4] size-6"/>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-white group-hover:text-[#c199e4] transition-colors duration-300 mb-1">
                      {investmentPlans[currentPlanIndex].name}
                    </h4>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-white/90 font-medium">
                        {investmentPlans[currentPlanIndex].fromToken}
                      </span>
                      <svg className="w-4 h-4 text-[#c199e4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      <span className="text-sm text-white/90 font-medium">
                        {investmentPlans[currentPlanIndex].toToken}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <span className={`text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 ${
                    investmentPlans[currentPlanIndex].status === 'active' 
                      ? 'bg-green-400/20 text-green-300 border border-green-400/40 group-hover:bg-green-400/30' 
                      : investmentPlans[currentPlanIndex].status === 'paused'
                      ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 group-hover:bg-yellow-400/30'
                      : 'bg-gray-400/20 text-gray-300 border border-gray-400/40'
                  }`}>
                    {investmentPlans[currentPlanIndex].status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-white/5 to-transparent rounded-2xl p-4 border border-white/10 hover:border-[#c199e4]/30 transition-all duration-300 group/item">
                    <p className="text-xs text-white/70 mb-2 font-medium">Investment Amount</p>
                    <p className="text-2xl font-bold text-white group-hover/item:text-[#c199e4] transition-colors duration-300">
                      {investmentPlans[currentPlanIndex].amount}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-transparent rounded-2xl p-4 border border-white/10 hover:border-[#c199e4]/30 transition-all duration-300 group/item">
                    <p className="text-xs text-white/70 mb-2 font-medium">Frequency</p>
                    <p className="text-2xl font-bold text-white group-hover/item:text-[#c199e4] transition-colors duration-300">
                      {investmentPlans[currentPlanIndex].interval}
                    </p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-[#c199e4]/10 to-transparent rounded-2xl p-4 border border-[#c199e4]/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-white/90 font-medium">Total Invested</p>
                    <p className="text-sm text-[#c199e4] font-medium">
                      {investmentPlans[currentPlanIndex].executionCount}/{investmentPlans[currentPlanIndex].totalExecutions} executions
                    </p>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-2xl font-bold text-[#c199e4]">
                      {investmentPlans[currentPlanIndex].totalInvested}
                    </p>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-[#c199e4] to-emerald-400 h-3 rounded-full transition-all duration-700 shadow-sm"
                      style={{ width: `${(investmentPlans[currentPlanIndex].executionCount / investmentPlans[currentPlanIndex].totalExecutions) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => openPlanModal(investmentPlans[currentPlanIndex])}
                className="w-full bg-gradient-to-r from-[#c199e4]/20 to-[#c199e4]/10 hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 text-sm border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg group-hover:scale-[1.02]"
              >
                <div className="flex items-center justify-center gap-2">
                  <span>View Strategy Details</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </button>
            </div>
          )}

          {/* Navigation Controls */}
          {investmentPlans.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={goToPrevPlan}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white/80 hover:text-white transition-all duration-300 flex items-center justify-center backdrop-blur-lg"
                aria-label="Previous plan"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <button
                onClick={goToNextPlan}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 text-white/80 hover:text-white transition-all duration-300 flex items-center justify-center backdrop-blur-lg"
                aria-label="Next plan"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Plan Indicator */}
        <div className="flex justify-center space-x-2">
          {investmentPlans.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPlanIndex(index)}
              className={`size-1.5 rounded-full transition-all duration-300 ${
                index === currentPlanIndex 
                  ? 'bg-white shadow-lg scale-125' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to plan ${index + 1}`}
            />
          ))}
        </div>
        
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
            className="relative z-10 w-full max-w-md mx-auto bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl shadow-2xl border border-[#c199e4]/20 max-h-[65vh] overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center group-hover:from-[#c199e4]/30 group-hover:to-[#c199e4]/20 transition-all duration-300 border border-[#c199e4]/20 group-hover:scale-110">
                  <PiStrategyBold className="text-[#c199e4] size-6"/>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#c199e4] transition-colors duration-300">
                      {selectedPlan.name}
                    </h3>
                    <p className="text-sm text-white/70">
                      Investment Plan Details
                    </p>
                  </div>
                </div>
                <button
                  onClick={closePlanModal}
                  className="text-white/70 hover:text-white transition-colors duration-200 p-2 hover:bg-white/10 rounded-xl"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between p-4  backdrop-blur-lg rounded-2xl border border-[#c199e4]/20">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 ${
                    selectedPlan.status === 'active' 
                      ? 'bg-green-400/20 text-green-300 border border-green-400/40 group-hover:bg-green-400/30' 
                      : selectedPlan.status === 'paused'
                       ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 group-hover:bg-yellow-400/30'
                      : 'bg-gray-400/20 text-gray-300 border border-gray-400/40'
                  }`}>
                    {selectedPlan.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex gap-2">
                  {selectedPlan.status === "active" && (
                    <button
                      onClick={() => handlePausePlan(selectedPlan.id)}
                      className="w-full bg-gradient-to-r from-[#c199e4]/20 to-[#c199e4]/10 hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 text-sm border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg group-hover:scale-[1.02]"
                    >
                      Pause
                    </button>
                  )}
                  {selectedPlan.status === "paused" && (
                    <button
                      onClick={() => handleResumePlan(selectedPlan.id)}
                      className="w-full bg-gradient-to-r from-[#c199e4]/20 to-[#c199e4]/10 hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 text-white font-semibold py-3 px-5 rounded-2xl transition-all duration-300 text-sm border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg group-hover:scale-[1.02]"
                    >
                      Resume
                    </button>
                  )}
                </div>
              </div>

              {/* Plan Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="backdrop-blur-lg rounded-2xl p-4 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">From Token</p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">{selectedPlan.fromToken}</p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-4 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">To Token</p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">{selectedPlan.toToken}</p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-4 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">Amount</p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">{selectedPlan.amount}</p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-4 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">Interval</p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">{selectedPlan.interval}</p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-4 border border-[#c199e4]/20 transition-all duration-300 group col-span-2">
                  <p className="text-sm text-gray-400 mb-2 font-medium">Duration</p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">{selectedPlan.duration}</p>
                </div>
              </div>

              {/* Exchange Rate */}
              <div className="rounded-2xl p-4 border border-[#c199e4]/20">
                <p className="text-sm text-gray-300 font-medium mb-2">Current Exchange Rate</p>
                <p className="text-lg font-bold text-gray-100">{selectedPlan.exchangeRate}</p>
              </div>

              {/* Progress Section */}
              <div className="space-y-4">
                <div className="backdrop-blur-lg rounded-2xl p-4 border border-[#c199e4]/20">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-300 font-medium">Execution Progress</p>
                    <p className="text-sm text-gray-200 font-medium">
                      {selectedPlan.executionCount}/{selectedPlan.totalExecutions}
                    </p>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3 mb-2">
                    <div
                      className="bg-gradient-to-r from-[#c199e4]/40 to-[#c199e4]/30 h-3 rounded-full transition-all duration-700 shadow-sm"
                      style={{ width: `${(selectedPlan.executionCount / selectedPlan.totalExecutions) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {Math.round((selectedPlan.executionCount / selectedPlan.totalExecutions) * 100)}% Complete
                  </p>
                </div>

                <div className=" rounded-2xl p-4 border border-[#c199e4]/20">
                  <p className="text-sm text-gray-300 font-medium mb-2">Total Invested</p>
                  <p className="text-2xl font-bold text-gray-100">{selectedPlan.totalInvested}</p>
                </div>
              </div>

              {/* Timeline Details */}
              <div className="space-y-3">
                <div className="rounded-2xl p-4 border border-[#c199e4]/20">
                  <p className="text-sm text-gray-400 mb-2 font-medium">Created</p>
                  <p className="text-sm font-semibold text-gray-200">
                    {new Date(selectedPlan.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="rounded-2xl p-4 border border-[#c199e4]/20">
                  <p className="text-sm text-gray-300 font-medium mb-2">Next Execution</p>
                  <p className="text-sm font-bold text-gray-100">
                    {new Date(selectedPlan.nextExecution).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={closePlanModal}
                  className="w-full bg-gradient-to-r from-[#c199e4]/20 to-[#c199e4]/10 hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 text-sm border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg group-hover:scale-[1.02]"
                >
                  Close
                </button>
                <button className="w-full bg-gradient-to-r from-[#c199e4]/20 to-[#c199e4]/10 hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 text-sm border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg group-hover:scale-[1.02]">
                  Edit Plan
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
