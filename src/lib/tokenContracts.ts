/**
 * Token contracts and addresses for Arbitrum network
 */

export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
}

// Arbitrum token addresses
export const ARBITRUM_TOKENS: Record<string, TokenInfo> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    decimals: 6,
  },
  USDT: {
    symbol: 'USDT', 
    name: 'Tether USD',
    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    decimals: 6,
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    decimals: 18,
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    decimals: 18,
  },
  WBTC: {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    decimals: 8,
  },
  ARB: {
    symbol: 'ARB',
    name: 'Arbitrum',
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    decimals: 18,
  },
  LINK: {
    symbol: 'LINK',
    name: 'Chainlink',
    address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
    decimals: 18,
  },
  UNI: {
    symbol: 'UNI',
    name: 'Uniswap',
    address: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
    decimals: 18,
  },
};

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
export const EXECUATOR_ADDRESS = '0x3816BA21dCC9dfD3C714fFDB987163695408653F';

/**
 * Get token info by symbol
 */
export function getTokenInfo(symbol: string): TokenInfo | undefined {
  return ARBITRUM_TOKENS[symbol.toUpperCase()];
}

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