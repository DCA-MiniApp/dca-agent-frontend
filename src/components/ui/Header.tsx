"use client";

import { useState } from "react";
import { APP_NAME } from "~/lib/constants";
import sdk from "@farcaster/miniapp-sdk";
import { useMiniApp } from "@neynar/react";
import { IoLayers } from "react-icons/io5";

type HeaderProps = {
  neynarUser?: {
    fid: number;
    score: number;
  } | null;
};

export function Header({ neynarUser }: HeaderProps) {
  const { context } = useMiniApp();
  console.log(context?.user.pfpUrl);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  return (
    <div className="relative font-titillium">
      <div 
        className="mt-4 mb-4 mx-4 px-3 py-3 flex items-center justify-between"
      >
        
        <div className="flex items-center gap-3 ml-auto">
          {/* Logo Icon */}
          <div className="w-8 h-8 bg-gradient-to-br from-[#c199e4] to-[#341e64] rounded-lg flex items-center justify-center shadow-lg">
          <IoLayers className="size-5"/>
          </div>
          
          {/* Logo Text */}
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white tracking-wide">
              DCA
            </span>
            <span className="text-xs text-white/70 font-medium -mt-1">
              AGENT
            </span>
          </div>
        </div>
        {context?.user && (
          <div 
            className="cursor-pointer"
            onClick={() => {
              setIsUserDropdownOpen(!isUserDropdownOpen);
            }}
          >
            {context.user.pfpUrl && (
              <img 
                src={context.user.pfpUrl} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border-2 border-primary"
              />
            )}
          </div>
        )}
      </div>
      {context?.user && (
        <>      
          {isUserDropdownOpen && (
            <div className="absolute top-full right-0 z-50 w-fit mt-1 mx-4 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
              <div className="p-3 space-y-2">
                <div className="text-right">
                  <h3 
                    className="font-bold text-sm hover:underline cursor-pointer inline-block"
                    onClick={() => sdk.actions.viewProfile({ fid: context.user.fid })}
                  >
                    {context.user.displayName || context.user.username}
                  </h3>
                  <p className="text-xs text-gray-400">
                    @{context.user.username}
                  </p>
                  <p className="text-xs text-gray-500">
                    FID: {context.user.fid}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
