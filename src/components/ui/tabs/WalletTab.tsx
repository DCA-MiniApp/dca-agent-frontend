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
    <div className="space-y-4">
      {/* Profile Section */}
      <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
        <div className="mx-auto w-20 h-20 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700">
          <img
            src={pfpUrl || "https://placehold.co/80x80/6366f1/ffffff?text=?"}
            alt="Profile"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src =
                "https://placehold.co/80x80/6366f1/ffffff?text=?";
            }}
          />
        </div>

        {/* Connection Status Badge */}
        <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-gray-400"
            }`}
          />
          <span className="text-xs text-gray-700 dark:text-gray-300">
            {isConnected ? "Connected" : "Not Connected"}
          </span>
        </div>

        {/* Chain badge */}
        {chainId && (
          <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <span
              className={`inline-block w-2 h-2 rounded-full ${getChainColor(
                chainId
              )}`}
            />
            <span className="text-xs text-gray-700 dark:text-gray-300">
              {getChainName(chainId)}
            </span>
          </div>
        )}

        <div className="mt-4 space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Username:</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {username || "Anonymous"}
            </span>
          </div>
          {typeof fid === "number" && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">FID:</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                {fid}
              </span>
            </div>
          )}
          {address && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Wallet:</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-900 dark:text-gray-100 font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <button
                  onClick={handleCopyAddress}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Wallet Connected
        </h4>
        <Button
          onClick={() => disconnect()}
          className="w-full bg-red-600 hover:bg-red-700"
        >
          Disconnect Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
        Connect your wallet
      </h4>
      <div className="space-y-2">
        {context ? (
          <>
            <Button
              onClick={() => connect({ connector: connectors[0] })}
              className="w-full"
            >
              Connect Farcaster Wallet
            </Button>
            <Button
              onClick={() => connect({ connector: connectors[2] })}
              className="w-full"
            >
              Connect MetaMask
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => connect({ connector: connectors[1] })}
              className="w-full"
            >
              Connect Coinbase Wallet
            </Button>
            <Button
              onClick={() => connect({ connector: connectors[2] })}
              className="w-full"
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
    <div className="space-y-3">
      {/* Network Status */}
      <div
        className="p-4 rounded-xl border text-sm"
        style={{
          backgroundColor: isOnArbitrum
            ? "rgb(240 253 244)"
            : "rgb(254 242 242)",
          borderColor: isOnArbitrum ? "rgb(34 197 94)" : "rgb(239 68 68)",
        }}
      >
        {isOnArbitrum ? (
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white">
              ✓
            </span>
            <div>
              <div className="font-medium text-green-700">
                Connected to Arbitrum
              </div>
              <div className="text-green-700/80">
                You&apos;re on the correct network.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white">
                !
              </span>
              <div>
                <div className="font-medium text-red-700">Wrong Network</div>
                <div className="text-red-700/80">
                  Please switch to Arbitrum mainnet to continue.
                </div>
              </div>
            </div>
            <Button
              onClick={onSwitchToArbitrum}
              disabled={isChainSwitchPending}
              isLoading={isChainSwitchPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Switch to Arbitrum
            </Button>
            {isChainSwitchError && renderError(chainSwitchError)}
          </div>
        )}
      </div>

      {/* Wallet Info */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Wallet Information
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Status:</span>
            <span className="text-green-600 dark:text-green-400 font-medium">
              Connected
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Type:</span>
            <span className="text-gray-900 dark:text-gray-100">
              {isFarcasterWallet ? "Farcaster Wallet" : "External Wallet"}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
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
    <div className="flex flex-col h-[calc(100vh-200px)] px-4 py-3 space-y-4 overflow-y-auto">
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
  );
}
