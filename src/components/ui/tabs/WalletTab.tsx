"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useAccount, useSendTransaction, useSignTypedData, useWaitForTransactionReceipt, useDisconnect, useConnect, useSwitchChain, useChainId, type Connector } from "wagmi";
// import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { base, degen, mainnet, optimism, unichain, arbitrum } from "wagmi/chains";
import { Button } from "../Button";
import { truncateAddress } from "../../../lib/truncateAddress";
import { renderError } from "../../../lib/errorUtils";
// import { SignEvmMessage } from "../wallet/SignEvmMessage";
// import { SendEth } from "../wallet/SendEth";
// import { SignSolanaMessage } from "../wallet/SignSolanaMessage";
// import { SendSolana } from "../wallet/SendSolana";
import { USE_WALLET, APP_NAME } from "../../../lib/constants";
import { useMiniApp } from "@neynar/react";

/**
 * WalletTab component manages wallet-related UI for EVM chains with profile functionality.
 * 
 * This component provides a comprehensive wallet interface that supports:
 * - User profile display with Farcaster profile photo
 * - EVM wallet connections (Farcaster Frame, Coinbase Wallet, MetaMask)
 * - Message signing for EVM chains
 * - Transaction sending for EVM chains
 * - Chain switching for EVM chains
 * - Auto-connection in Farcaster clients
 * 
 * The component automatically detects when running in a Farcaster client
 * and attempts to auto-connect using the Farcaster Frame connector.
 * 
 * @example
 * ```tsx
 * <WalletTab />
 * ```
 */

interface WalletStatusProps {
  address?: string;
  chainId?: number;
  pfpUrl?: string;
  username?: string;
  fid?: number;
}

/**
 * Displays the user profile (centered), labeled info, and basic chain badge.
 */
function WalletStatus({ address, chainId, pfpUrl, username, fid }: WalletStatusProps) {
  const getChainName = (chainId?: number) => {
    switch (chainId) {
      case base.id: return "Base";
      case optimism.id: return "Optimism";
      case degen.id: return "Degen";
      case mainnet.id: return "Ethereum";
      case unichain.id: return "Unichain";
      case arbitrum.id: return "Arbitrum";
      default: return "Unknown";
    }
  };

  const getChainColor = (chainId?: number) => {
    switch (chainId) {
      case base.id: return "bg-blue-500";
      case optimism.id: return "bg-red-500";
      case degen.id: return "bg-purple-500";
      case mainnet.id: return "bg-gray-500";
      case unichain.id: return "bg-green-500";
      case arbitrum.id: return "bg-indigo-500";
      default: return "bg-gray-400";
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile Section (centered) */}
      <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
        <div className="mx-auto w-20 h-20 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700">
          <img
            src={pfpUrl || "https://placehold.co/80x80/6366f1/ffffff?text=?"}
            alt="Profile"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "https://placehold.co/80x80/6366f1/ffffff?text=?";
            }}
          />
        </div>
        {/* Chain badge under avatar */}
        {chainId && (
          <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
            <span className={`inline-block w-2 h-2 rounded-full ${getChainColor(chainId)}`} />
            <span className="text-xs text-gray-700 dark:text-gray-300">{getChainName(chainId)}</span>
          </div>
        )}

        <div className="mt-4 space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Username:</span>
            <span className="text-gray-900 dark:text-gray-100 font-medium">{username || "Anonymous"}</span>
          </div>
          {typeof fid === "number" && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">FID:</span>
              <span className="text-gray-900 dark:text-gray-100 font-medium">{fid}</span>
            </div>
          )}
          {address && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Address:</span>
              <span className="text-gray-900 dark:text-gray-100 font-mono">{truncateAddress(address)}</span>
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
 * Renders wallet connection controls based on connection state and context.
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
      <div className="space-y-3">
        <Button onClick={() => disconnect()} className="w-full bg-red-600 hover:bg-red-700">
          Disconnect Wallet
        </Button>
      </div>
    );
  }
  
  if (context) {
    return (
      <div className="space-y-3">
        <Button onClick={() => connect({ connector: connectors[0] })} className="w-full">
          Connect Farcaster Wallet
        </Button>
        <Button
          onClick={() => {
            console.log("Manual Farcaster connection attempt");
            console.log("Connectors:", connectors.map((c, i) => `${i}: ${c.name}`));
            connect({ connector: connectors[0] });
          }}
          className="w-full bg-gray-600 hover:bg-gray-700"
        >
          Connect (Manual)
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <Button onClick={() => connect({ connector: connectors[1] })} className="w-full">
        Connect Coinbase Wallet
      </Button>
      <Button onClick={() => connect({ connector: connectors[2] })} className="w-full">
        Connect MetaMask
      </Button>
    </div>
  );
}

