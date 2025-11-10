import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Manifest } from '@farcaster/miniapp-core/src/manifest';
import tokenMapArbitrum from '~/tokenMap_arbitrum.json';
import {
  APP_BUTTON_TEXT,
  APP_DESCRIPTION,
  APP_ICON_URL,
  APP_NAME,
  APP_OG_IMAGE_URL,
  APP_PRIMARY_CATEGORY,
  APP_SPLASH_BACKGROUND_COLOR,
  APP_SPLASH_URL,
  APP_TAGS,
  APP_URL,
  APP_WEBHOOK_URL,
  APP_ACCOUNT_ASSOCIATION,
} from './constants';
import { fetchJobSuccessCount } from './api';



const ALCHEMY_URL = process.env.NEXT_PUBLIC_ALCHEMY_URL || "https://arb-mainnet.g.alchemy.com/v2";
const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || "";

interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  error?: string;
}

interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
}


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMiniAppEmbedMetadata(ogImageUrl?: string) {
  return {
    version: 'next',
    imageUrl: ogImageUrl ?? APP_OG_IMAGE_URL,
    ogTitle: APP_NAME,
    ogDescription: APP_DESCRIPTION,
    ogImageUrl: ogImageUrl ?? APP_OG_IMAGE_URL,
    button: {
      title: APP_BUTTON_TEXT,
      action: {
        type: 'launch_frame',
        name: APP_NAME,
        url: APP_URL,
        splashImageUrl: APP_SPLASH_URL,
        iconUrl: APP_ICON_URL,
        splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
        description: APP_DESCRIPTION,
        primaryCategory: APP_PRIMARY_CATEGORY,
        tags: APP_TAGS,
      },
    },
  };
}

export async function getFarcasterDomainManifest(): Promise<Manifest> {
  const manifest: any = {
    miniapp: {
      version: '1',
      name: APP_NAME ?? 'DCA Agent',
      homeUrl: APP_URL,
      iconUrl: APP_ICON_URL,
      imageUrl: APP_OG_IMAGE_URL,
      buttonTitle: APP_BUTTON_TEXT ?? 'Launch Mini App',
      splashImageUrl: APP_SPLASH_URL,
      splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
      webhookUrl: APP_WEBHOOK_URL,
    },
  };
  
  // Add accountAssociation at the top level if available
  if (APP_ACCOUNT_ASSOCIATION) {
    manifest.accountAssociation = APP_ACCOUNT_ASSOCIATION;
  }
  
  return manifest as Manifest;
}

// Portfolio helpers
type PlanForUsd = { fromToken: string; amount: string;jobId:string };

// Simple token map import can be added later; use a lightweight fallback resolver for now
export function getArbitrumAddressBySymbol(symbol: string): string | null {
  const sym = (symbol || '').toUpperCase();
  // Normalize common aliases
  const normalized = sym === 'ETH' ? 'WETH' : sym;
  // console.log('normalized', normalized);
  const tm: any = tokenMapArbitrum as any;
  const entryList: any[] | undefined = tm?.tokenMap?.[normalized];
  if (!entryList || entryList.length === 0) return null;
  // Prefer chainId 42161 and first entry
  const match = entryList.find((e) => e.chainId === 42161) || entryList[0];
  // console.log('match', match);
  return match?.address || null;
}

