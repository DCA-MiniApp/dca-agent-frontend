"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

interface StatusSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const options = [
  { value: "All", label: "All Status" },
  { value: "SUCCESS", label: "Success" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
];

export function StatusSelect({ value, onChange }: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel =
    options.find((opt) => opt.value === value)?.label || "Select Status";

  // Calculate dropdown position to avoid overlapping
  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const dropdownHeight = 200; // Approximate dropdown height
      
      // Check if there's enough space below
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Check horizontal positioning
      const spaceRight = viewportWidth - rect.left;
      const spaceLeft = rect.left;
      
      // Determine vertical position
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
      
      // Adjust horizontal position if needed
      if (rect.left + rect.width > viewportWidth - 20) {
        // If dropdown would overflow right edge, adjust positioning
        const container = containerRef.current;
        if (container) {
          container.style.position = 'relative';
        }
      }
    }
  }, [open]);

  // Close dropdown when clicking outside and handle resize
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleResize = () => {
      if (open) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleResize);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [open]);

  return (
    <div className="relative w-full z-[99999]" ref={containerRef}>
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
            initial={{ opacity: 0, y: dropdownPosition === 'bottom' ? -5 : 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: dropdownPosition === 'bottom' ? -5 : 5 }}
            transition={{ duration: 0.15 }}
            className={`absolute w-full max-h-56 overflow-auto 
            bg-black/95 rounded-2xl border border-white/15 hover:border-[#c199e4]/40 shadow-2xl ring-1 ring-black/50 divide-y divide-white/10 backdrop-blur-lg z-[99999]
            ${dropdownPosition === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'}`}
            style={{
              maxWidth: 'calc(100vw - 2rem)',
              minWidth: '200px',
              left: '0',
              right: '0',
            }}
          >
            <li className="sticky top-0 z-[1] px-3 py-2 text-[11px] uppercase tracking-wide text-white/70 bg-black/90 flex justify-between items-center">
              <span>FILTER STATUS</span>
              <button
                onClick={() => {
                  onChange("All");
                  setOpen(false);
                }}
                className="text-[#c199e4] hover:text-[#d9b3ed] text-xs transition-colors"
              >
                Clear All
              </button>
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
