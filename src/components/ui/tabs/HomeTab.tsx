"use client";

import { useAccount } from "wagmi";
import { truncateAddress } from "../../../lib/truncateAddress";
import { useMiniApp } from "@neynar/react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { useEffect, useState } from "react";

/**
 * HomeTab component displays the main landing content for the mini app.
 *
 * This is the default tab that users see when they first open the mini app.
 * It provides a user greeting, active investment plan, and USDC balance.
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

export function HomeTab() {
  const { address, isConnected } = useAccount();
  const { context } = useMiniApp();

  const { data: usdcRawBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "balanceOf",
    args: [address],
  });

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

  // Dummy data - replace with actual data later
  const userGreeting = `${getTimeGreeting()}, ${context?.user?.username} 👋`;
  const activePlan = {
    name: "DCA Strategy #1",
    status: "Active",
    nextInvestment: "Tomorrow at 9:00 AM",
    totalInvested: "$2,450.00",
    strategy: "Daily $50 into ETH",
  };
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

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] px-4 py-3 space-y-4 overflow-y-auto">
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

      {/* Active Investment Plan Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Active Investment Plan
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your automated investment strategy
            </p>
          </div>
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">
            {activePlan.status}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Plan Name
            </span>
            <span className="text-xs font-medium text-gray-900 dark:text-white">
              {activePlan.name}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Strategy
            </span>
            <span className="text-xs font-medium text-gray-900 dark:text-white">
              {activePlan.strategy}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Total Invested
            </span>
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              {activePlan.totalInvested}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Next Investment
            </span>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {activePlan.nextInvestment}
            </span>
          </div>
        </div>

        <button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
          View Plan Details
        </button>
      </div>
    </div>
  );
}
