import { useState, useCallback } from "react";
import { parseEther } from "ethers";
import { getEthersSigner } from "../utils/signer";

export function useDepositFlow() {
  const [depositAmounts, setDepositAmounts] = useState<Record<string, string>>({});
  const [depositStatuses, setDepositStatuses] = useState<Record<string, string>>({});
  const [isDepositLoading, setIsDepositLoading] = useState<Record<string, boolean>>({});

  const handleDeposit = useCallback(
    async (
      messageId: string,
      amount: string,
      walletClient: any,
      connector: any,
      address: string | undefined
    ) => {
      if (!walletClient || !address || !connector) {
        setDepositStatuses((prev) => ({
          ...prev,
          [messageId]: "❌ Wallet not connected",
        }));
        return;
      }

      if (!amount || parseFloat(amount) <= 0) {
        setDepositStatuses((prev) => ({
          ...prev,
          [messageId]: "❌ Invalid amount",
        }));
        return;
      }

      setIsDepositLoading((prev) => ({ ...prev, [messageId]: true }));
      setDepositStatuses((prev) => ({ ...prev, [messageId]: "" }));

      try {
        const signer = await getEthersSigner(walletClient, connector);
        const { depositTgBalanceForUser } = await import(
          "../../../../../lib/triggerXIntegration"
        );

        const result = await depositTgBalanceForUser(
          parseEther(amount),
          signer
        );

        if (result.success) {
          setDepositStatuses((prev) => ({
            ...prev,
            [messageId]: `✅ Deposited ${amount} ETH successfully!`,
          }));
          // Clear the input after successful deposit
          setDepositAmounts((prev) => ({ ...prev, [messageId]: "" }));
        } else {
          setDepositStatuses((prev) => ({
            ...prev,
            [messageId]: `❌ Deposit failed: ${result.error || "Unknown error"}`,
          }));
        }
      } catch (error: any) {
        console.error("Deposit error:", error);
        setDepositStatuses((prev) => ({
          ...prev,
          [messageId]: `❌ Error: ${error.message || "Deposit failed"}`,
        }));
      } finally {
        setIsDepositLoading((prev) => ({ ...prev, [messageId]: false }));
      }
    },
    []
  );

  return {
    depositAmounts,
    depositStatuses,
    isDepositLoading,
    setDepositAmounts,
    handleDeposit,
  };
}
