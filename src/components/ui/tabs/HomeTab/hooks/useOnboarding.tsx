import { useState, useEffect } from "react";
import { HiOutlineWallet, HiOutlineDocumentChartBar, HiOutlineCheckCircle, HiOutlineDevicePhoneMobile } from "react-icons/hi2";

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [stepAnimation, setStepAnimation] = useState<"enter" | "exit" | "idle">("idle");
  const [showStepCelebration, setShowStepCelebration] = useState(false);
  const [completedStepIndex, setCompletedStepIndex] = useState<number | null>(null);
  const [showFinalBanner, setShowFinalBanner] = useState(false);

  const [onboardingSteps] = useState([
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

  return {
    showOnboarding,
    currentStepIndex,
    dontShowAgain,
    isTransitioning,
    stepAnimation,
    showStepCelebration,
    completedStepIndex,
    showFinalBanner,
    onboardingSteps,
    setShowOnboarding,
    setCurrentStepIndex,
    setDontShowAgain,
    setIsTransitioning,
    setStepAnimation,
    setShowStepCelebration,
    setCompletedStepIndex,
    setShowFinalBanner,
    completeOnboarding,
    closeOnboarding,
  };
}
