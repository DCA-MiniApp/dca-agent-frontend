"use client";

import { useAccount } from "wagmi";
import { truncateAddress } from "../../../lib/truncateAddress";
import { useMiniApp } from "@neynar/react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { HiCurrencyDollar } from "react-icons/hi2";
import { HiOutlineChartBar } from "react-icons/hi";
import { PiStrategyBold } from "react-icons/pi";
import { FaArrowTrendUp, FaCircleUser } from "react-icons/fa6";
import { HiOutlineWallet, HiOutlineDocumentChartBar, HiOutlineCheckCircle, HiOutlineDevicePhoneMobile, HiOutlineXMark } from "react-icons/hi2";
// import { MdArrowRightAlt } from "react-icons/md";
import { HiOutlineArrowNarrowRight } from "react-icons/hi";
import {FaChevronLeft , FaChevronRight } from "react-icons/fa";
import { fetchUserDCAPlans, fetchPlatformStats, updatePlanStatus, calculateTotalInvested, formatInterval, formatDuration, type DCAPlan, type PlatformStats } from '../../../lib/api';
import { IoAirplaneOutline } from "react-icons/io5";

// Legacy interface for compatibility - will be replaced with DCAPlan
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
const USDC_ADDRESS = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
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
  console.log("User Address:", USDC_ADDRESS);

  console.log("USDC Raw Balance:", usdcRawBalance);

  // Dynamic data state
  const [userPlans, setUserPlans] = useState<DCAPlan[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalInvested, setTotalInvested] = useState(0);

  // Modal state
  const [selectedPlan, setSelectedPlan] = useState<DCAPlan | null>(null);
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
      icon: <HiOutlineWallet className="w-6 h-6 text-[#c199e4]" />,
    },
    {
      step: 2,
      title: "Create DCA Plan",
      description: "Tell us what you want to invest",
      action: "Next",
      icon: <HiOutlineDocumentChartBar className="w-6 h-6 text-[#c199e4]" />,
    },
    {
      step: 3,
      title: "Review & Approve",
      description: "Confirm your investment strategy",
      action: "Next",
      icon: <HiOutlineCheckCircle className="w-6 h-6 text-[#c199e4]" />,
    },
    {
      step: 4,
      title: "Track Progress",
      description: "Monitor your automated investments",
      action: "Got it",
      icon: <HiOutlineDevicePhoneMobile className="w-6 h-6 text-[#c199e4]" />,
    },
  ];

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

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
      let totalInvested = calculateTotalInvested(plans);
      console.log("Total Invested line number 173:", totalInvested);
      setTotalInvested(calculateTotalInvested(plans));
      console.log("Total Invested:", totalInvested);
      
      // Reset current plan index if we have fewer plans now
      if (plans.length > 0 && currentPlanIndex >= plans.length) {
        setCurrentPlanIndex(0);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, currentPlanIndex]);

  // Fetch data on mount and address change
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);
  

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

  // Calculate active and paused plans from real data
  const activePlans = userPlans.filter(plan => plan.status === "ACTIVE");
  const pausedPlans = userPlans.filter(plan => plan.status === "PAUSED");

  // Plan actions with real API calls
  const handlePausePlan = async (planId: string) => {
    try {
      const success = await updatePlanStatus(planId, 'PAUSED');
      if (success) {
        await fetchUserData(); // Refresh data
        console.log("✅ Plan paused successfully:", planId);
      } else {
        console.error("❌ Failed to pause plan:", planId);
      }
    } catch (error) {
      console.error("❌ Error pausing plan:", error);
    }
  };

  const handleResumePlan = async (planId: string) => {
    try {
      const success = await updatePlanStatus(planId, 'ACTIVE');
      if (success) {
        await fetchUserData(); // Refresh data
        console.log("✅ Plan resumed successfully:", planId);
      } else {
        console.error("❌ Failed to resume plan:", planId);
      }
    } catch (error) {
      console.error("❌ Error resuming plan:", error);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeOnboarding}
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
                  <div className="w-12 h-12 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center group-hover:from-[#c199e4]/30 group-hover:to-[#c199e4]/20 transition-all duration-300 border border-[#c199e4]/20 group-hover:scale-110" aria-hidden>
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#c199e4] transition-colors duration-300">
                      {step.title}
                    </h3>
                    <p className="text-sm text-white/70">
                      {step.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeOnboarding}
                  className="text-white/70 hover:text-white transition-colors duration-200 p-2 hover:bg-white/10 rounded-xl"
                >
                  <HiOutlineXMark className="h-5 w-5" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="backdrop-blur-lg rounded-2xl p-4 border border-[#c199e4]/20">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-300 font-medium">Onboarding Progress</p>
                  <p className="text-sm text-gray-200 font-medium">
                    {currentStepIndex + 1}/{onboardingSteps.length}
                  </p>
                </div>
                <div className="w-full bg-white/20 rounded-full h-3 mb-2">
                  <div
                    className="bg-gradient-to-r from-[#c199e4]/40 to-[#c199e4]/30 h-3 rounded-full transition-all duration-700 shadow-sm"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  {Math.round(progressPercent)}% Complete
                </p>
              </div>

              {/* Quick Start Guide */}
              <div className="rounded-2xl p-4 border border-[#c199e4]/20">
                <p className="text-sm text-gray-300 font-medium mb-2">
                  Quick Start Guide
                </p>
                <div className="backdrop-blur-lg rounded-xl p-3 border border-[#c199e4]/20">
                  <p className="text-sm text-gray-100 font-medium">Connect your wallet and tell us:</p>
                  <p className="text-sm text-gray-200 mt-1 italic">
                    &ldquo;I want to invest [amount] in [token] every [frequency] for [duration]&rdquo;
                  </p>
                </div>
              </div>

              {/* Steps Grid */}
              <div className="grid grid-cols-2 gap-2">
                {onboardingSteps.map((s, idx) => (
                  <div
                    key={s.step}
                    className={`backdrop-blur-lg rounded-2xl p-3 border transition-all duration-300 group ${
                      idx === currentStepIndex
                        ? "border-[#c199e4]/50 shadow-lg"
                        : "border-[#c199e4]/20 hover:border-[#c199e4]/30"
                    }`}
                  >
                    <div className="mb-2" aria-hidden>
                      {s.icon}
                    </div>
                    <div className="text-sm font-bold text-white group-hover:text-gray-200 transition-colors duration-300 mb-1">
                      {s.title}
                    </div>
                    <div className="text-xs text-gray-400 leading-relaxed">
                      {s.description}
                    </div>
                  </div>
                ))}
              </div>

              {/* Controls */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-gray-400 bg-white/10 text-[#c199e4] focus:ring-[#c199e4] focus:ring-2"
                  />
                  Don&apos;t show this again
                </label>
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={goPrev}
                    disabled={currentStepIndex === 0}
                    className="w-full bg-gradient-to-r from-[#c199e4]/20 to-[#c199e4]/10 hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 text-sm border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg group-hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    Back
                  </button>
                  <button
                    onClick={goNext}
                    className="w-full bg-gradient-to-r from-[#c199e4]/20 to-[#c199e4]/10 hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 text-sm border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg group-hover:scale-[1.02]"
                  >
                    {currentStepIndex === onboardingSteps.length - 1
                      ? "Got it!"
                      : step.action}
                  </button>
                </div>
              </div>
            </div>
            </motion.div>
          </div>
      )}

      {/* User Greeting */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
        <h1 className="text-xl font-bold text-white">
          {userGreeting}
        </h1>
        {address && (
          <div className="flex items-center gap-1.5 text-white/70 mt-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse aspect-square"></div>
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
                {/* <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-white/70">Real-time</span>
                </div> */}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-4xl font-bold text-white group-hover:text-[#c199e4] transition-colors duration-300">{usdcBalance}</p>
              <p className="text-sm text-white/70">Ready for smart investments</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 bg-green-400/20 text-green-300 border border-green-400/40 group-hover:bg-green-400/30 uppercase`}>
                    USDC</span>
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
                    {isLoading ? '...' : `$${totalInvested.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}`}
                  </p>
                  <span className="text-sm text-white/60 font-medium">Total Invested</span>
                </div>
                <p className="text-sm text-white/70">
                  {isLoading ? 'Loading...' : `Across ${userPlans.length} ${userPlans.length === 1 ? 'strategy' : 'strategies'}`}
                </p>
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
            <FaCircleUser className="text-emerald-400 size-6"/>
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
                <PiStrategyBold className="text-[#c199e4] size-8"/>
              </div>
              <h4 className="text-xl font-bold text-white mb-2">No Active Strategies</h4>
              <p className="text-white/70 text-sm mb-4">Create your first DCA strategy to start automated investing</p>
              <div className="text-xs text-white/50">Connect your wallet and use the chat to get started</div>
            </div>
          )}

          {/* Plan Card */}
          {!isLoading && userPlans.length > 0 && userPlans[currentPlanIndex] && (
            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl p-6 border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 hover:shadow-xl hover:from-[#c199e4]/10 hover:to-white/10 group">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center group-hover:from-[#c199e4]/30 group-hover:to-[#c199e4]/20 transition-all duration-300 border border-[#c199e4]/20 group-hover:scale-110">
                  <PiStrategyBold className="text-[#c199e4] size-6"/>
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
                  <span className={`text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 ${
                    userPlans[currentPlanIndex].status === 'ACTIVE' 
                      ? 'bg-green-400/20 text-green-300 border border-green-400/40 group-hover:bg-green-400/30' 
                      : userPlans[currentPlanIndex].status === 'PAUSED'
                      ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 group-hover:bg-yellow-400/30'
                      : userPlans[currentPlanIndex].status === 'COMPLETED'
                      ? 'bg-blue-400/20 text-blue-300 border border-blue-400/40 group-hover:bg-blue-400/30'
                      : 'bg-gray-400/20 text-gray-300 border border-gray-400/40'
                  }`}>
                    {userPlans[currentPlanIndex].status}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-white/5 to-transparent rounded-2xl p-4 border border-white/10 hover:border-[#c199e4]/30 transition-all duration-300 group/item">
                    <p className="text-xs text-white/70 mb-2 font-medium">Investment Amount</p>
                    <p className="text-2xl font-bold text-white group-hover/item:text-[#c199e4] transition-colors duration-300">
                      ${parseFloat(userPlans[currentPlanIndex].amount).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-white/5 to-transparent rounded-2xl p-4 border border-white/10 hover:border-[#c199e4]/30 transition-all duration-300 group/item">
                    <p className="text-xs text-white/70 mb-2 font-medium">Frequency</p>
                    <p className="text-2xl font-bold text-white group-hover/item:text-[#c199e4] transition-colors duration-300">
                      {formatInterval(userPlans[currentPlanIndex].intervalMinutes)}
                    </p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-[#c199e4]/10 to-transparent rounded-2xl p-4 border border-[#c199e4]/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-white/90 font-medium">Total Invested</p>
                    <p className="text-sm text-[#c199e4] font-medium">
                      {userPlans[currentPlanIndex].executionCount}/{userPlans[currentPlanIndex].totalExecutions} executions
                    </p>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-2xl font-bold text-[#c199e4]">
                      ${(parseFloat(userPlans[currentPlanIndex].amount) * userPlans[currentPlanIndex].executionCount).toFixed(2)}
                    </p>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-[#c199e4] to-emerald-400 h-3 rounded-full transition-all duration-700 shadow-sm"
                      style={{ width: `${(userPlans[currentPlanIndex].executionCount / userPlans[currentPlanIndex].totalExecutions) * 100}%` }}
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
                  <HiOutlineArrowNarrowRight className="size-5"/>
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
                    ? 'bg-white shadow-lg scale-125' 
                    : 'bg-white/40 hover:bg-white/60'
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
                  <PiStrategyBold className="text-[#c199e4] size-6"/>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#c199e4] transition-colors duration-300">
                      DCA Strategy
                    </h3>
                    <p className="text-sm text-white/70">
                      {selectedPlan.fromToken} → {selectedPlan.toToken} Investment Plan
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
              <div className="flex items-center justify-between p-3  backdrop-blur-lg rounded-2xl border border-[#c199e4]/20">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-4 py-2 rounded-full transition-all duration-300 ${
                    selectedPlan.status === 'ACTIVE' 
                      ? 'bg-green-400/20 text-green-300 border border-green-400/40 group-hover:bg-green-400/30' 
                      : selectedPlan.status === 'PAUSED'
                       ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 group-hover:bg-yellow-400/30'
                      : selectedPlan.status === 'COMPLETED'
                      ? 'bg-blue-400/20 text-blue-300 border border-blue-400/40 group-hover:bg-blue-400/30'
                      : 'bg-gray-400/20 text-gray-300 border border-gray-400/40'
                  }`}>
                    {selectedPlan.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  {selectedPlan.status === "ACTIVE" && (
                    <button
                      onClick={() => handlePausePlan(selectedPlan.id)}
                      className="w-full bg-gradient-to-r from-[#c199e4]/20 to-[#c199e4]/10 hover:from-[#c199e4]/30 hover:to-[#c199e4]/20 text-white font-semibold py-3 px-5 rounded-2xl transition-all duration-300 text-sm border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg group-hover:scale-[1.02]"
                    >
                      Pause
                    </button>
                  )}
                  {selectedPlan.status === "PAUSED" && (
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
                <div className="backdrop-blur-lg rounded-2xl p-3 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">From Token</p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">{selectedPlan.fromToken}</p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-3 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">To Token</p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">{selectedPlan.toToken}</p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-3 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">Amount</p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">${parseFloat(selectedPlan.amount).toFixed(2)}</p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-3 border border-[#c199e4]/20 transition-all duration-300 group">
                  <p className="text-sm text-gray-400 mb-2 font-medium">Interval</p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">{formatInterval(selectedPlan.intervalMinutes)}</p>
                </div>
                <div className="backdrop-blur-lg rounded-2xl p-3 border border-[#c199e4]/20 transition-all duration-300 group col-span-2">
                  <p className="text-sm text-gray-400 mb-2 font-medium">Duration</p>
                  <p className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors duration-300">{formatDuration(selectedPlan.durationWeeks)}</p>
                </div>
              </div>

              {/* Slippage */}
              <div className="rounded-2xl p-4 border border-[#c199e4]/20">
                <p className="text-sm text-gray-300 font-medium mb-2">Slippage Tolerance</p>
                <p className="text-lg font-bold text-gray-100">{(parseFloat(selectedPlan.slippage) * 100).toFixed(2)}%</p>
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
                  <p className="text-2xl font-bold text-gray-100">${(parseFloat(selectedPlan.amount) * selectedPlan.executionCount).toFixed(2)}</p>
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
                    {selectedPlan.nextExecution ? 
                      new Date(selectedPlan.nextExecution).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      }) : 
                      'No upcoming execution'
                    }
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