export function WalletTab() {
  // --- State ---
  const [evmContractTransactionHash, setEvmContractTransactionHash] = useState<string | null>(null);
  
  // --- Hooks ---
  const { context } = useMiniApp();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  // const solanaWallet = useSolanaWallet();
  // const { publicKey: solanaPublicKey } = solanaWallet;

  // --- Wagmi Hooks ---
  const {
    sendTransaction,
    error: evmTransactionError,
    isError: isEvmTransactionError,
    isPending: isEvmTransactionPending,
  } = useSendTransaction();

  const { isLoading: isEvmTransactionConfirming, isSuccess: isEvmTransactionConfirmed } =
    useWaitForTransactionReceipt({
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

  // --- Effects ---
  /**
   * Auto-connect when Farcaster context is available.
   */
  useEffect(() => {
    // Check if we're in a Farcaster client environment
    const isInFarcasterClient = typeof window !== 'undefined' && 
      (window.location.href.includes('warpcast.com') || 
       window.location.href.includes('farcaster') ||
       window.ethereum?.isFarcaster ||
       context?.client);
    
    if (context?.user?.fid && !isConnected && connectors.length > 0 && isInFarcasterClient) {
      try {
        connect({ connector: connectors[0] });
      } catch (error) {
        console.error("Auto-connection failed:", error);
      }
    }
  }, [context?.user?.fid, isConnected, connectors, connect, context?.client]);

  // --- Computed Values ---
  const isOnArbitrum = chainId === arbitrum.id;
  console.log("chainId", chainId);
  console.log("Arbitrum ID", arbitrum.id);

  // --- Handlers ---
  const handleSwitchToArbitrum = useCallback(() => {
    console.log("Switching to Arbitrum");
    switchChain({ chainId: arbitrum.id });
  }, [switchChain]);

  const sendEvmContractTransaction = useCallback(() => {
    sendTransaction(
      {
        // call yoink() on Yoink contract
        to: "0x4bBFD120d9f352A0BEd7a014bd67913a2007a878",
        data: "0x9846cd9efc000023c0",
      },
      {
        onSuccess: (hash) => {
          setEvmContractTransactionHash(hash);
        },
      }
    );
  }, [sendTransaction]);

  const signTyped = useCallback(() => {
    signTypedData({
      domain: {
        name: APP_NAME,
        version: "1",
        chainId,
      },
      types: {
        Message: [{ name: "content", type: "string" }],
      },
      message: {
        content: `Hello from ${APP_NAME}!`,
      },
      primaryType: "Message",
    });
  }, [chainId, signTypedData]);

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
      />

      {/* If not connected, show connect controls */}
      {!isConnected && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Connect your wallet</h4>
          <ConnectionControls
            isConnected={isConnected}
            context={context}
            connect={connect}
            connectors={connectors}
            disconnect={disconnect}
          />
        </div>
      )}

      {/* Chain requirement: Arbitrum only */}
      {isConnected && (
        <div className="p-4 rounded-xl border text-sm"
             style={{
               backgroundColor: isOnArbitrum ? 'rgb(240 253 244)' : 'rgb(254 242 242)',
               borderColor: isOnArbitrum ? 'rgb(34 197 94)' : 'rgb(239 68 68)'
             }}
        >
          {isOnArbitrum ? (
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white">✓</span>
              <div>
                <div className="font-medium text-green-700">Connected to Arbitrum</div>
                <div className="text-green-700/80">You&apos;re on the correct network.</div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white">!</span>
                <div>
                  <div className="font-medium text-red-700">Wrong Network</div>
                  <div className="text-red-700/80">Please switch to Arbitrum mainnet to continue.</div>
                </div>
              </div>
              <Button
                onClick={handleSwitchToArbitrum}
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
      )}

      {/* Disconnect option (only when connected) */}
      {isConnected && (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Button onClick={() => disconnect()} className="w-full bg-red-600 hover:bg-red-700">
            Disconnect Wallet
          </Button>
        </div>
      )}

      {/* Optional: advanced actions (commented for now) */}
      {/**
      <SignEvmMessage />
      {isConnected && (
        <>
          <SendEth />
          <Button
            onClick={sendEvmContractTransaction}
            disabled={!isConnected || isEvmTransactionPending}
            isLoading={isEvmTransactionPending}
            className="w-full"
          >
            Send Transaction (contract)
          </Button>
          {isEvmTransactionError && renderError(evmTransactionError)}
          {evmContractTransactionHash && (
            <div className="text-xs w-full">
              <div>Hash: {truncateAddress(evmContractTransactionHash)}</div>
              <div>
                Status: {isEvmTransactionConfirming ? "Confirming..." : isEvmTransactionConfirmed ? "Confirmed!" : "Pending"}
              </div>
            </div>
          )}
          <Button
            onClick={signTyped}
            disabled={!isConnected || isEvmSignTypedDataPending}
            isLoading={isEvmSignTypedDataPending}
            className="w-full"
          >
            Sign Typed Data
          </Button>
          {isEvmSignTypedDataError && renderError(evmSignTypedDataError)}
        </>
      )}
      */}

      {/* Solana Wallet Components - Commented out */}
      {/*
      {solanaPublicKey && (
        <>
          <SignSolanaMessage signMessage={solanaWallet.signMessage} />
          <SendSolana />
        </>
      )}
      */}
    </div>
  );
} 