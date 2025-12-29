import { useState, useCallback, useEffect } from "react";
import { PlanSimulationState, ChatMessage } from "../types";
import { calculateStepState, createMessageId } from "../utils/helpers";
import { PLAN_SIMULATION_DURATION_MS } from "../constants";

export function usePlanSimulation() {
  const [planSimulation, setPlanSimulation] =
    useState<PlanSimulationState | null>(null);
  const [microTicker, setMicroTicker] = useState(0);
  const [isPlanCreationLoading, setIsPlanCreationLoading] = useState(false);

  const startPlanCreationSimulation = useCallback(() => {
    setIsPlanCreationLoading(true);

    // Prime simulation progress immediately so the UI shows without delay.
    // Always create fresh simulation state for new plan creation
    const initial = calculateStepState(0);
    setPlanSimulation({
      startedAt: Date.now(),
      progress: 0,
      etaMs: PLAN_SIMULATION_DURATION_MS,
      activeStepIndex: initial.activeIndex,
      stepStatuses: initial.statuses,
    });
  }, []);

  const stopPlanCreationSimulation = useCallback(() => {
    setIsPlanCreationLoading(false);
    setPlanSimulation(null);
    setMicroTicker(0);
  }, []);

  // Micro-ticker for smooth ETA countdown
  useEffect(() => {
    if (!isPlanCreationLoading || !planSimulation) return;
    const interval = setInterval(() => {
      setMicroTicker((prev) => prev + 1);
    }, 10);
    return () => clearInterval(interval);
  }, [isPlanCreationLoading, planSimulation]);

  // Update simulation progress
  // useEffect(() => {
  //   if (!isPlanCreationLoading || !planSimulation) return;
  //   const elapsed = Date.now() - planSimulation.startedAt;
  //   const progress = Math.min(elapsed / PLAN_SIMULATION_DURATION_MS, 1);
  //   const etaMs = Math.max(0, PLAN_SIMULATION_DURATION_MS - elapsed);
  //   const stepState = calculateStepState(progress);

  //   setPlanSimulation((prev) =>
  //     prev
  //       ? {
  //           ...prev,
  //           progress,
  //           etaMs,
  //           activeStepIndex: stepState.activeIndex,
  //           stepStatuses: stepState.statuses,
  //         }
  //       : null
  //   );
  // }, [microTicker, isPlanCreationLoading, planSimulation]);

  useEffect(() => {
    if (!isPlanCreationLoading) return;

    setPlanSimulation((prev) => {
      if (!prev) return null;

      const elapsed = Date.now() - prev.startedAt;
      const progress = Math.min(elapsed / PLAN_SIMULATION_DURATION_MS, 1);
      const etaMs = Math.max(0, PLAN_SIMULATION_DURATION_MS - elapsed);

      const stepState = calculateStepState(progress);

      return {
        ...prev,
        progress,
        etaMs,
        activeStepIndex: stepState.activeIndex,
        stepStatuses: stepState.statuses,
      };
    });
  }, [microTicker, isPlanCreationLoading]);

  return {
    planSimulation,
    microTicker,
    isPlanCreationLoading,
    setIsPlanCreationLoading,
    startPlanCreationSimulation,
    stopPlanCreationSimulation,
  };
}
