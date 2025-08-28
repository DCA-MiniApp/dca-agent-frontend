import React from "react";
import { Tab } from "~/components/App";
import { motion } from "framer-motion";
import { IconType } from "react-icons";

interface FooterProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  showWallet?: boolean;
  getTabIcon: (tab: Tab) => IconType;
  isAnimating: boolean;
}

export const Footer: React.FC<FooterProps> = ({ activeTab, setActiveTab, showWallet = false }) => {
  const getTabPosition = (tab: Tab) => {
    switch (tab) {
      case Tab.Home: return { top: "-20px", left: "50%", transform: "translateX(-50%)" }; // Top
      case Tab.Actions: return { right: "-32px", top: "50%", transform: "translateY(-50%)" }; // Right
      case Tab.Context: return { bottom: "-20px", left: "50%", transform: "translateX(-50%)" }; // Bottom
      case Tab.Wallet: return { left: "-46px", top: "50%", transform: "translateY(-50%)" }; // Left
      default: return { top: "-20px", left: "50%", transform: "translateX(-50%)" };
    }
  };

  const getActiveDotPosition = () => {
    const positions = {
      [Tab.Home]: { top: "6px", left: "50%", transform: "translateX(-50%)" },
      [Tab.Actions]: { right: "6px", top: "50%", transform: "translateY(-50%)" },
      [Tab.Context]: { bottom: "6px", left: "50%", transform: "translateX(-50%)" },
      [Tab.Wallet]: { left: "6px", top: "50%", transform: "translateY(-50%)" }
    };
    return positions[activeTab] || positions[Tab.Home];
  };

  return (
    <div className="h-full flex items-center justify-center relative bg-transparent ">
      <div className="relative">
        {/* Central Circle */}
        <div className="w-20 h-20 rounded-full border-2 border-white/40 bg-transparent relative">
          {/* Animated White Dot Indicator */}
          <div 
            className="absolute w-2 h-2 bg-white rounded-full transition-all duration-300 ease-in-out"
            style={getActiveDotPosition()}
          />
        </div>

        {/* Home Tab - Top */}
        <button
          onClick={() => setActiveTab(Tab.Home)}
          className="absolute text-white text-xs font-medium hover:text-white/80 transition-all duration-200"
          style={getTabPosition(Tab.Home)}
        >
          HOME
        </button>

        {/* Actions Tab - Right */}
        <button
          onClick={() => setActiveTab(Tab.Actions)}
          className="absolute text-white text-xs font-medium hover:text-white/80 transition-all duration-200"
          style={getTabPosition(Tab.Actions)}
        >
          CHAT
        </button>

        {/* Context Tab - Bottom */}
        <button
          onClick={() => setActiveTab(Tab.Context)}
          className="absolute text-white text-xs font-medium hover:text-white/80 transition-all duration-200"
          style={getTabPosition(Tab.Context)}
        >
          HISTORY
        </button>

        {/* Wallet Tab - Left */}
        {showWallet && (
          <button
            onClick={() => setActiveTab(Tab.Wallet)}
            className="absolute text-white text-xs font-medium hover:text-white/80 transition-all duration-200"
            style={getTabPosition(Tab.Wallet)}
          >
            WALLET
          </button>
        )}
      </div>
    </div>
  );
};
