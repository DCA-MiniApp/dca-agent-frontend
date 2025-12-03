/**
 * Minimal DCA Script Generator for TriggerX Jobs
 *
 * This generates a minimal Go script that only stores essential DCA parameters
 * and calls the prepare-swap API to get fresh transaction data at execution time.
 */

export interface DCAScriptParams {
  userAddress: string;
  fromToken: string;
  toToken: string;
  amount: string;
  slippage: string;
}

// Load Arbitrum token map to resolve token symbols to addresses
// This JSON is large; we only extract the address for provided symbols.
import tokenMapArbitrum from "../tokenMap_arbitrum.json";

function resolveTokenAddressFromMap(symbol: string): string | null {
  if (!symbol) return null;
  const entry = (tokenMapArbitrum as any)?.tokenMap?.[symbol];
  if (!Array.isArray(entry) || entry.length === 0) return null;
  // Prefer first entry (token list uses single entry per symbol for Arbitrum)
  const token = entry[0];
  return typeof token?.address === "string" ? token.address : null;
}

function resolveTokenDecimalsFromMap(symbol: string, address?: string | null): number | null {
  const bySymbol = (tokenMapArbitrum as any)?.tokenMap?.[symbol];
  if (Array.isArray(bySymbol) && bySymbol[0]?.decimals != null) {
    // console.log('bySymbol', bySymbol[0].decimals);
    return Number(bySymbol[0].decimals);
  }
  return null;
}

// Convert human-readable decimal amount string into integer string scaled by `decimals`
function scaleAmountToUint(amountStr: string, decimals: number): string {
  const trimmed = String(amountStr).trim();
  if (!/^[0-9]*\.?[0-9]*$/.test(trimmed)) return "0";
  // console.log('trimmed', trimmed);
  const [intPartRaw, fracPartRaw = ""] = trimmed.split(".");
  const intPart = intPartRaw.replace(/^0+(?=\d)/, "");
  // console.log('intPart', intPart);
  const fracPart = (fracPartRaw + "0".repeat(decimals)).slice(0, decimals);
  // console.log('fracPart', fracPart);
  const combined = (intPart || "0") + fracPart;
  // Remove leading zeros but keep at least one zero
  const withoutLeading = combined.replace(/^0+(?=\d)/, "");
  // console.log('withoutLeading', withoutLeading);
  return withoutLeading === "" ? "0" : withoutLeading;
}

/**
 * Generate the minimal Go script for DCA job execution
 * Only stores essential parameters and calls API for fresh transaction data
 */
export function generateDCAScript(params: DCAScriptParams): string {
  const { userAddress, fromToken, toToken, amount, slippage } = params;

  console.log('🔍 [DCA SCRIPT GENERATOR] userAddress in params:', userAddress);
  console.log('🔍 [DCA SCRIPT GENERATOR] Address length:', userAddress?.length);
  console.log('🔍 [DCA SCRIPT GENERATOR] Address regex test:', /^0x[a-fA-F0-9]{40}$/.test(userAddress || ''));

  // Resolve token addresses from the Arbitrum token map
  const fromTokenAddress = resolveTokenAddressFromMap(fromToken) ?? "";
  const fromTokenDecimals = resolveTokenDecimalsFromMap(fromToken, fromTokenAddress) ?? 18;
  const scaledAmount = scaleAmountToUint(amount, fromTokenDecimals);
  console.log('scaledAmount', scaledAmount);
  console.log('🔍 [DCA SCRIPT GENERATOR] userAddress that will be embedded in script:', userAddress);
  const script = `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

// Essential DCA parameters only
var DCA_CONFIG = map[string]interface{}{
    "userAddress": "${userAddress}",
    "fromToken": "${fromToken}",
    "toToken": "${toToken}",
    "amount": "${amount}",
    "slippage": "${slippage}",
}

// API Response structure
type PrepareSwapResponse struct {
    Success bool \`json:"success"\`
    Data struct {
        Transactions []struct {
            Data string \`json:"data"\`
        } \`json:"transactions"\`
    } \`json:"data"\`
}

// Call prepare-swap API to get fresh transaction data
func getTransactionData() (string, error) {
    requestPayload := map[string]interface{}{
        "fromToken": DCA_CONFIG["fromToken"],
        "toToken": DCA_CONFIG["toToken"],
        "amount": DCA_CONFIG["amount"],
        "userAddress": DCA_CONFIG["userAddress"],
        "slippage": DCA_CONFIG["slippage"],
    }
    
    jsonPayload, err := json.Marshal(requestPayload)
    if err != nil {
        return "0x", err
    }
    
    client := &http.Client{Timeout: 60 * time.Second}
    req, err := http.NewRequest("POST", "https://dca-backend.udonswap.org/api/dca/prepare-swap", bytes.NewBuffer(jsonPayload))
    if err != nil {
        return "0x", err
    }
    req.Header.Set("Content-Type", "application/json")
    
    resp, err := client.Do(req)
    if err != nil {
        return "0x", err
    }
    defer resp.Body.Close()
    
    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return "0x", err
    }
    
    var apiResp PrepareSwapResponse
    err = json.Unmarshal(body, &apiResp)
    if err != nil {
        return "0x", err
    }
    
    if !apiResp.Success || len(apiResp.Data.Transactions) == 0 {
        return "0x", fmt.Errorf("API response error or no transactions")
    }
    
    // Return data from last transaction (main swap)
    lastTx := apiResp.Data.Transactions[len(apiResp.Data.Transactions)-1]
    return lastTx.Data, nil
}

func main() {
    // Get fresh transaction data from API
    transactionData, err := getTransactionData()
    if err != nil {
        fmt.Printf("Error getting transaction data: %v\\n", err)
        transactionData = "0x" // fallback
    }
    
    // Return the 4 required contract parameters
        resultPayload := []interface{}{
            DCA_CONFIG["userAddress"],    // user
            "${fromTokenAddress}", // token address
            "${scaledAmount}",         // amount (uint256 scaled by token decimals)
            transactionData,              // data
        }

    jsonValue, _ := json.Marshal(resultPayload)
    fmt.Println(string(jsonValue))
}`;

  return script;
}

/**
 * Validate minimal DCA script parameters
 */
export function validateDCAScriptParams(params: DCAScriptParams): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!params.userAddress || !/^0x[a-fA-F0-9]{40}$/.test(params.userAddress)) {
    errors.push("userAddress is required and must be a valid Ethereum address");
  }

  if (!params.fromToken || typeof params.fromToken !== "string") {
    errors.push("fromToken is required and must be a string");
  }

  if (!params.toToken || typeof params.toToken !== "string") {
    errors.push("toToken is required and must be a string");
  }

  if (
    !params.amount ||
    isNaN(parseFloat(params.amount)) ||
    parseFloat(params.amount) <= 0
  ) {
    errors.push("amount is required and must be a positive number");
  }

  if (!params.slippage || isNaN(parseFloat(params.slippage))) {
    errors.push("slippage is required and must be a valid number");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Example of script execution output
 */
export function getExecutionResultExample(): string {
  const example = {
    user: "0x3816BA21dCC9dfD3C714fFDB987163695408653F",
    token: "0xaf88d065e77c8C2239327C5EDb3A432268e5831",
    amount: "100000000", // 100 USDC with 6 decimals
    data: "0x04e45aaf000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e5831...", // Real transaction data from API
  };

  return `${JSON.stringify(example)}`;
}
