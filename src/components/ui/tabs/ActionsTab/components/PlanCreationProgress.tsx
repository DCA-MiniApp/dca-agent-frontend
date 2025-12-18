import React from "react";
import { PlanSimulationState } from "../types";
import { PLAN_SIMULATION_STEPS } from "../constants";
import { formatFastEta } from "../utils/helpers";

interface PlanCreationProgressProps {
  planSimulation: PlanSimulationState;
  microTicker: number;
}

export function PlanCreationProgress({
  planSimulation,
  microTicker,
}: PlanCreationProgressProps) {
  return (
    <div className="mt-3 space-y-4 rounded-2xl border border-white/15 bg-gradient-to-b from-black/50 to-black/10 p-4 shadow-[0_15px_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between text-[13px] font-semibold text-white">
        <span className="tracking-wide">
          Step{" "}
          <span className="text-[#c199e4]">
            {planSimulation.activeStepIndex + 1}
          </span>{" "}
          of {PLAN_SIMULATION_STEPS.length}
        </span>
        <span className="text-sm font-bold text-[#c199e4]">
          ETA {formatFastEta(planSimulation.etaMs, microTicker)}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#c199e4] via-[#b380db] to-[#8c6fd5] transition-all duration-500"
          style={{
            width: `${Math.max(planSimulation.progress * 100, 4).toFixed(1)}%`,
          }}
        />
      </div>
      <div className="space-y-3">
        {PLAN_SIMULATION_STEPS.map((step, index) => {
          const status = planSimulation.stepStatuses[index] || "pending";
          const statusClasses =
            status === "complete"
              ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
              : status === "active"
                ? "border-[#c199e4] bg-[#c199e4]/10 text-white"
                : "border-white/15 bg-white/5 text-white/50";

          return (
            <div
              key={step.id}
              className={`flex items-start gap-3 rounded-2xl border px-3 py-2 transition-colors ${statusClasses}`}
            >
              <span className="mt-0.5 flex size-6 items-center justify-center rounded-full border border-white/20 bg-black/30">
                {status === "complete" ? (
                  <svg
                    className="size-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : status === "active" ? (
                  <span className="size-2.5 rounded-full bg-current animate-ping" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current/60" />
                )}
              </span>
              <div className="flex-1">
                <div
                  className={`text-sm font-semibold ${
                    status === "pending" ? "text-white/70" : "text-white"
                  }`}
                >
                  {step.label}
                </div>
                <div className="text-[12px] text-white/70 leading-snug">
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-[12px] text-white/60">
        Almost there, we&apos;re running deep checks so your automation launches
        safely.
      </div>
    </div>
  );
}

export function LoadingIndicator() {
  return (
    <div className="mt-2 flex space-x-1">
      <div className="h-2 w-2 animate-bounce rounded-full bg-[#c199e4]"></div>
      <div
        className="h-2 w-2 animate-bounce rounded-full bg-[#c199e4]"
        style={{ animationDelay: "0.1s" }}
      ></div>
      <div
        className="h-2 w-2 animate-bounce rounded-full bg-[#c199e4]"
        style={{ animationDelay: "0.2s" }}
      ></div>
    </div>
  );
}
