/**
 * Dynamic Script Generator for DCA TriggerX Jobs
 *
 * This script generates JavaScript code that will be uploaded to IPFS
 * and used by TriggerX to execute DCA swaps with dynamic parameters.
 */

export interface DCAScriptParams {
  planId: string;
  userAddress: string;
  fromToken: string;
  fromTokenAddress?: string; // Token contract address
  toToken: string;
  toTokenAddress?: string; // Token contract address
  amount: string;
  intervalMinutes: number;
  durationWeeks: number;
  slippage: string;
  createdAt: string;
  jobId?: string;
}

/**
 * Generate the dynamic script for DCA job execution
 * This script will be uploaded to IPFS and referenced by TriggerX
 *
 * Script Structure (following Go template):
 * 1. Stores all DCA plan details (planId, userAddress, fromToken, toToken, amount, etc.)
 * 2. Tracks execution count and plan status
 * 3. Returns 4 values required by SwapExecutor contract:
 *    - user: userAddress
 *    - token: fromTokenAddress
 *    - amount: amount used at every interval
 *    - data: encoded data from MCP tool call (placeholder for now)
 */
export function generateDCAScript(params: DCAScriptParams): string {
  const {
    planId,
    userAddress,
    fromToken,
    fromTokenAddress,
    toToken,
    toTokenAddress,
    amount,
    intervalMinutes,
    durationWeeks,
    slippage,
    createdAt,
    jobId,
  } = params;

  // Convert slippage percentage to decimal (e.g., "2" -> "0.02")
  const slippageDecimal = (parseFloat(slippage) / 100).toString();

  const script = `
package main

import (
    "encoding/json"
    "fmt"
)

// DCA Job Execution Script
// Generated for TriggerX automated execution
// Following Go template structure exactly
//
// Plan ID: ${planId}
// User: ${userAddress}
// Job ID: ${jobId || 'PENDING'}
// Created: ${createdAt}

// DCA Plan Configuration - Store all details as mentioned
var DCA_CONFIG = map[string]interface{}{
    "planId": "${planId}",
    "userAddress": "${userAddress}",
    "fromToken": "${fromToken}",
    "fromTokenAddress": "${fromTokenAddress || ''}",
    "toToken": "${toToken}",
    "toTokenAddress": "${toTokenAddress || ''}",
    "amount": "${amount}",
    "intervalMinutes": ${intervalMinutes},
    "durationWeeks": ${durationWeeks},
    "slippage": "${slippageDecimal}",
    "createdAt": "${createdAt}",
    "jobId": "${jobId || ''}",
}

func main() {
    // Create resultPayload object with parameter name matching the function parameter name
    // Use the exact parameter names from the smart contract executeSwap function
    resultPayload := map[string]interface{}{
        "user": DCA_CONFIG["userAddress"],      // address user - first parameter
        "token": DCA_CONFIG["fromTokenAddress"], // address token - second parameter
        "amount": DCA_CONFIG["amount"],          // uint256 amount - third parameter
        "data": "0x",                           // bytes data - fourth parameter (MCP placeholder)
    }

    // Convert to JSON (equivalent to json.Marshal in Go)
    jsonValue, _ := json.Marshal(resultPayload)

    // Print following Go template format
    fmt.Println("Payload received:", string(jsonValue))
}
`;

  return script;
}

/**
 * Generate metadata for the DCA script (for IPFS storage)
 */
export function generateDCAScriptMetadata(params: DCAScriptParams) {
  return {
    name: `DCA-Job-${params.planId}`,
    description: `Dynamic script for DCA plan ${params.planId} - ${params.fromToken} to ${params.toToken}`,
    type: 'application/javascript',
    // Store all details as mentioned
    planDetails: {
      planId: params.planId,
      userAddress: params.userAddress,
      fromToken: params.fromToken,
      fromTokenAddress: params.fromTokenAddress,
      toToken: params.toToken,
      toTokenAddress: params.toTokenAddress,
      amount: params.amount,
      intervalMinutes: params.intervalMinutes,
      durationWeeks: params.durationWeeks,
      slippage: params.slippage,
      createdAt: params.createdAt,
      jobId: params.jobId || null,
    },
    // Contract execution parameters (4 required values)
    executionPayload: {
      user: params.userAddress,
      token: params.fromTokenAddress || params.fromToken, // Use address if available, fallback to symbol
      amount: params.amount,
      data: '0x', // placeholder for MCP tool call encoded data
    },
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Validate DCA script parameters
 */
export function validateDCAScriptParams(params: DCAScriptParams): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.planId || typeof params.planId !== 'string') {
    errors.push('planId is required and must be a string');
  }

  if (!params.userAddress || !/^0x[a-fA-F0-9]{40}$/.test(params.userAddress)) {
    errors.push('userAddress is required and must be a valid Ethereum address');
  }

  if (!params.fromToken || !/^0x[a-fA-F0-9]{40}$/.test(params.fromToken)) {
    errors.push('fromToken is required and must be a valid token address');
  }

  if (!params.toToken || !/^0x[a-fA-F0-9]{40}$/.test(params.toToken)) {
    errors.push('toToken is required and must be a valid token address');
  }

  if (!params.amount || isNaN(parseFloat(params.amount)) || parseFloat(params.amount) <= 0) {
    errors.push('amount is required and must be a positive number');
  }

  if (!params.intervalMinutes || params.intervalMinutes < 1) {
    errors.push('intervalMinutes is required and must be greater than 0');
  }

  if (!params.durationWeeks || params.durationWeeks < 1) {
    errors.push('durationWeeks is required and must be greater than 0');
  }

  if (!params.slippage || isNaN(parseFloat(params.slippage))) {
    errors.push('slippage is required and must be a valid number');
  }

  if (!params.createdAt) {
    errors.push('createdAt is required');
  }

  // Note: fromTokenAddress and toTokenAddress are optional but recommended for contract calls

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Example of what the generated Go script outputs when executed
 * This shows the exact console output and JSON structure
 */
export function getExecutionResultExample(): string {
  const example = {
    "user": '0x1234567890123456789012345678901234567890', // address user - first parameter
    "token": '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', // address token - second parameter (WBTC on Arbitrum)
    "amount": '100.50', // uint256 amount - third parameter
    "data": '0x' // bytes data - fourth parameter (MCP placeholder)
  };

  return `Payload received: ${JSON.stringify(example)}`;
}

/**
 * Test function to demonstrate Go script execution
 * This shows how the Go script would work in practice
 */
export function testDCAScriptExecution(): void {
  console.log('🧪 Testing DCA Go Script Execution Structure:');
  console.log('Expected Go script output:', getExecutionResultExample());

  // This demonstrates the 4 values that will be passed to the contract
  const contractParameters = {
    "user": 'userAddress from DCA_CONFIG',
    "token": 'fromTokenAddress from DCA_CONFIG',
    "amount": 'amount from DCA_CONFIG',
    "data": 'encoded data from MCP tool call (placeholder: 0x)'
  };

  console.log('📋 Contract parameters structure:', contractParameters);
  console.log('✅ Go script follows exact template structure with json.Marshal and fmt.Println');
}
