import { createConfig, http, WagmiProvider } from "wagmi";
import { arbitrum, mainnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { coinbaseWallet, metaMask } from "wagmi/connectors";
import { APP_NAME, APP_ICON_URL, APP_URL } from "~/lib/constants";
import { useEffect, useState } from "react";
import { useConnect, useAccount } from "wagmi";
import React from "react";
import { sdk } from "@farcaster/miniapp-sdk";

// Custom hook for MetaMask detection and auto-connection
// function useMetaMaskAutoConnect() {
//   const [isMetaMask, setIsMetaMask] = useState(false);
//   const { connect, connectors } = useConnect();
//   const { isConnected } = useAccount();

//   useEffect(() => {
//     const checkMetaMask = () => {
//       const provider = window.ethereum;
//       setIsMetaMask(!!provider?.isMetaMask);
//     };

//     checkMetaMask();
//     window.addEventListener("ethereum#initialized", checkMetaMask);

//     return () => {
//       window.removeEventListener("ethereum#initialized", checkMetaMask);
//     };
//   }, []);

//   useEffect(() => {
//     if (isMetaMask && !isConnected) {
//       const metaMaskConnector = connectors.find(
//         (connector) => connector.id === "metaMask" || connector.name === "MetaMask"
//       );
//       if (metaMaskConnector) {
//         connect({ connector: metaMaskConnector });
//       }
//     }
//   }, [isMetaMask, isConnected, connect, connectors]);

//   return isMetaMask;
// }

function useFarcasterAutoConnect() {
  const { isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  useEffect(() => {
    const isMiniApp =
      typeof window !== "undefined" &&
      (sdk?.isInMiniApp || window.location.href.includes("neynar.app")); // adjust detection

    if (!isMiniApp || isConnected) return;

    const farcasterConnector = connectors.find(
      (connector) => connector.id === "farcaster" || connector.name === "Farcaster"
    );
    if (farcasterConnector) {
      connect({ connector: farcasterConnector });
    }
  }, [isConnected, connect, connectors]);
}

export const config = createConfig({
  chains: [arbitrum, mainnet],
  transports: {
    [arbitrum.id]: http(),
    [mainnet.id]: http(),
  },
  connectors: [
    farcasterMiniApp(),
    coinbaseWallet({
      appName: APP_NAME,
      appLogoUrl: APP_ICON_URL,
      preference: "all",
    }),
    metaMask({
      dappMetadata: {
        name: APP_NAME,
        url: APP_URL,
      },
    }),
  ],
});

const queryClient = new QueryClient();

// function MetaMaskAutoConnect({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   useMetaMaskAutoConnect();
//   return <>{children}</>;
// }

function AutoConnectWrapper({ children }: { children: React.ReactNode }) {
  // useMetaMaskAutoConnect();
  useFarcasterAutoConnect();
  return <>{children}</>;
}

export default function Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AutoConnectWrapper>{children}</AutoConnectWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  );
}