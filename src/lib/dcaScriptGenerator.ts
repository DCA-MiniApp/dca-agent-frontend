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

/**
 * Generate the minimal Go script for DCA job execution
 * Only stores essential parameters and calls API for fresh transaction data
 */
export function generateDCAScript(params: DCAScriptParams): string {
  const { userAddress, fromToken, toToken, amount, slippage } = params;

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
    
    client := &http.Client{Timeout: 30 * time.Second}
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
    resultPayload := map[string]interface{}{
        "user": DCA_CONFIG["userAddress"],
        "token": DCA_CONFIG["fromToken"], // Will be resolved to address by contract
        "amount": DCA_CONFIG["amount"],
        "data": transactionData,
    }

    jsonValue, _ := json.Marshal(resultPayload)
    fmt.Println("Payload received:", string(jsonValue))
}`;

  return script;
}

/**
 * Validate minimal DCA script parameters
 */
export function validateDCAScriptParams(params: DCAScriptParams): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.userAddress || !/^0x[a-fA-F0-9]{40}$/.test(params.userAddress)) {
    errors.push('userAddress is required and must be a valid Ethereum address');
  }

  if (!params.fromToken || typeof params.fromToken !== 'string') {
    errors.push('fromToken is required and must be a string');
  }

  if (!params.toToken || typeof params.toToken !== 'string') {
    errors.push('toToken is required and must be a string');
  }

  if (!params.amount || isNaN(parseFloat(params.amount)) || parseFloat(params.amount) <= 0) {
    errors.push('amount is required and must be a positive number');
  }

  if (!params.slippage || isNaN(parseFloat(params.slippage))) {
    errors.push('slippage is required and must be a valid number');
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
    "user": '0x3816BA21dCC9dfD3C714fFDB987163695408653F',
    "token": 'USDC', // Token symbol, resolved to address by contract
    "amount": '100',
    "data": '0x04e45aaf000000000000000000000000af88d065e77c8cc2239327c5edb3a432268e5831...' // Real transaction data from API
  };

  return `Payload received: ${JSON.stringify(example)}`;
}