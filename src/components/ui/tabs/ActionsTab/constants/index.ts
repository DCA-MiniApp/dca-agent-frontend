export const PLAN_SIMULATION_DURATION_MS = 120000; // 2 minutes

export interface PlanSimulationStep {
  id: string;
  label: string;
  description: string;
  weight: number;
}

export const PLAN_SIMULATION_STEPS: PlanSimulationStep[] = [
  {
    id: "validate",
    label: "Validating strategy details",
    description: "Double-checking token amounts & frequency",
    weight: 0.15,
  },
  {
    id: "triggerx-shape",
    label: "Forming plan data for TriggerX",
    description: "Passing automation-ready details to TriggerX",
    weight: 0.14,
  },
  {
    id: "automation-config",
    label: "Configuring automation script content",
    description: "Defining the instructions TriggerX will execute",
    weight: 0.14,
  },
  {
    id: "plan-validation",
    label: "Checking plan data validation",
    description: "Re-running guards on interval, duration & totals",
    weight: 0.14,
  },
  {
    id: "deposit-balance",
    label: "Checking deposit balance",
    description: "Verifying you have enough deposit to execute your plan",
    weight: 0.14,
  },
  {
    id: "create-job",
    label: "Creating TriggerX job",
    description: "Calling createJob function to register your automation",
    weight: 0.14,
  },
  {
    id: "finalize",
    label: "Finalizing your plan",
    description: "Locking everything to execute on time",
    weight: 0.15,
  },
];

export const QUICK_CREATE_TOKENS = ["WETH", "ARB", "WBTC", "GMX", "AAVE", "wstETH"];
