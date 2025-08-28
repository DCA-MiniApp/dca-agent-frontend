"use client";

import { useEffect, useState } from "react";
import { useMiniApp } from "@neynar/react";
import { Header } from "~/components/ui/Header";
import { Footer } from "~/components/ui/Footer";
import { HomeTab, ActionsTab, ContextTab, WalletTab } from "~/components/ui/tabs";
import { USE_WALLET } from "~/lib/constants";
import { useNeynarUser } from "../hooks/useNeynarUser";
import { motion, AnimatePresence } from "framer-motion";
import { IoHome, IoChatbubbleEllipses, IoTime, IoWallet } from "react-icons/io5";

// --- Types ---
export enum Tab {
  Home = "home",
  Actions = "actions",
  Context = "context",
  Wallet = "wallet",
}

export interface AppProps {
  title?: string;
}

/**
 * App component serves as the main container for the mini app interface.
 * 
 * This component orchestrates the overall mini app experience by:
 * - Managing tab navigation and state
 * - Handling Farcaster mini app initialization
 * - Coordinating wallet and context state
 * - Providing error handling and loading states
 * - Rendering the appropriate tab content based on user selection
 * 
 * The component integrates with the Neynar SDK for Farcaster functionality
 * and Wagmi for wallet management. It provides a complete mini app
 * experience with multiple tabs for different functionality areas.
 * 
 * Features:
 * - Tab-based navigation (Home, Actions, Context, Wallet)
 * - Farcaster mini app integration
 * - Wallet connection management
 * - Error handling and display
 * - Loading states for async operations
 * 
 * @param props - Component props
 * @param props.title - Optional title for the mini app (defaults to "Neynar Starter Kit")
 * 
 * @example
 * ```tsx
 * <App title="My Mini App" />
 * ```
 */
export default function App(
  { title }: AppProps = { title: "Neynar Starter Kit" }
) {
  // --- Hooks ---
  const {
    isSDKLoaded,
    context,
    setInitialTab,
    setActiveTab,
    currentTab,
  } = useMiniApp();

  // --- Neynar user hook ---
  const { user: neynarUser } = useNeynarUser(context || undefined);

  // --- Animation state ---
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingTab, setAnimatingTab] = useState<Tab | null>(null);
  const [showContent, setShowContent] = useState(true);

  // Tab icon mapping
  const getTabIcon = (tab: Tab) => {
    switch (tab) {
      case Tab.Home: return IoHome;
      case Tab.Actions: return IoChatbubbleEllipses;
      case Tab.Context: return IoTime;
      case Tab.Wallet: return IoWallet;
      default: return IoHome;
    }
  };

  // Custom tab change handler with animation
  const handleTabChange = (newTab: Tab) => {
    if (currentTab === newTab || isAnimating) return;
    
    setIsAnimating(true);
    setAnimatingTab(newTab);
    setShowContent(false);
    
    // After animation delay, switch tab and show content
    setTimeout(() => {
      setActiveTab(newTab);
      setShowContent(true);
      setIsAnimating(false);
      setAnimatingTab(null);
    }, 1200); // Animation duration
  };

  // --- Effects ---
  /**
   * Sets the initial tab to "home" when the SDK is loaded.
   * 
   * This effect ensures that users start on the home tab when they first
   * load the mini app. It only runs when the SDK is fully loaded to
   * prevent errors during initialization.
   */
  useEffect(() => {
    if (isSDKLoaded) {
      setInitialTab(Tab.Home);
    }
  }, [isSDKLoaded, setInitialTab]);

  // --- Early Returns ---
  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="spinner h-8 w-8 mx-auto mb-4"></div>
          <p>Loading SDK...</p>
        </div>
      </div>
    );
  }

  // --- Render ---
  return (
    <div className="relative font-titillium h-screen overflow-hidden">
      {/* Background Elements - Fixed */}
      {/* White dots overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[20vh] pointer-events-none z-0">
          <div className="relative w-full h-full">
            {/* Create a grid of dots with opacity gradient */}
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at center, #ffffff66 1px, transparent 1px)`,
              backgroundSize: '10px 10px',
              backgroundPosition: '0 0',
              opacity: 1,
              maskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0) 100%)'
            }} />
          </div>
        </div>

        {/* purple gradients */}
        <div className="absolute top-[5%] left-[2%] w-[300px] h-[300px] bg-[#341e64]/40 blur-3xl opacity-100 rounded-full z-0"/>
        <div className="absolute bottom-[10%] right-[4%] w-[200px] h-[200px] bg-[#341e64]/60 blur-3xl opacity-100 rounded-full z-0"/>
        <div className="absolute bottom-[35%] right-[8%] w-[150px] h-[150px] bg-[#c199e4]/50 blur-3xl opacity-100 rounded-full z-0"/>
      
      {/* Header - Fixed at top */}
      <div className="fixed top-0 left-0 right-0 h-20 z-40 bg-[#0a0a0a]/20">
        <Header neynarUser={neynarUser} />
      </div>

      {/* Main content - Scrollable between header and footer */}
      <div className="absolute top-20 left-0 right-0 bottom-40 overflow-y-auto z-10">
        <div className="px-4 py-4">
          {/* Main title */}
          <h1 className="text-2xl font-bold text-center mb-6 text-white">{title}</h1>

          {/* Tab content rendering with animation */}
          <AnimatePresence mode="wait">
            {showContent && (
              <motion.div
                key={currentTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                {currentTab === Tab.Home && <HomeTab />}
                {currentTab === Tab.Actions && <ActionsTab />}
                {currentTab === Tab.Context && <ContextTab />}
                {currentTab === Tab.Wallet && <WalletTab />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Animated Icon Overlay */}
      <AnimatePresence>
        {isAnimating && animatingTab && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
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
              {(() => {
                const IconComponent = getTabIcon(animatingTab);
                return (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    <IconComponent size={64} color="white" />
                  </motion.div>
                );
              })()}
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

      {/* Footer - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 h-40 mt-8 z-40">
        <Footer 
          activeTab={currentTab as Tab} 
          setActiveTab={handleTabChange} 
          showWallet={USE_WALLET} 
          getTabIcon={getTabIcon}
          isAnimating={isAnimating}
        />
      </div>

    </div>
  );
}

