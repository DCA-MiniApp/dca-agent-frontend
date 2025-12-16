// Chat message interface
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  // Confirmation flow fields
  requiresConfirmation?: boolean;
  confirmationId?: string;
  confirmationData?: any;
  confirmationStatus?: "pending" | "proceeding" | "cancelled" | "completed";
  // Transaction hash for copy functionality
  transactionHash?: string;
  // Loading state for plan creation
  isCreatingPlan?: boolean;
  // Optional share content to enable a "Share now" button
  shareText?: string;
  // Deposit UI fields
  requiresDeposit?: boolean;
  depositAmount?: string;
  messageIdForDeposit?: string;
}

export type StepStatus = "pending" | "active" | "complete";

export interface PlanSimulationState {
  startedAt: number;
  progress: number;
  etaMs: number;
  activeStepIndex: number;
  stepStatuses: StepStatus[];
}
