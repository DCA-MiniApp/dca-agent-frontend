import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { arbitrum } from 'viem/chains';
import { ERC20_ABI } from '../../../lib/tokenContracts';

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

export async function POST(request: NextRequest) {
  try {
    const { tokenAddress, ownerAddress, spenderAddress } = await request.json();

    if (!tokenAddress || !ownerAddress || !spenderAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Read the allowance from the token contract
    const allowance = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [ownerAddress as `0x${string}`, spenderAddress as `0x${string}`],
    });

    return NextResponse.json({
      success: true,
      allowance: allowance.toString(),
    });
  } catch (error) {
    console.error('Error checking allowance:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check allowance',
        allowance: '0' // Default to 0 on error
      },
      { status: 500 }
    );
  }
}
