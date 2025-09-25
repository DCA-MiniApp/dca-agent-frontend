// SwapExecutor Contract ABI - extracted from SwapExecutor.json
export const SWAP_EXECUTOR_ABI = [
  {
    "type": "function",
    "name": "CALLER",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "EXECUTOR",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "executeSwap",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
] as const;

// Executor contract address - from environment variable
export const EXECUTOR_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_EXECUTOR_ADDRESS || "0x146Ee96520D0468FB601e5E59FdDd6f7044bF829";

// Target function name for TriggerX jobs
export const TARGET_FUNCTION_NAME = "executeSwap";

// Job configuration constants
export const DCA_JOB_CONFIG = {
  jobTitle: "dca-automate",
  scheduleType: "interval" as const,
  timezone: "Asia/Calcutta",
  chainId: "42161", // Arbitrum
  autotopupTG: true,
} as const;
