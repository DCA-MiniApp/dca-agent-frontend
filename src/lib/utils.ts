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
type PlanForUsd = { fromToken: string; amount: string; executionCount: number };

// Simple token map import can be added later; use a lightweight fallback resolver for now
export function getArbitrumAddressBySymbol(symbol: string): string | null {
  const sym = (symbol || '').toUpperCase();
  // Normalize common aliases
  const normalized = sym === 'ETH' ? 'WETH' : sym;
  const tm: any = tokenMapArbitrum as any;
  const entryList: any[] | undefined = tm?.tokenMap?.[normalized];
  if (!entryList || entryList.length === 0) return null;
  // Prefer chainId 42161 and first entry
  const match = entryList.find((e) => e.chainId === 42161) || entryList[0];
  return match?.address || null;
}

export async function fetchArbitrumUsdPrices(addresses: string[]): Promise<Record<string, number>> {
  if (addresses.length === 0) return {};
  const unique = Array.from(new Set(addresses.map((a) => a.toLowerCase())));
  const url = `https://api.coingecko.com/api/v3/simple/token_price/arbitrum-one?contract_addresses=${encodeURIComponent(unique.join(','))}&vs_currencies=usd`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return {};
  const json = await res.json();
  const out: Record<string, number> = {};
  for (const [addr, data] of Object.entries<any>(json)) {
    if (data && typeof data.usd === 'number') out[addr.toLowerCase()] = data.usd;
  }
  return out;
}

export async function computePlansInvestedUsd(plans: PlanForUsd[]): Promise<number> {
  const neededSymbols = Array.from(new Set(plans.map((p) => (p.fromToken || '').toUpperCase()).filter((s) => s && s !== 'USDC')));
  const addresses = neededSymbols.map((s) => getArbitrumAddressBySymbol(s)).filter((a): a is string => !!a);
  const prices = await fetchArbitrumUsdPrices(addresses);

  const symbolToPrice: Record<string, number> = { USDC: 1 };
  for (const sym of neededSymbols) {
    const addr = getArbitrumAddressBySymbol(sym);
    if (addr) symbolToPrice[sym] = prices[addr.toLowerCase()] ?? 0;
  }

  let total = 0;
  for (const plan of plans) {
    const per = parseFloat(plan.amount);
    if (!isFinite(per) || !plan.executionCount) continue;
    const sym = (plan.fromToken || 'USDC').toUpperCase();
    const price = symbolToPrice[sym] ?? 0;
    total += per * price * plan.executionCount;
  }
  return total;
}
