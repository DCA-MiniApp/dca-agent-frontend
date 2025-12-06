"use client";

import { useAccount, useWalletClient } from "wagmi";
import { useMiniApp } from "@neynar/react";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Tab } from "../../App";
import { QUICKSTART_PREFILL_KEY } from "../../../lib/constants";
import {
  fetchUserDCAPlans,
  calculateTotalInvested,
  fetchQuickStats,
  type DCAPlan,
} from "../../../lib/api";
import {
  computePlansInvestedUsd,
  calculateWalletTotalUsdValue,
} from "../../../lib/utils";
import { useFooterVisibility } from "../FooterVisibilityContext";
import tokenMapData from "../../../tokenMap_arbitrum.json";

// Import custom hooks
import {
  useSDK,
  useTriggerX,
  usePlanManagement,
  useOnboarding,
} from "./HomeTab/hooks";

// Import components
import {
  UserGreetingCard,
  PlatformStatsCard,
  QuickStartCard,
  PortfolioCard,
  WalletBalanceCard,
  TriggerXTopUpCard,
  TriggerXWithdrawCard,
  PlansSlider,
  PlanDetailsModal,
  TokenSearchModal,
} from "./HomeTab/components";

// Import utilities
import { formatContractAddress } from "./HomeTab/utils/helpers";

/**
 * HomeTab component displays the main landing content for the mini app.
 */
