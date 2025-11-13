import { Metadata } from "next";
import { JobMonitor } from "~/components/ui/JobMonitor";

export const metadata: Metadata = {
  title: "Job Monitor | DCA Agent",
  description: "Real-time tracking of jobs, swaps, and transactions",
};

export default function MonitorPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <JobMonitor />
    </div>
  );
}