export async function fetchArbitrumUsdPrices(addresses: string[]): Promise<Record<string, number>> {
  if (addresses.length === 0) return {};
  const unique = Array.from(new Set(addresses.map((a) => a.toLowerCase()).filter((addr) => addr)));
  if (unique.length === 0) return {};
  
  const out: Record<string, number> = {};
  
  // Fetch prices one address at a time
  for (const address of unique) {
    try {
      const url = `https://api.coingecko.com/api/v3/simple/token_price/arbitrum-one?contract_addresses=${encodeURIComponent(address)}&vs_currencies=usd`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      
      const json = await res.json();
      if (json && typeof json === 'object') {
        for (const [addr, data] of Object.entries<any>(json)) {
          if (data && typeof data.usd === 'number') {
            out[addr.toLowerCase()] = data.usd;
          }
        }
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching price for ${address}:`, error);
      continue;
    }
  }
  
  return out;
}

export async function computePlansInvestedUsd(plans: PlanForUsd[]): Promise<number> {
  // console.log("Line number 107:",plans)
  const neededSymbols = Array.from(
    new Set(
      plans
        .map((p) => (p.fromToken || '').trim().toUpperCase())
        .filter((s) => s)
    )
  );
  // console.log('neededSymbols 116:', neededSymbols);
  const addresses = neededSymbols.map((s) => getArbitrumAddressBySymbol(s)).filter((a): a is string => !!a);
  // console.log('addresses 117', addresses);
  const prices = await fetchArbitrumUsdPrices(addresses);
  const symbolToPrice: Record<string, number> = { USDC: 1 };
  for (const sym of neededSymbols) {
    const addr = getArbitrumAddressBySymbol(sym);
    if (addr) symbolToPrice[sym] = prices[addr.toLowerCase()] ?? 0;
  }

  const successCounts = await Promise.all(plans.map((p) => fetchJobSuccessCount(p.jobId)));
  // console.log('successCounts 127', successCounts);

  let total = 0;
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const per = parseFloat(plan.amount);
    // console.log("per in computePlansInvestedUsd 138:", per);
    const successCount = successCounts[i];
    // console.log("successCount in computePlansInvestedUsd 140:", successCount);
    // if (!isFinite(per) || !successCount) continue;
    const sym = (plan.fromToken || 'USDC').toUpperCase();

    // console.log("sym in computePlansInvestedUsd", sym);
    const price = symbolToPrice[sym] ?? 0;
    // console.log("symbolToPrice in computePlansInvestedUsd", symbolToPrice);
    // console.log("price in computePlansInvestedUsd 147:", price);
    total += per * price * (successCount ?? 0);
    // console.log("total in computePlansInvestedUsd 149:", total);
  }
  return total;
}

// Alchemy API helpers for wallet balance calculation
// Fetch price and metadata for a single token from DefiLlama
async function fetchDefiLlamaInfo(contractAddress: string): Promise<{ price: number; decimals: number | null; symbol?: string }> {
  try {
    const url = `https://coins.llama.fi/prices/current/arbitrum:${contractAddress.toLowerCase()}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`DefiLlama API error for ${contractAddress}:`, res.status, res.statusText);
      return { price: 0, decimals: null };
    }

    const json = await res.json();
    if (!json.coins) return { price: 0, decimals: null };

    const coinData = json.coins[`arbitrum:${contractAddress.toLowerCase()}`];
    // console.log("coinData in fetchDefiLlamaPrice:", coinData);
    if (!coinData || typeof coinData.price !== "number") return { price: 0, decimals: null };

    return {
      price: coinData.price,
      decimals: typeof coinData.decimals === "number" ? coinData.decimals : null,
      symbol: coinData.symbol,
    };
  } catch (error) {
    console.error(`Error fetching price for ${contractAddress}:`, error);
    return { price: 0, decimals: null };
  }
}

// Fetch native ETH balance on Arbitrum (in wei)
async function getNativeEthBalance(userAddress: string): Promise<bigint> {
  if (!ALCHEMY_API_KEY) return 0n;
  try {
    const url = `${ALCHEMY_URL}/${ALCHEMY_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [userAddress, "latest"],
      }),
    });
    if (!res.ok) {
      console.error("Alchemy eth_getBalance error:", res.status, res.statusText);
      return 0n;
    }
    const { result } = await res.json();
    // console.log("Native ETH balance (wei) hex result:", result);
    if (!result) return 0n;
    return BigInt(result);
  } catch (e) {
    console.error("Error fetching native ETH balance:", e);
    return 0n;
  }
}


/**
 * Get token balances for a user address using Alchemy API
 */
async function getTokenBalances(userAddress: string): Promise<TokenBalance[]> {
  if (!ALCHEMY_API_KEY) {
    console.warn("Alchemy API key not configured");
    return [];
  }

  try {
    const url = `${ALCHEMY_URL}/${ALCHEMY_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getTokenBalances",
        params: [userAddress, "erc20"],
      }),
    });

    if (!res.ok) {
      console.error("Alchemy API error:", res.status, res.statusText);
      return [];
    }

    const { result } = await res.json();
    if (!result || !result.tokenBalances) return [];
    
    // Filter out zero balances and errors
    return result.tokenBalances.filter(
      (tb: TokenBalance) => tb.tokenBalance !== "0x0" && !tb.error
    );
  } catch (error) {
    console.error("Error fetching token balances from Alchemy:", error);
    return [];
  }
}

/**
 * Get token metadata for a contract address using Alchemy API
 */
// async function getTokenMetadata(contractAddress: string): Promise<TokenMetadata | null> {
//   if (!ALCHEMY_API_KEY) {
//     console.warn("Alchemy API key not configured");
//     return null;
//   }

//   try {
//     const url = `${ALCHEMY_URL}/${ALCHEMY_API_KEY}`;
//     const res = await fetch(url, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         jsonrpc: "2.0",
//         id: 1,
//         method: "alchemy_getTokenMetadata",
//         params: [contractAddress],
//       }),
//     });

