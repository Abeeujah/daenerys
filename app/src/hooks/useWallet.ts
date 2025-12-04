import { useState, useCallback } from "react";
import { connect, disconnect } from "@starknet-io/get-starknet";
import { AccountInterface, RpcProvider, Account, WalletAccount } from "starknet";

const RPC_URL = import.meta.env.VITE_RPC_URL;
const DEVNET_ACCOUNT_ADDRESS = import.meta.env.VITE_DEVNET_ACCOUNT_ADDRESS;
const DEVNET_PRIVATE_KEY = import.meta.env.VITE_DEVNET_PRIVATE_KEY;

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  account: AccountInterface | null;
  isDevnet: boolean;
}

interface UseWalletReturn {
  wallet: WalletState;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  useDevnetAccount: () => void;
  error: string | null;
}

export function useWallet(): UseWalletReturn {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    account: null,
    isDevnet: false,
  });
  const [error, setError] = useState<string | null>(null);

  const connectWallet = useCallback(async () => {
    try {
      setError(null);
      const starknet = await connect();

      if (!starknet) {
        throw new Error("No wallet found. Please install Argent X or Braavos.");
      }

      const accounts = await starknet.request({
        type: "wallet_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0];
      const provider = new RpcProvider({ nodeUrl: RPC_URL });

      const walletAccount = new WalletAccount({
        walletProvider: starknet,
        provider,
        address,
      });

      setWallet({
        isConnected: true,
        address,
        account: walletAccount as AccountInterface,
        isDevnet: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect wallet";
      setError(message);
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      await disconnect();
      setWallet({
        isConnected: false,
        address: null,
        account: null,
        isDevnet: false,
      });
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to disconnect";
      setError(message);
    }
  }, []);

  const useDevnetAccount = useCallback(() => {
    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    const account = new Account({
      provider,
      address: DEVNET_ACCOUNT_ADDRESS,
      signer: DEVNET_PRIVATE_KEY,
    });

    setWallet({
      isConnected: true,
      address: DEVNET_ACCOUNT_ADDRESS,
      account: account as AccountInterface,
      isDevnet: true,
    });
    setError(null);
  }, []);

  return {
    wallet,
    connectWallet,
    disconnectWallet,
    useDevnetAccount,
    error,
  };
}
