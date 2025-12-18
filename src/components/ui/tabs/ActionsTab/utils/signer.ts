import { BrowserProvider, JsonRpcSigner } from "ethers";
import sdk from "@farcaster/miniapp-sdk";

export async function getEthersSigner(
  walletClient: any,
  connector: any
): Promise<JsonRpcSigner> {
  try {
    const isFarcasterConnector =
      connector?.id === "farcaster" || connector?.name === "Farcaster";

    // 1. Try Wagmi walletClient transport first (works for Farcaster and other connectors)
    if (
      walletClient &&
      walletClient.account?.address &&
      walletClient.transport
    ) {
      console.log(
        isFarcasterConnector
          ? "Detected Farcaster connector → trying Wagmi transport first"
          : "Using Wagmi walletClient transport path"
      );
      console.log("Wallet Client:", walletClient);
      console.log("Wallet Client chain ID:", walletClient?.chain?.id);
      console.log('🔍 [GET ETHERS SIGNER] walletClient.account.address:', walletClient.account?.address);
      console.log('🔍 [GET ETHERS SIGNER] Address length:', walletClient.account?.address?.length);
      console.log('🔍 [GET ETHERS SIGNER] Address regex test:', /^0x[a-fA-F0-9]{40}$/.test(walletClient.account?.address || ''));

      const requestFn = (walletClient.transport as any).request;
      if (typeof requestFn === "function") {
        try {
          const eip1193Provider = {
            request: requestFn.bind(walletClient.transport),
          };

          const provider = walletClient.chain
            ? new BrowserProvider(eip1193Provider, walletClient.chain.id)
            : new BrowserProvider(eip1193Provider);

          console.log("Provider:", provider);

          const signer = await Promise.race([
            provider.getSigner(walletClient.account.address),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Wagmi signer timeout")), 30000)
            ),
          ]);

          console.log("Signer:", signer);

          const address = await signer.getAddress();
          console.log('🔍 [GET ETHERS SIGNER] Signer address (Wagmi path):', address);
          console.log('🔍 [GET ETHERS SIGNER] Signer address length:', address?.length);
          console.log('🔍 [GET ETHERS SIGNER] Signer address regex test:', /^0x[a-fA-F0-9]{40}$/.test(address || ''));
          try {
            const balance = await provider.getBalance(address);
            console.log(
              "Balance of signer (Wagmi transport):",
              balance.toString()
            );
          } catch (balanceErr) {
            console.warn("Could not fetch signer balance:", balanceErr);
          }
          console.log(
            isFarcasterConnector
              ? "✅ Signer obtained via Wagmi transport (Farcaster connector)"
              : "✅ Signer obtained via Wagmi transport",
            address
          );
          return signer;
        } catch (wagmiError) {
          console.warn("⚠️ Wagmi transport failed:", wagmiError);
          // If Farcaster connector and Wagmi transport failed, fall through to SDK provider
          if (!isFarcasterConnector) {
            throw wagmiError;
          }
        }
      }
    }

    // 2. Fallback: If Farcaster connector and Wagmi transport didn't work → use SDK provider
    if (isFarcasterConnector) {
      console.log(
        "Farcaster connector detected but Wagmi transport unavailable/unsuccessful → falling back to SDK provider"
      );
      const farcasterProvider = await sdk.wallet.getEthereumProvider();
      if (!farcasterProvider) {
        throw new Error("Farcaster SDK did not return a provider");
      }

      // Wrap with Ethers provider
      const provider = new BrowserProvider(farcasterProvider);
      const signer = await Promise.race([
        provider.getSigner(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Farcaster signer timeout")), 30000)
        ),
      ]);

      const address = await signer.getAddress();
      console.log('🔍 [GET ETHERS SIGNER] Signer address (Farcaster SDK path):', address);
      console.log('🔍 [GET ETHERS SIGNER] Signer address length:', address?.length);
      console.log('🔍 [GET ETHERS SIGNER] Signer address regex test:', /^0x[a-fA-F0-9]{40}$/.test(address || ''));
      try {
        const balance = await provider.getBalance(address);
        console.log("Balance of signer (Farcaster SDK):", balance.toString());
      } catch (balanceErr) {
        console.warn("Could not fetch signer balance:", balanceErr);
      }
      console.log("✅ Signer obtained via Farcaster SDK (fallback):", address);
      return signer;
    }

    // 3. Fallback: window.ethereum
    if (typeof window !== "undefined" && (window as any).ethereum) {
      console.log("Falling back to window.ethereum provider");
      const provider = new BrowserProvider((window as any).ethereum as any);

      // Check accounts
      let accounts: string[] = [];
      try {
        accounts = (await Promise.race([
          provider.send("eth_accounts", []),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("eth_accounts timeout")), 8000)
          ),
        ])) as string[];
      } catch (err) {
        console.warn("eth_accounts call failed:", err);
        // We can attempt requestAccounts
      }

      if (!accounts || accounts.length === 0) {
        await Promise.race([
          provider.send("eth_requestAccounts", []),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("User did not connect wallet")),
              60000
            )
          ),
        ]);
      }

      const signer = await Promise.race([
        provider.getSigner(0),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("getSigner timeout")), 30000)
        ),
      ]);

      const address = await signer.getAddress();
      console.log('🔍 [GET ETHERS SIGNER] Signer address (window.ethereum path):', address);
      console.log('🔍 [GET ETHERS SIGNER] Signer address length:', address?.length);
      console.log('🔍 [GET ETHERS SIGNER] Signer address regex test:', /^0x[a-fA-F0-9]{40}$/.test(address || ''));
      console.log("Signer obtained via window.ethereum:", address);
      return signer;
    }

    throw new Error("Could not obtain signer from any source");
  } catch (err) {
    console.error("getEthersSigner failure:", err);
    throw err;
  }
}