//     if (!res.ok) {
//       console.error("Alchemy metadata API error:", res.status, res.statusText);
//       return null;
//     }

//     const { result } = await res.json();
//     if (!result) return null;

//     return {
//       name: result.name || "Unknown",
//       symbol: result.symbol || "UNKNOWN",
//       decimals: result.decimals || 18,
//       logo: result.logo,
//     };
//   } catch (error) {
//     console.error("Error fetching token metadata from Alchemy:", error);
//     return null;
//   }
// }

/**
 * Calculate total USD value of all tokens in a wallet
 */
// export async function calculateWalletTotalUsdValue(userAddress: string): Promise<number> {
//   if (!userAddress || !ALCHEMY_API_KEY) {
//     return 0;
//   }

//   try {
//     // Step 1: Get token balances
//     const balances = await getTokenBalances(userAddress);
//     if (balances.length === 0) return 0;

//     // Step 2: Get metadata for all tokens in parallel
//     const metadataList = await Promise.all(
//       balances.map((t) => getTokenMetadata(t.contractAddress))
//     );

//     // Filter out tokens with no metadata
//     const validTokens = balances
//       .map((balance, i) => ({
//         balance,
//         metadata: metadataList[i],
//       }))
//       .filter((item) => item.metadata !== null);

//     if (validTokens.length === 0) return 0;

//     // Step 3: Get prices from CoinGecko
//     const addresses = validTokens.map((t) => t.balance.contractAddress);
//     const prices = await fetchArbitrumUsdPrices(addresses);

//     // Step 4: Calculate total USD value
//     let totalUSD = 0;

//     validTokens.forEach(({ balance, metadata }) => {
//       if (!metadata) return;

//       // Convert hex balance to decimal
//       const balanceBigInt = BigInt(balance.tokenBalance);
//       const decimals = metadata.decimals || 18;
//       const divisor = BigInt(10 ** decimals);
//       const balanceDecimal = Number(balanceBigInt) / Number(divisor);

//       // Get price
//       const priceKey = balance.contractAddress.toLowerCase();
//       const price = prices[priceKey] || 0;

//       // Calculate value
//       const valueUSD = balanceDecimal * price;
//       totalUSD += valueUSD;
//     });

//     return totalUSD;
//   } catch (error) {
//     console.error("Error calculating wallet total USD value:", error);
//     return 0;
//   }
// }


export async function calculateWalletTotalUsdValue(userAddress: string): Promise<number> {
  if (!userAddress || !ALCHEMY_API_KEY) {
    return 0;
  }

  try {
    // Step 1: Get token balances (ERC20) and native ETH
    const balances = await getTokenBalances(userAddress);

    let totalUSD = 0;

    // Step 2: Include native ETH balance (priced using WETH)
    // WETH address on Arbitrum (used for price parity with native ETH)
    const WETH_ADDRESS = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
    const nativeWei = await getNativeEthBalance(userAddress);
    if (nativeWei > 0n) {
      const wethInfo = await fetchDefiLlamaInfo(WETH_ADDRESS);
      const ethDecimals = 18;
      const nativeEth = Number(nativeWei) / Number(10n ** BigInt(ethDecimals));
      const nativeUsd = nativeEth * (wethInfo.price || 0);
      // console.log(`Native ETH Balance: ${nativeEth}, Price: ${wethInfo.price}, USD: ${nativeUsd}`);
      totalUSD += nativeUsd;
      // small spacing delay
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Step 3: Loop through each ERC20 token and fetch price + decimals individually
    for (const balance of balances) {
      const contractAddress = balance.contractAddress.toLowerCase();
      const info = await fetchDefiLlamaInfo(contractAddress);
      const price = info.price;
      if (!price || price <= 0) {
        console.log(`Skipping ${contractAddress} due to missing price`);
        continue;
      }

      // Convert hex balance to decimal using token-specific decimals when available
      const balanceBigInt = BigInt(balance.tokenBalance);
      const decimals = typeof info.decimals === "number" ? info.decimals : 18;
      // Guard against huge exponent with BigInt by building 10^decimals using BigInt
      const divisor = 10n ** BigInt(decimals);
      const balanceDecimal = Number(balanceBigInt) / Number(divisor);
      // console.log(`Token: ${contractAddress}, Decimals: ${decimals}, Balance: ${balanceDecimal}, Price: ${price}`);

      const valueUSD = balanceDecimal * price;
      // console.log(`Value USD for ${contractAddress}: ${valueUSD}`);
      // console.log("totalUSD before addition:", totalUSD);
      totalUSD += valueUSD;

      // Small delay to avoid hitting any rate limits
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return totalUSD;
  } catch (error) {
    console.error("Error calculating wallet total USD value:", error);
    return 0;
  }
}
