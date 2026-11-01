import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import RentalAgreementContract from '../contracts/RentalAgreement.json';

interface WalletContextType {
  account: string | null;
  chainId: number | null;
  balance: string;
  isConnecting: boolean;
  error: string | null;
  isSupportedNetwork: boolean;
  contractAddress: string;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (targetChainId?: number) => Promise<void>;
  getContract: (withSigner?: boolean) => Promise<ethers.Contract | null>;
  getProvider: () => ethers.BrowserProvider | null;
  getSigner: () => Promise<ethers.Signer | null>;
}

const SUPPORTED_CHAINS = [11155111, 31337]; // Sepolia (11155111) and Hardhat Localhost (31337)
const DEFAULT_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID) || 31337;
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || RentalAgreementContract.address;

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string>('0.00');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isSupportedNetwork = chainId !== null && SUPPORTED_CHAINS.includes(chainId);

  const getProvider = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      return new ethers.BrowserProvider((window as any).ethereum);
    }
    return null;
  }, []);

  const getSigner = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return null;
    try {
      return await provider.getSigner();
    } catch {
      return null;
    }
  }, [getProvider]);

  const updateBalance = useCallback(async (address: string) => {
    const provider = getProvider();
    if (!provider || !address) return;
    try {
      const bal = await provider.getBalance(address);
      setBalance(ethers.formatEther(bal));
    } catch (err) {
      console.warn('Failed to fetch balance:', err);
    }
  }, [getProvider]);

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('MetaMask is not installed. Please install MetaMask to use blockchain features.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const provider = getProvider();
      if (!provider) throw new Error('Ethereum provider unavailable');

      const accounts = await provider.send('eth_requestAccounts', []);
      if (accounts && accounts.length > 0) {
        const activeAccount = accounts[0].toLowerCase();
        setAccount(activeAccount);

        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));

        await updateBalance(activeAccount);
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect MetaMask');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setBalance('0.00');
  };

  const switchNetwork = async (targetChainId: number = DEFAULT_CHAIN_ID) => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;
    setError(null);

    const hexChainId = `0x${targetChainId.toString(16)}`;
    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
    } catch (switchError: any) {
      // Chain not added error code 4902
      if (switchError.code === 4902) {
        try {
          if (targetChainId === 31337) {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: hexChainId,
                  chainName: 'Hardhat Localhost',
                  rpcUrls: ['http://127.0.0.1:8545'],
                  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                },
              ],
            });
          } else if (targetChainId === 11155111) {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: hexChainId,
                  chainName: 'Sepolia Testnet',
                  rpcUrls: ['https://rpc.sepolia.org'],
                  nativeCurrency: { name: 'Sepolia ETH', symbol: 'SEP', decimals: 18 },
                  blockExplorerUrls: ['https://sepolia.etherscan.io'],
                },
              ],
            });
          }
        } catch (addError: any) {
          setError(`Failed to add network: ${addError.message}`);
        }
      } else {
        setError(`Failed to switch network: ${switchError.message}`);
      }
    }
  };

  const getContract = useCallback(async (withSigner = false) => {
    const provider = getProvider();
    if (!provider) return null;

    if (withSigner) {
      const signer = await getSigner();
      if (!signer) return null;
      return new ethers.Contract(CONTRACT_ADDRESS, RentalAgreementContract.abi, signer);
    }

    return new ethers.Contract(CONTRACT_ADDRESS, RentalAgreementContract.abi, provider);
  }, [getProvider, getSigner]);

  // Listen for account and network changes
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;

    const ethereum = (window as any).ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        const nextAccount = accounts[0].toLowerCase();
        setAccount(nextAccount);
        updateBalance(nextAccount);
      } else {
        disconnectWallet();
      }
    };

    const handleChainChanged = (hexChain: string) => {
      const newChainId = parseInt(hexChain, 16);
      setChainId(newChainId);
      if (account) updateBalance(account);
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    // Initial check if already connected
    getProvider()?.send('eth_accounts', []).then((accounts) => {
      if (accounts && accounts.length > 0) {
        const activeAccount = accounts[0].toLowerCase();
        setAccount(activeAccount);
        updateBalance(activeAccount);
        getProvider()?.getNetwork().then((net) => {
          setChainId(Number(net.chainId));
        });
      }
    }).catch(() => {});

    return () => {
      if (ethereum.removeListener) {
        ethereum.removeListener('accountsChanged', handleAccountsChanged);
        ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [account, getProvider, updateBalance]);

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        balance,
        isConnecting,
        error,
        isSupportedNetwork,
        contractAddress: CONTRACT_ADDRESS,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        getContract,
        getProvider,
        getSigner,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

