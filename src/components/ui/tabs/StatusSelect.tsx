"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

interface StatusSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const options = [
  { value: "All", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "disable", label: "Paused" },
  { value: "success", label: "Completed" },
  { value: "failed", label: "Failed" },
];

export function StatusSelect({ value, onChange }: StatusSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel =
    options.find((opt) => opt.value === value)?.label || "Select Status";

  return (
    <div className="relative w-full z-[200]">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-br from-white/10 to-white/5 
        backdrop-blur-lg rounded-xl border border-white/15 text-white hover:border-[#c199e4]/40 shadow-sm
        focus:outline-none focus:ring-2 focus:ring-[#c199e4]/60 text-sm font-medium transition-all duration-300"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-[#c199e4] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-[300] mt-2 w-full max-h-56 overflow-auto 
            bg-black/85 rounded-2xl border border-white/15 hover:border-[#c199e4]/40 shadow-2xl ring-1 ring-black/50 divide-y divide-white/10"
          >
            <li className="sticky top-0 z-[1] px-3 py-2 text-[11px] uppercase tracking-wide text-white/70 bg-black/90">
              Filter status
            </li>
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-sm transition-colors flex items-center justify-between 
                  ${
                    value === opt.value
                      ? "bg-[#c199e4]/20 text-white"
                      : "text-white/80 hover:bg-[#c199e4]/15 hover:text-white"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  <Check
                    className={`${
                      value === opt.value ? "opacity-100" : "opacity-0"
                    } 
                    w-4 h-4 text-[#c199e4] transition-opacity`}
                  />
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