export function HomeTab() {
  const { address, isConnected, chain } = useAccount();
  const { data: wagmiWalletClient } = useWalletClient();
  const { haptics, setActiveTab } = useMiniApp() as any;
  const router = useRouter();
  const { setVisible: setFooterVisible } = useFooterVisibility();

  // SDK and onboarding hooks
  const { context, isSDKLoaded } = useSDK();
  const {
    showOnboarding,
    setShowOnboarding,
  } = useOnboarding();

  // TriggerX balance management
  const {
    tgBalance,
    topupAmount,
    withdrawAmount,
    isTopupLoading,
    isWithdrawLoading,
    topupStatus,
    withdrawStatus,
    setTopupAmount,
    setWithdrawAmount,
    handleTopupTg,
    handleWithdrawTg,
  } = useTriggerX(isConnected, address, wagmiWalletClient);

  // State management
  const [userPlans, setUserPlans] = useState<DCAPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalInvested, setTotalInvested] = useState(0);
  const [portfolioUsd, setPortfolioUsd] = useState<number | null>(null);
  const [walletTotalUsd, setWalletTotalUsd] = useState<number | null>(null);
  const [isWalletValueLoading, setIsWalletValueLoading] = useState(false);

  // UI state
  const [showTooltip, setShowTooltip] = useState(false);
  const [showWrongNetworkTooltip, setShowWrongNetworkTooltip] = useState(false);
  const [showTgTooltip, setShowTgTooltip] = useState(false);
  const [showTokenSearch, setShowTokenSearch] = useState(false);
  const [tokenSearchQuery, setTokenSearchQuery] = useState("");
  const [tokenSearchResults, setTokenSearchResults] = useState<
    { symbol: string; address: string; name?: string }[]
  >([]);
  const [copied, setCopied] = useState(false);
  const tokenSearchInputRef = useRef<HTMLInputElement>(null);

  // Quick stats state
  const [totalExecutions, setTotalExecutions] = useState(0);
  const [totalValueSwapped, setTotalValueSwapped] = useState(0);
  const [isQuickStatsLoading, setIsQuickStatsLoading] = useState(true);

  // Token entries memoized
  const tokenEntries = useMemo(
    () => Object.entries(tokenMapData.tokenMap || {}),
    []
  );

  // Plan management hook
  const fetchUserData = useCallback(async () => {
    if (!address) {
      setUserPlans([]);
      setTotalInvested(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const plans = await fetchUserDCAPlans(address);
      setUserPlans(plans);
      setTotalInvested(calculateTotalInvested(plans));

      try {
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

      if (plans.length > 0 && currentPlanIndex >= plans.length) {
        setCurrentPlanIndex(0);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const {
    selectedPlan,
    showPlanModal,
    isDeleting,
    currentPlanIndex,
    setCurrentPlanIndex,
    handleDeletePlan,
    openPlanModal,
    closePlanModal,
  } = usePlanManagement(wagmiWalletClient, fetchUserData);

  // Haptic feedback
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

  // Token helpers
  const getTokenAddressForSymbol = useCallback((symbol: string) => {
    const listing = (
      tokenMapData.tokenMap as Record<string, { address: string }[]>
    )[symbol.toUpperCase()];
    return listing?.[0]?.address ?? "";
  }, []);

  const handleQuickStartToken = useCallback(
    (symbol: string) => {
      triggerHaptic();
      const template = `Create a DCA plan with 10 USDC into ${symbol} every 24 hours for 10 days`;
      if (typeof window !== "undefined") {
        sessionStorage.setItem(QUICKSTART_PREFILL_KEY, template);
      }
      if (router) {
        router.push("/chat");
      } else {
        setActiveTab?.(Tab.Actions);
      }
    },
    [router, setActiveTab, triggerHaptic]
  );

  const handleTokenSearchSelect = useCallback(
    (symbol: string) => {
      handleQuickStartToken(symbol);
      setShowTokenSearch(false);
    },
    [handleQuickStartToken]
  );

  const closeTokenSearch = useCallback(() => {
    setShowTokenSearch(false);
  }, []);

  // Token search logic
  useEffect(() => {
    if (!tokenSearchQuery.trim()) {
      setTokenSearchResults([]);
      return;
    }
    const normalized = tokenSearchQuery.trim().toLowerCase();
    const matches = tokenEntries
      .filter(([symbol]) => symbol.toLowerCase().includes(normalized))
      .slice(0, 25)
      .map(([symbol, infos]) => ({
        symbol,
        address: infos?.[0]?.address ?? "",
        name: infos?.[0]?.name ?? symbol,
      }));
    setTokenSearchResults(matches);
  }, [tokenSearchQuery, tokenEntries]);

  useEffect(() => {
    if (showTokenSearch) {
      const timeout = setTimeout(
        () => tokenSearchInputRef.current?.focus(),
        80
      );
      return () => clearTimeout(timeout);
    }
    setTokenSearchQuery("");
    setTokenSearchResults([]);
  }, [showTokenSearch]);

  useEffect(() => {
    setFooterVisible(!showTokenSearch);
    return () => setFooterVisible(true);
  }, [showTokenSearch, setFooterVisible]);

  // Fetch user data on mount and address change
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Fetch wallet total USD value
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

  // Quick stats loading
  useEffect(() => {
    let isCancelled = false;

    const loadQuickStats = async (opts?: { fromInterval?: boolean }) => {
      try {
        if (!opts?.fromInterval) {
          setIsQuickStatsLoading(true);
        }

        const stats = await fetchQuickStats();
        if (isCancelled) return;

        const nextExecutions = stats?.total_job_live_count ?? 0;
        const nextVolume = stats?.total_value_swapped ?? 0;

        setTotalExecutions(nextExecutions);
        setTotalValueSwapped(nextVolume);
      } catch (error) {
        if (!isCancelled) {
          setTotalExecutions(0);
          setTotalValueSwapped(0);
        }
      } finally {
        if (!isCancelled) {
          setIsQuickStatsLoading(false);
        }
      }
    };

    loadQuickStats();

    const intervalId = setInterval(
      () => loadQuickStats({ fromInterval: true }),
      600_000
    );

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  // Hide footer when modals are open
  useEffect(() => {
    setFooterVisible(!showPlanModal);
    return () => setFooterVisible(true);
  }, [showPlanModal, setFooterVisible]);

  useEffect(() => {
    setFooterVisible(!showOnboarding);
    return () => setFooterVisible(true);
  }, [showOnboarding, setFooterVisible]);

  // Handle keyboard navigation for plan slider
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setCurrentPlanIndex((prev) =>
          prev === 0 ? userPlans.length - 1 : prev - 1
        );
      } else if (event.key === "ArrowRight") {
        setCurrentPlanIndex((prev) =>
          prev === userPlans.length - 1 ? 0 : prev + 1
        );
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [userPlans.length, setCurrentPlanIndex]);

  // Computed values
  const userGreeting = `Welcome back, ${
    context?.user?.username ?? "John Doe"
  } 👋`;
  const walletBalanceDisplay =
    walletTotalUsd !== null
      ? `$${walletTotalUsd.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : isWalletValueLoading
      ? "..."
      : "$0.00";

  const activePlans = userPlans.filter((plan) => plan.status === "ACTIVE");
  const runningPlans = userPlans.filter(
    (plan) => plan.jobStatus === "processing" || plan.jobStatus === "pending"
  );

  return (
    <div className="flex flex-col h-full py-3 px-2 pb-20 space-y-6 overflow-y-auto">
      {/* User Greeting */}
      <UserGreetingCard
        isConnected={isConnected}
        userGreeting={userGreeting}
        address={address}
        chain={chain}
        copied={copied}
        showWrongNetworkTooltip={showWrongNetworkTooltip}
        setActiveTab={setActiveTab}
        setCopied={setCopied}
        setShowWrongNetworkTooltip={setShowWrongNetworkTooltip}
      />

      {/* Platform Statistics */}
      <PlatformStatsCard
        isQuickStatsLoading={isQuickStatsLoading}
        totalExecutions={totalExecutions}
        totalValueSwapped={totalValueSwapped}
      />

      {/* Quick Start */}
      <QuickStartCard
        setShowTokenSearch={setShowTokenSearch}
        handleQuickStartToken={handleQuickStartToken}
        formatContractAddress={formatContractAddress}
        getTokenAddressForSymbol={getTokenAddressForSymbol}
      />

      {/* Token Search Modal */}
      <TokenSearchModal
        showTokenSearch={showTokenSearch}
        tokenSearchQuery={tokenSearchQuery}
        tokenSearchResults={tokenSearchResults}
        tokenSearchInputRef={tokenSearchInputRef as React.RefObject<HTMLInputElement>}
        setTokenSearchQuery={setTokenSearchQuery}
        handleTokenSearchSelect={handleTokenSearchSelect}
        closeTokenSearch={closeTokenSearch}
      />
      {/* Investment Plans Slider */}
      <PlansSlider
        isLoading={isLoading}
        isConnected={isConnected}
        userPlans={userPlans}
        currentPlanIndex={currentPlanIndex}
        router={router}
        openPlanModal={openPlanModal}
        goToNextPlan={() => {
          setCurrentPlanIndex((prev) =>
            prev === userPlans.length - 1 ? 0 : prev + 1
          );
        }}
        goToPrevPlan={() => {
          setCurrentPlanIndex((prev) =>
            prev === 0 ? userPlans.length - 1 : prev - 1
          );
        }}
        setCurrentPlanIndex={setCurrentPlanIndex}
        triggerHaptic={triggerHaptic}
      />

      {/* Portfolio Overview */}
      <PortfolioCard
        isLoading={isLoading}
        portfolioUsd={portfolioUsd}
        isConnected={isConnected}
        runningPlans={runningPlans}
        activePlans={activePlans}
        context={context}
      />

      {/* Wallet Total Value */}
      <WalletBalanceCard
        walletBalanceDisplay={walletBalanceDisplay}
        tgBalance={tgBalance}
        showTooltip={showTooltip}
        showTgTooltip={showTgTooltip}
        setShowTooltip={setShowTooltip}
        setShowTgTooltip={setShowTgTooltip}
      />

      {/* TG Top-Up Card */}
      <TriggerXTopUpCard
        topupAmount={topupAmount}
        setTopupAmount={setTopupAmount}
        handleTopupTg={handleTopupTg}
        isTopupLoading={isTopupLoading}
        isConnected={isConnected}
        topupStatus={topupStatus}
      />

      {/* TG Withdraw Card */}
      <TriggerXWithdrawCard
        withdrawAmount={withdrawAmount}
        setWithdrawAmount={setWithdrawAmount}
        handleWithdrawTg={handleWithdrawTg}
        isWithdrawLoading={isWithdrawLoading}
        isConnected={isConnected}
        withdrawStatus={withdrawStatus}
      />

      {/* Plan Details Modal */}
      <PlanDetailsModal
        showPlanModal={showPlanModal}
        selectedPlan={selectedPlan}
        isDeleting={isDeleting}
        closePlanModal={closePlanModal}
        handleDeletePlan={handleDeletePlan}
      />
    </div>
  );
}
