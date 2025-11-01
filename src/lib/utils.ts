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
  const unique = Array.from(new Set(addresses.map((a) => a.toLowerCase())));
  const url = `https://api.coingecko.com/api/v3/simple/token_price/arbitrum-one?contract_addresses=${encodeURIComponent(unique.join(','))}&vs_currencies=usd`;
  // console.log('url', url);
  const res = await fetch(url, { cache: 'no-store' });
  // console.log('res', res);
  if (!res.ok) return {};
  const json = await res.json();
  const out: Record<string, number> = {};
  for (const [addr, data] of Object.entries<any>(json)) {
    if (data && typeof data.usd === 'number') out[addr.toLowerCase()] = data.usd;
  }
  return out;
}

export async function computePlansInvestedUsd(plans: PlanForUsd[]): Promise<number> {
  // console.log('plans in computePlansInvestedUsd file utils...', plans);
  // Include USDC too so we can fetch/confirm its price (fallback remains 1 if API misses it)
  const neededSymbols = Array.from(
    new Set(
      plans
        .map((p) => (p.fromToken || '').trim().toUpperCase())
        .filter((s) => s)
    )
  );
  // console.log('neededSymbols', neededSymbols);
  const addresses = neededSymbols.map((s) => getArbitrumAddressBySymbol(s)).filter((a): a is string => !!a);
  // console.log('addresses', addresses);
  const prices = await fetchArbitrumUsdPrices(addresses);
  // console.log('prices', prices);
  const symbolToPrice: Record<string, number> = { USDC: 1 };
  for (const sym of neededSymbols) {
    const addr = getArbitrumAddressBySymbol(sym);
    if (addr) symbolToPrice[sym] = prices[addr.toLowerCase()] ?? 0;
  }

  const successCounts = await Promise.all(plans.map((p) => fetchJobSuccessCount(p.jobId)));
  // console.log('successCounts', successCounts);

  let total = 0;
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const per = parseFloat(plan.amount);
    const successCount = successCounts[i];
    // if (!isFinite(per) || !successCount) continue;
    const sym = (plan.fromToken || 'USDC').toUpperCase();

    // console.log("sym in computePlansInvestedUsd", sym);
    const price = symbolToPrice[sym] ?? 0;
    // console.log("symbolToPrice in computePlansInvestedUsd", symbolToPrice);
    // console.log("price in computePlansInvestedUsd", price);
    total += per * price * (successCount ?? 0);
    // console.log("total in computePlansInvestedUsd", total);
  }
  return total;
}
