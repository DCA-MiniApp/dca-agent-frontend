import { StepStatus } from "../types";
import { PLAN_SIMULATION_STEPS } from "../constants";

// Helper to format addresses nicely (e.g., 0x1234...ABCD)
export function formatAddress(
  address: string,
  prefixLength = 6,
  suffixLength = 4
): string {
  if (!address) return "";
  if (address.length <= prefixLength + suffixLength) return address;
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

// Helper to format long text for mobile display
export function formatLongText(text: string, maxLength = 20): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, 8)}...${text.slice(-6)}`;
}

export const createMessageId = (prefix = "msg"): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const formatFastEta = (etaMs: number, ticker = 0): string => {
  const totalMs = Math.max(0, Math.floor(etaMs));
  const minutes = Math.floor(totalMs / 60000)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor((totalMs % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  const centis = (ticker % 100).toString().padStart(2, "0");
  return `${minutes}:${seconds}:${centis}`;
};

export const calculateStepState = (
  progress: number
): { activeIndex: number; statuses: StepStatus[] } => {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  let cumulative = 0;
  let activeIndex = PLAN_SIMULATION_STEPS.length - 1;

  for (let i = 0; i < PLAN_SIMULATION_STEPS.length; i++) {
    cumulative += PLAN_SIMULATION_STEPS[i].weight;
    if (clampedProgress <= cumulative) {
      activeIndex = i;
      break;
    }
  }

  const statuses = PLAN_SIMULATION_STEPS.map((_, index) => {
    if (index < activeIndex) return "complete";
    if (index === activeIndex)
      return clampedProgress >= 1 ? "complete" : "active";
    return "pending";
  });

  return { activeIndex, statuses };
};

// Helper to detect if user is requesting plan creation
export function isPlanCreationRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Keywords that indicate plan creation intent
  const planCreationKeywords = [
    "create",
    "start",
    "set up",
    "begin",
    "initiate",
    "establish",
    "dca plan",
    "investment plan",
    "strategy",
    "automated",
    "buy",
    "invest",
    "purchase",
    "dollar cost average",
  ];

  // Check if message contains plan creation keywords
  const hasPlanKeywords = planCreationKeywords.some((keyword) =>
    lowerMessage.includes(keyword)
  );

  // Also check for specific tokens and amounts (indicating concrete plan)
  const hasTokenMentions = /(usdc|usdt|dai|eth|btc|arb|link|uni)\s+\d+/.test(
    lowerMessage
  );
  const hasAmountMentions =
    /\$\d+|\d+\s*(usdc|usdt|dai|eth|btc|arb|link|uni)/i.test(lowerMessage);

  // Check for frequency indicators
  const hasFrequencyIndicators =
    /(daily|weekly|monthly|hourly|every\s+\d+)/i.test(lowerMessage);

  // Check for duration indicators
  const hasDurationIndicators =
    /(for\s+\d+|over\s+\d+|weeks?|months?|days?)/i.test(lowerMessage);

  // Return true if we have plan keywords AND either specific details OR frequency/duration indicators
  return (
    hasPlanKeywords &&
    (hasTokenMentions ||
      hasAmountMentions ||
      hasFrequencyIndicators ||
      hasDurationIndicators)
  );
}
