import React from "react";
import { motion } from "framer-motion";
import { HiOutlineWallet, HiOutlineArrowDownRight } from "react-icons/hi2";
import { HiOutlineClipboard } from "react-icons/hi";

interface UserGreetingCardProps {
  isConnected: boolean;
  userGreeting: string;
  address?: string;
  chain?: any;
  copied: boolean;
  showWrongNetworkTooltip: boolean;
  setActiveTab: (tab: any) => void;
  setCopied: (copied: boolean) => void;
  setShowWrongNetworkTooltip: (show: boolean) => void;
}

export function UserGreetingCard({
  isConnected,
  userGreeting,
  address,
  chain,
  copied,
  showWrongNetworkTooltip,
  setActiveTab,
  setCopied,
  setShowWrongNetworkTooltip,
}: UserGreetingCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
      <h1 className="text-xl font-bold text-white">
        {isConnected ? userGreeting : "Please connect your wallet !"}
      </h1>
      {!isConnected && (
        <div className="mt-3">
          <p className="text-sm text-white/70 mb-3">
            Connect your wallet to view balances and manage your DCA strategies.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setActiveTab("wallet" as any);
            }}
            className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-[#c199e4]/30 to-[#b380db]/20 hover:from-[#c199e4]/40 hover:to-[#b380db]/30 text-white text-sm font-semibold rounded-xl border border-[#c199e4]/40 hover:border-[#c199e4]/60 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <HiOutlineWallet className="w-5 h-5" />
            <span>Connect Wallet</span>
            <HiOutlineArrowDownRight className="w-4 h-4" />
          </motion.button>
        </div>
      )}
      {address && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-1.5 text-white/70">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse aspect-square"></div>
            <span className="text-sm">Connected:</span>
            <code className="text-xs bg-white/20 px-2 py-1 rounded-md">
              {address.slice(0, 6)}...{address.slice(-4)}
            </code>
            <button
              className={`inline-flex items-center px-1.5 py-0.5 rounded transition ${
                copied ? "bg-green-400/20" : "hover:bg-white/20"
              }`}
              title={copied ? "Copied!" : "Copy address"}
              onClick={() => {
                navigator.clipboard.writeText(address);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              type="button"
            >
              <HiOutlineClipboard
                className={`w-3.5 h-3.5 transition ${
                  copied ? "text-green-400" : "text-white/70 hover:text-white"
                }`}
              />
            </button>
            <code className="text-xs px-1 rounded-full transition-all duration-300">
              {chain?.name === "Arbitrum One" ? (
                <img
                  src="https://cdn3d.iconscout.com/3d/premium/thumb/arbitrum-arb-3d-icon-png-download-11757502.png"
                  alt="Arbitrum Logo"
                  className="inline-block w-5 h-5 mr-1 -mt-0.3 transition-all duration-300"
                />
              ) : (
                <span className="relative">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-yellow-400 hover:underline focus:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowWrongNetworkTooltip(!showWrongNetworkTooltip);
                    }}
                    title="Wrong network"
                  >
                    <svg
                      className="w-4 h-4 mr-0.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      />
                      <line
                        x1="12"
                        y1="8"
                        x2="12"
                        y2="12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle cx="12" cy="16" r="1" fill="currentColor" />
                    </svg>
                  </button>
                  {showWrongNetworkTooltip && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowWrongNetworkTooltip(false);
                        }}
                      />
                      <div className="absolute z-50 right-0 top-full mt-2 translate-x-0 sm:-translate-x-2 max-w-[min(calc(100vw-1rem),250px)] w-[280px] rounded-lg bg-[#c199e4] text-xs text-white px-2 py-2 shadow-2xl border border-green-400/20 whitespace-normal break-words">
                        Please switch to Arbitrum One !
                      </div>
                    </>
                  )}
                </span>
              )}
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
