import { useState, useEffect } from "react";
import { parseEther } from "ethers";
import {
  checkTgBalanceForUser,
  depositTgBalanceForUser,
  withdrawTgBalanceForUser,
} from "../../../../../lib/triggerXIntegration";

export function useTriggerX(isConnected: boolean, address?: string, wagmiWalletClient?: any) {
  const [tgBalance, setTgBalance] = useState<number | null>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isTopupLoading, setIsTopupLoading] = useState(false);
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [topupStatus, setTopupStatus] = useState<string | null>(null);
  const [withdrawStatus, setWithdrawStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchTgBalance = async () => {
      if (!isConnected || !address) return;

      try {
        const balance = await checkTgBalanceForUser(address);
        // console.log("TG Balance fetched:", balance);
        setTgBalance(balance.data ? Number(balance.data.ethBalance) : 0);
      } catch (error) {
        setTgBalance(null);
      }
    };

    fetchTgBalance();
  }, [isConnected, address]);

  const getSigner = async () => {
    const { BrowserProvider } = await import("ethers");
    let signer: any = null;

    if (
      wagmiWalletClient?.transport &&
      (wagmiWalletClient.transport as any).request
    ) {
      const provider = new BrowserProvider(
        wagmiWalletClient.transport as any
      );
      const addr = wagmiWalletClient.account?.address;
      signer = addr
        ? await provider.getSigner(addr)
        : await provider.getSigner();
    } else if (typeof window !== "undefined" && (window as any).ethereum) {
      const provider = new BrowserProvider((window as any).ethereum);
      try {
        const accounts = await provider.send("eth_accounts", []);
        if (!accounts || accounts.length === 0) {
          await provider.send("eth_requestAccounts", []);
        }
      } catch {
        // ignore account fetch errors
      }
      signer = await provider.getSigner();
    }

    return signer;
  };

  const handleTopupTg = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isConnected || !wagmiWalletClient) {
      setTopupStatus("Please connect your wallet on Arbitrum first.");
      return;
    }

    const amountNumber = Number(topupAmount);
    const amountInWei = parseEther(topupAmount || "0");
    if (!topupAmount || isNaN(amountNumber) || amountNumber <= 0) {
      setTopupStatus("Enter a valid ETH amount greater than 0.");
      return;
    }

    setIsTopupLoading(true);
    setTopupStatus(null);

    try {
      const signer = await getSigner();

      if (!signer) {
        setTopupStatus("Could not obtain wallet signer. Please reconnect.");
        setIsTopupLoading(false);
        return;
      }

      const result = await depositTgBalanceForUser(amountInWei, signer);

      if (result.success) {
        setTopupStatus("Top-up of ETH successfully completed.");
        setTopupAmount("");

        try {
          if (!address) return;
          const balance = await checkTgBalanceForUser(address);
          setTgBalance(Number(balance.data?.ethBalance ?? 0));
        } catch {
          // ignore balance refresh errors
        }
      } else {
        setTopupStatus(
          result.error || "Top-up failed. Please try again in a moment."
        );
      }
    } catch (error: any) {
      setTopupStatus(
        error?.message
          ? `Top-up failed: ${error.message}`
          : "Top-up failed due to an unexpected error."
      );
    } finally {
      setIsTopupLoading(false);
    }
  };

  const handleWithdrawTg = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isConnected || !wagmiWalletClient) {
      setWithdrawStatus("Please connect your wallet on Arbitrum first.");
      return;
    }

    const amountNumber = Number(withdrawAmount);
    const amountInWei = parseEther(withdrawAmount || "0");
    if (!withdrawAmount || isNaN(amountNumber) || amountNumber <= 0) {
      setWithdrawStatus("Enter a valid ETH amount greater than 0.");
      return;
    }

    setIsWithdrawLoading(true);
    setWithdrawStatus(null);

    try {
      const signer = await getSigner();

      if (!signer) {
        setWithdrawStatus("Could not obtain wallet signer. Please reconnect.");
        setIsWithdrawLoading(false);
        return;
      }

      const result = await withdrawTgBalanceForUser(amountInWei, signer);

      if (result.success) {
        setWithdrawStatus("Withdrawal of ETH successfully completed.");
        setWithdrawAmount("");

        try {
          if (!address) return;
          const balance = await checkTgBalanceForUser(address);
          setTgBalance(Number(balance.data?.ethBalance ?? 0));
        } catch {
          // ignore balance refresh errors
        }
      } else {
        setWithdrawStatus(
          result.error || "Withdrawal failed. Please try again in a moment."
        );
      }
    } catch (error: any) {
      setWithdrawStatus(
        error?.message
          ? `Withdrawal failed: ${error.message}`
          : "Withdrawal failed due to an unexpected error."
      );
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  return {
    tgBalance,
    topupAmount,
    withdrawAmount,
    isTopupLoading,
    isWithdrawLoading,
    topupStatus,
    withdrawStatus,
    setTopupAmount,
    setWithdrawAmount,
    handleTopupTg,
    handleWithdrawTg,
    setTgBalance,
  };
}
