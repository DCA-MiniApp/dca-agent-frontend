import { useState, useCallback } from "react";
import { deleteTriggerXJobForPlan } from "../../../../../lib/triggerXIntegration";
import { updatePlanJobId, type DCAPlan } from "../../../../../lib/api";

export function usePlanManagement(
  wagmiWalletClient: any,
  fetchUserData: () => Promise<void>
) {
  const [selectedPlan, setSelectedPlan] = useState<DCAPlan | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);

  const handleCopyPlanId = () => {
    if (selectedPlan?.jobId) {
      navigator.clipboard.writeText(selectedPlan.jobId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const handleDeletePlan = async (plan: DCAPlan) => {
    try {
      setIsDeleting(true);

      if (plan.jobId) {
        let signer: any = null;
        try {
          const { BrowserProvider } = await import("ethers");

          if (
            wagmiWalletClient?.transport &&
            (wagmiWalletClient.transport as any).request
          ) {
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

        const deleteJobResult = await deleteTriggerXJobForPlan(
          plan.jobId,
          signer,
          "42161"
        );

        console.log("Delete job result:", deleteJobResult);

        if (deleteJobResult.error === "user_rejected") {
          console.log("ℹ️ User cancelled job deletion");
          setIsDeleting(false);
          return;
        }

        if (deleteJobResult.success === true) {
          const updateSuccess = await updatePlanJobId(
            plan.userAddress,
            plan.jobId
          );
          if (updateSuccess) {
            await fetchUserData();
            setShowPlanModal(false);
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
    console.log("=== SELECTED PLAN DETAILS ===");
    console.log("Full plan object:", plan);
    console.log("Job Status:", plan.jobStatus);
    console.log("Success Count:", plan.successCount);
    console.log("Total Executions:", plan.totalExecutions);
    console.log("========================");
    setShowPlanModal(true);
  };

  const closePlanModal = () => {
    setShowPlanModal(false);
    setSelectedPlan(null);
  };

  const goToNextPlan = useCallback((totalPlans: number) => {
    setCurrentPlanIndex((prev) => (prev === totalPlans - 1 ? 0 : prev + 1));
  }, []);

  const goToPrevPlan = useCallback((totalPlans: number) => {
    setCurrentPlanIndex((prev) => (prev === 0 ? totalPlans - 1 : prev - 1));
  }, []);

  return {
    selectedPlan,
    showPlanModal,
    isDeleting,
    copied,
    currentPlanIndex,
    setCurrentPlanIndex,
    handleCopyPlanId,
    handleDeletePlan,
    openPlanModal,
    closePlanModal,
    goToNextPlan,
    goToPrevPlan,
  };
}
