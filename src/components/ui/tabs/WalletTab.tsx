"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import {
  useAccount,
  useSendTransaction,
  useSignTypedData,
  useWaitForTransactionReceipt,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useChainId,
  type Connector,
} from "wagmi";
import { mainnet, arbitrum } from "wagmi/chains";
import { Button } from "../Button";
import { truncateAddress } from "../../../lib/truncateAddress";
import { renderError } from "../../../lib/errorUtils";
import { USE_WALLET, APP_NAME } from "../../../lib/constants";
import { useMiniApp } from "@neynar/react";

/**
 * WalletTab component for wallet management with manual connect/disconnect.
 *
 * Features:
 * - Manual wallet connection and disconnection
 * - Support for Farcaster custody wallets and EOAs
 * - Network switching (Arbitrum requirement)
 * - Address display with copy functionality
 * - Profile display from Farcaster context
 */

interface WalletStatusProps {
  address?: string;
  chainId?: number;
  pfpUrl?: string;
  username?: string;
  fid?: number;
  isConnected: boolean;
}

/**
 * Displays the user profile, wallet info, and network status.
 */
function WalletStatus({
  address,
  chainId,
  pfpUrl,
  username,
  fid,
  isConnected,
}: WalletStatusProps) {
  const getChainName = (chainId?: number) => {
    switch (chainId) {
      case mainnet.id:
        return "Ethereum";
      case arbitrum.id:
        return "Arbitrum";
      default:
        return "Unknown";
    }
  };

  const getChainColor = (chainId?: number) => {
    switch (chainId) {
      case mainnet.id:
        return "bg-gray-500";
      case arbitrum.id:
        return "bg-indigo-500";
      default:
        return "bg-gray-400";
    }
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      // Optional: Add toast notification here
    }
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Profile Section */}
      <div className="p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 text-center">
        <div className="mx-auto w-20 h-20 rounded-full overflow-hidden ring-2 ring-[#c199e4]/30 shadow-lg">
          <img
            src={pfpUrl || "https://placehold.co/80x80/c199e4/ffffff?text=?"}
            alt="Profile"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src =
                "https://placehold.co/80x80/c199e4/ffffff?text=?";
            }}
          />
        </div>

        {/* Connection Status Badge */}
        <div className="mt-3 mr-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 border border-[#c199e4]/30">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isConnected ? "bg-green-400" : "bg-white/60"
            }`}
          />
          <span className="text-xs text-white/90 font-medium">
            {isConnected ? "Connected" : "Not Connected"}
          </span>
        </div>

        {/* Chain badge */}
        {chainId && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/30">
            <span
              className={`inline-block w-2 h-2 rounded-full ${getChainColor(
                chainId
              )}`}
            />
            <span className="text-xs text-white/90 font-medium">
              {getChainName(chainId)}
            </span>
          </div>
        )}

        <div className="mt-6 space-y-3 text-left">
          <div className="flex justify-between text-sm bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-3 border border-white/20">
            <span className="text-white/70">Username:</span>
            <span className="text-white font-medium">
              {username || "Anonymous"}
            </span>
          </div>
          {typeof fid === "number" && (
            <div className="flex justify-between text-sm bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-3 border border-white/20">
              <span className="text-white/70">FID:</span>
              <span className="text-white font-medium">
                {fid}
              </span>
            </div>
          )}
          {address && (
            <div className="flex justify-between text-sm bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-3 border border-white/20">
              <span className="text-white/70">Wallet:</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <button
                  onClick={handleCopyAddress}
                  className="text-white/60 hover:text-[#c199e4] transition-all duration-300 hover:scale-110"
                  aria-label="Copy address"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ConnectionControlsProps {
  isConnected: boolean;
  context: {
    user?: { fid?: number };
    client?: unknown;
  } | null;
  connect: (args: { connector: Connector }) => void;
  connectors: readonly Connector[];
  disconnect: () => void;
}

/**
 * Renders wallet connection controls based on connection state.
 */
function ConnectionControls({
  isConnected,
  context,
  connect,
  connectors,
  disconnect,
}: ConnectionControlsProps) {
  if (isConnected) {
    return (
      <div className="p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500 mb-6">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-400/20 to-green-400/10 rounded-xl flex items-center justify-center border border-green-400/30">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          Wallet Connected
        </h4>
        <Button
          onClick={() => disconnect()}
          className="w-full bg-gradient-to-r from-[#c199e4]/20 to-[#b380db]/10 hover:from-[#c199e4]/30 hover:to-[#b380db]/20 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 border border-[#c199e4]/30 hover:border-[#c199e4]/50 hover:shadow-lg"
        >
          Disconnect Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500">
      <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-xl flex items-center justify-center border border-[#c199e4]/30">
          <svg className="w-5 h-5 text-[#c199e4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        Connect your wallet
      </h4>
      <div className="space-y-3">
        {context ? (
          <>
            <Button
              onClick={() => connect({ connector: connectors[0] })}
              className="w-full bg-gradient-to-br from-[#c199e4]/40 to-[#b380db]/40 hover:from-[#c199e4]/60 hover:to-[#b380db]/60 border border-[#c199e4]/30 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 hover:scale-105"
            >
              Connect Farcaster Wallet
            </Button>
            <Button
              onClick={() => connect({ connector: connectors[2] })}
              className="w-full bg-gradient-to-br from-white/20 to-white/5 hover:from-white/30 hover:to-white/10 border border-white/30 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 hover:scale-105"
            >
              Connect MetaMask
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => connect({ connector: connectors[1] })}
              className="w-full bg-gradient-to-br from-[#c199e4]/40 to-[#b380db]/40 hover:from-[#c199e4]/60 hover:to-[#b380db]/60 border border-[#c199e4]/30 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 hover:scale-105"
            >
              Connect Coinbase Wallet
            </Button>
            <Button
              onClick={() => connect({ connector: connectors[2] })}
              className="w-full bg-gradient-to-br from-white/20 to-white/5 hover:from-white/30 hover:to-white/10 border border-white/30 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 hover:scale-105"
            >
              Connect MetaMask
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

interface WalletControlsProps {
  isConnected: boolean;
  context: {
    user?: { fid?: number };
    client?: unknown;
  } | null;
  chainId?: number;
  onSwitchToArbitrum: () => void;
  isChainSwitchPending: boolean;
  isChainSwitchError: boolean;
  chainSwitchError: any;
  isFarcasterWallet: boolean;
  isCustodyWallet: boolean;
}

/**
 * Renders wallet controls for network switching and wallet info.
 */
function WalletControls({
  isConnected,
  context,
  chainId,
  onSwitchToArbitrum,
  isChainSwitchPending,
  isChainSwitchError,
  chainSwitchError,
  isFarcasterWallet,
  isCustodyWallet,
}: WalletControlsProps) {
  const isOnArbitrum = chainId === arbitrum.id;

  if (!isConnected) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Network Status */}
      <div className={`p-6 backdrop-blur-lg rounded-3xl border transition-all duration-500 text-sm ${
        isOnArbitrum 
          ? "bg-gradient-to-br from-green-400/20 to-green-400/10 border-green-400/30 hover:border-green-400/50" 
          : "bg-gradient-to-br from-red-400/20 to-red-400/10 border-red-400/30 hover:border-red-400/50"
      }`}>
        {isOnArbitrum ? (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-400/40 to-green-400/30 rounded-xl flex items-center justify-center border border-green-400/40">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-green-300 text-base">
                Connected to Arbitrum
              </div>
              <div className="text-green-200/80">
                You&apos;re on the correct network.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-400/40 to-red-400/30 rounded-xl flex items-center justify-center border border-red-400/40">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <div className="font-bold text-red-300 text-base">Wrong Network</div>
                <div className="text-red-200/80">
                  Please switch to Arbitrum mainnet to continue.
                </div>
              </div>
            </div>
            <Button
              onClick={onSwitchToArbitrum}
              disabled={isChainSwitchPending}
              isLoading={isChainSwitchPending}
              className="w-full bg-gradient-to-br from-[#c199e4]/40 to-[#b380db]/40 hover:from-[#c199e4]/60 hover:to-[#b380db]/60 border border-[#c199e4]/30 text-white font-semibold py-3 px-6 rounded-2xl transition-all duration-300 hover:scale-105"
            >
              Switch to Arbitrum
            </Button>
            {isChainSwitchError && renderError(chainSwitchError)}
          </div>
        )}
      </div>

      {/* Wallet Info */}
      <div className="p-6 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-3xl border border-white/20 hover:border-[#c199e4]/40 transition-all duration-500">
        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-xl flex items-center justify-center border border-[#c199e4]/30">
            <svg className="w-5 h-5 text-[#c199e4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          Wallet Information
        </h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-3 border border-white/20">
            <span className="text-white/70">Status:</span>
            <span className="text-green-400 font-bold">
              Connected
            </span>
          </div>
          <div className="flex justify-between bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-3 border border-white/20">
            <span className="text-white/70">Type:</span>
            <span className="text-white font-medium">
              {isFarcasterWallet ? "Farcaster Wallet" : "External Wallet"}
            </span>
          </div>
          <div className="text-xs text-white/60 mt-3 p-3 bg-gradient-to-br from-[#c199e4]/10 to-[#c199e4]/5 rounded-xl border border-[#c199e4]/20">
            You can switch between custody wallet and EOA using the Farcaster
            interface.
          </div>
        </div>
      </div>
    </div>
  );
}

export function WalletTab() {
  // --- State ---
  const [evmContractTransactionHash, setEvmContractTransactionHash] = useState<
    string | null
  >(null);

  // --- Hooks ---
  const { context } = useMiniApp();
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();

  // --- Wagmi Hooks ---
  const {
    sendTransaction,
    error: evmTransactionError,
    isError: isEvmTransactionError,
    isPending: isEvmTransactionPending,
  } = useSendTransaction();

  const {
    isLoading: isEvmTransactionConfirming,
    isSuccess: isEvmTransactionConfirmed,
  } = useWaitForTransactionReceipt({
    hash: evmContractTransactionHash as `0x${string}`,
  });

  const {
    signTypedData,
    error: evmSignTypedDataError,
    isError: isEvmSignTypedDataError,
    isPending: isEvmSignTypedDataPending,
  } = useSignTypedData();

  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();

  const {
    switchChain,
    error: chainSwitchError,
    isError: isChainSwitchError,
    isPending: isChainSwitchPending,
  } = useSwitchChain();

  // --- Computed Values ---
  // Detect wallet type based on active connector
  console.log("connector", connector?.id);
  const isFarcasterWallet = connector?.id === "farcaster";
  const isCustodyWallet = isFarcasterWallet; // Farcaster Frame connector is always custody wallet

  // Debug logging
  console.log("Wallet Debug Info:", {
    isConnected,
    connectorId: connector?.id,
    connectorName: connector?.name,
    isFarcasterWallet,
    isCustodyWallet,
    context: !!context,
    fid: context?.user?.fid,
  });

  // --- Handlers ---
  const handleSwitchToArbitrum = useCallback(() => {
    console.log("Switching to Arbitrum");
    switchChain({ chainId: arbitrum.id });
  }, [switchChain]);

  // --- Early Return ---
  if (!USE_WALLET) {
    return null;
  }

  // --- Render ---
  return (
    <div className="flex flex-col h-full py-3 overflow-y-auto">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#c199e4]/20 to-[#c199e4]/10 rounded-2xl flex items-center justify-center border border-[#c199e4]/20">
            <svg className="w-6 h-6 text-[#c199e4]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Wallet Management
            </h2>
            <p className="text-sm text-white/70">
              Connect and manage your crypto wallet
            </p>
          </div>
        </div>
      </div>

        {/* Profile Section */}
        <WalletStatus
          address={address}
          chainId={chainId}
          pfpUrl={context?.user?.pfpUrl}
          username={context?.user?.username}
          fid={context?.user?.fid}
          isConnected={isConnected}
        />

        {/* Connection Controls */}
        <ConnectionControls
          isConnected={isConnected}
          context={context}
          connect={connect}
          connectors={connectors}
          disconnect={disconnect}
        />

        {/* Wallet Controls (only when connected) */}
        <WalletControls
          isConnected={isConnected}
          context={context}
          chainId={chainId}
          onSwitchToArbitrum={handleSwitchToArbitrum}
          isChainSwitchPending={isChainSwitchPending}
          isChainSwitchError={isChainSwitchError}
          chainSwitchError={chainSwitchError}
          isFarcasterWallet={isFarcasterWallet}
          isCustodyWallet={isCustodyWallet}
        />
      </div>
    // </div>
  );
}
