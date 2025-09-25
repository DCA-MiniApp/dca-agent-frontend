/**
 * Token contracts and addresses for Arbitrum network
 * Uses the comprehensive token map from tokenMap_arbitrum.json
 */

// Import the comprehensive token map from JSON file
import tokenMapData from '../tokenMap_arbitrum.json';

export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  chainId: number;
}

// Extract token map from JSON file
const tokenMap = tokenMapData.tokenMap as Record<string, TokenInfo[]>;

// Helper function to get token info by symbol
export function getTokenInfo(symbol: string): TokenInfo | null {
  const tokenList = tokenMap[symbol.toUpperCase()];
  if (!tokenList || tokenList.length === 0) {
    return null;
  }
  // Return the first token for Arbitrum (chainId 42161)
  return tokenList.find(token => token.chainId === 42161) || tokenList[0];
}

// Helper function to get token address by symbol
export function getTokenAddress(symbol: string): string | null {
  const tokenInfo = getTokenInfo(symbol);
  return tokenInfo?.address || null;
}

// Export commonly used tokens for quick access (populated from JSON)
export const ARBITRUM_TOKENS: Record<string, TokenInfo> = {};

// Populate common tokens from JSON data
const commonTokenSymbols = ['USDC', 'WETH', 'WBTC', 'USDT', 'DAI', 'ARB', 'LINK', 'UNI'];
commonTokenSymbols.forEach(symbol => {
  const tokenInfo = getTokenInfo(symbol);
  if (tokenInfo) {
    ARBITRUM_TOKENS[symbol] = tokenInfo;
  }
});

// Export the full token map for comprehensive access
export const FULL_TOKEN_MAP = tokenMap;

// ERC-20 ABI for approve function
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// DCA contract address (placeholder - replace with actual deployed contract)
export const EXECUTOR_ADDRESS = process.env.NEXT_PUBLIC_EXECUTOR_ADDRESS;

/**
 * Calculate approval amount with total investment
 */
export function calculateTotalApprovalAmount(
  amountPerExecution: string,
  intervalMinutes: number,
  durationWeeks: number
): bigint {
  const totalExecutions = Math.floor((durationWeeks * 7 * 24 * 60) / intervalMinutes);
  const amountPerExecutionBN = BigInt(parseFloat(amountPerExecution) * 1e18); // Convert to wei-like units
  return amountPerExecutionBN * BigInt(totalExecutions);
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const quotient = amount / divisor;
  const remainder = amount % divisor;
  
  if (remainder === 0n) {
    return quotient.toString();
  }
  
  const remainderStr = remainder.toString().padStart(decimals, '0');
  const trimmedRemainder = remainderStr.replace(/0+$/, '');
  
  if (trimmedRemainder === '') {
    return quotient.toString();
  }
  
  return `${quotient}.${trimmedRemainder}`;
}

/**
 * Get all available token symbols from the JSON file
 */
export function getAllTokenSymbols(): string[] {
  return Object.keys(tokenMap);
}

/**
 * Search tokens by name or symbol
 */
export function searchTokens(query: string): TokenInfo[] {
  const lowerQuery = query.toLowerCase();
  const results: TokenInfo[] = [];
  
  Object.values(tokenMap).forEach(tokenList => {
    tokenList.forEach(token => {
      if (
        token.chainId === 42161 && 
        (token.symbol.toLowerCase().includes(lowerQuery) || 
         token.name.toLowerCase().includes(lowerQuery))
      ) {
        results.push(token);
      }
    });
  });
  
  return results;
}