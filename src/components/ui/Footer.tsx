import React, { useState, useCallback } from "react";
import { Tab } from "~/components/App";
import { IconType } from "react-icons";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { IoChatbubbleEllipses } from "react-icons/io5";
import { useMiniApp } from "@neynar/react";

interface FooterProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  showWallet?: boolean;
  getTabIcon: (tab: Tab) => IconType;
  isAnimating: boolean;
}

export const Footer: React.FC<FooterProps> = ({ activeTab, setActiveTab, showWallet = false }) => {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);
  const { haptics } = useMiniApp();
  
  const triggerHaptic = useCallback(() => {
    try {
      const result = haptics?.impactOccurred?.("light");
      if (result instanceof Promise) {
        result.catch(() => undefined);
      }
    } catch (err) {
      console.warn("Haptics error:", err);
    }
  }, [haptics]);
  const handleChatClick = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    // After animation delay, navigate to chat
    setTimeout(() => {
      router.push('/chat');
      setIsAnimating(false);
    }, 1200); // Same duration as other tab animations
  };
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
    <div className="h-full flex flex-col items-center justify-center relative bg-transparent pt-5 pb-3">
      <div className="relative mb-5">
        {/* Central Circle */}
        <div className="size-[70px] rounded-full border-2 border-white/40 bg-transparent relative">
          {/* Animated White Dot Indicator */}
          <div 
            className="absolute w-2 h-2 bg-white rounded-full transition-all duration-300 ease-in-out"
            style={getActiveDotPosition()}
          />
        </div>

        {/* Home Tab - Top */}
        <button
          onClick={() => {
            triggerHaptic();
            setActiveTab(Tab.Home);
          }}
          className="absolute text-white text-[11px] font-medium hover:text-white/80 transition-all duration-200"
          style={getTabPosition(Tab.Home)}
        >
          HOME
        </button>

        {/* Actions Tab - Right */}
        <button
          onClick={() => {
            triggerHaptic();
            handleChatClick();
          }}
          className="absolute text-white text-[11px] font-medium hover:text-white/80 transition-all duration-200"
          style={getTabPosition(Tab.Actions)}
        >
          CHAT
        </button>

        {/* Context Tab - Bottom */}
        <button
          onClick={() => {
            triggerHaptic();
            setActiveTab(Tab.Context);
          }}
          className="absolute text-white text-[11px] font-medium hover:text-white/80 transition-all duration-200"
          style={getTabPosition(Tab.Context)}
        >
          HISTORY
        </button>

        {/* Wallet Tab - Left */}
        {showWallet && (
          <button
            onClick={() => {
              triggerHaptic();
              setActiveTab(Tab.Wallet);
            }}
            className="absolute text-white text-[11px] font-medium hover:text-white/80 transition-all duration-200"
            style={getTabPosition(Tab.Wallet)}
          >
            WALLET
          </button>
        )}
      </div>

      {/* Attribution text below navigation controls */}
      <div className="pointer-events-auto rounded-full border border-white/15 bg-black/40 backdrop-blur-md text-white/80 text-[11px] px-3 py-1.5 shadow-lg mt-4 max-w-[450px] mx-auto">
        <span className="whitespace-nowrap">
          Protected by <span className="font-semibold text-white">TriggerX</span> & Powered by <span className="font-semibold text-white">Vibekit</span>. 
          <span className="ml-1 text-white/70">Live on </span>
          <a href="https://arbitrum.io/" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#c199e4] hover:text-[#c199e4]/80 transition-colors">
            Arbitrum One
          </a>
        </span>
      </div>
      
      {/* Chat Animation Overlay */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            className="fixed inset-0 z-100 flex items-center justify-center pointer-events-none backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="bg-gradient-to-br from-[#c199e4]/40 to-[#c199e4]/90 rounded-3xl border border-white/30 shadow-2xl"
              initial={{ 
                scale: 0.5,
                y: 300, // Start from footer position
                x: 0,
                rotate: 0
              }}
              animate={{ 
                scale: [0.5, 1.2, 1],
                y: [300, 0, 0],
                x: [0, 0, 0],
                rotate: [0, 360, 360]
              }}
              exit={{ 
                scale: 0,
                opacity: 0
              }}
              transition={{ 
                duration: 1.2,
                times: [0, 0.7, 1],
                ease: [0.25, 0.46, 0.45, 0.94],
                rotate: { duration: 0.8, ease: "easeInOut" }
              }}
              style={{
                width: 120,
                height: 120,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <IoChatbubbleEllipses size={64} color="white" />
              </motion.div>
            </motion.div>
            
            {/* Ripple effect */}
            <motion.div
              className="absolute rounded-full border-2 border-white/30"
              initial={{ 
                width: 120,
                height: 120,
                scale: 0,
                opacity: 0.8
              }}
              animate={{ 
                scale: [1, 2.5, 4],
                opacity: [0.8, 0.3, 0]
              }}
              transition={{ 
                duration: 1.2,
                ease: "easeOut"
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
