"use client";

import { useEffect, useState } from "react";
import { useMiniApp } from "@neynar/react";
import { Header } from "~/components/ui/Header";
import { ActionsTab } from "~/components/ui/tabs/ActionsTab";
import { useNeynarUser } from "../../hooks/useNeynarUser";

export default function ChatApp() {
  // --- Hooks ---
  const {
    isSDKLoaded,
    context,
  } = useMiniApp();

  // --- Neynar user hook ---
  const { user: neynarUser } = useNeynarUser(context || undefined);

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
      <div className="fixed top-0 left-0 right-0 h-16 z-40 bg-[#0a0a0a]/20">
        <Header neynarUser={neynarUser} />
      </div>

      {/* Main content - Full height chat */}
      <div className="absolute top-16 left-0 right-0 bottom-0 overflow-hidden z-10">
        <div className="h-full px-3 pb-4">
          <ActionsTab />
        </div>
      </div>
    </div>
  );
}