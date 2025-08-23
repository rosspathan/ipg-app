import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

// Extend Window interface for MetaMask
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

// BSC Mainnet Configuration
const BSC_NETWORK = {
  chainId: 56,
  name: 'Binance Smart Chain',
  currency: 'BNB',
  rpcUrl: 'https://bsc-dataseed1.binance.org/',
  blockExplorerUrl: 'https://bscscan.com',
};

interface WalletData {
  address: string;
  seedPhrase?: string;
  privateKey: string;
  network: 'mainnet';
  balance?: string;
}

interface Web3ContextType {
  wallet: WalletData | null;
  isConnected: boolean;
  network: typeof BSC_NETWORK;
  provider: ethers.JsonRpcProvider | null;
  createWallet: (seedPhrase: string) => Promise<void>;
  importWallet: (seedPhrase: string) => Promise<void>;
  connectMetaMask: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  getBalance: () => Promise<string>;
  disconnectWallet: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [network, setNetwork] = useState<typeof BSC_NETWORK>(BSC_NETWORK);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);

  useEffect(() => {
    // Initialize provider
    const newProvider = new ethers.JsonRpcProvider(network.rpcUrl);
    setProvider(newProvider);
    
    // Check for MetaMask connection first
    const checkMetaMaskConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            // MetaMask is connected, use current account
            const address = accounts[0];
            const walletData: WalletData = {
              address,
              privateKey: '', // MetaMask handles private key
              network: 'mainnet',
            };

            // Get balance
            try {
              const provider = new ethers.BrowserProvider(window.ethereum);
              const balance = await provider.getBalance(address);
              walletData.balance = ethers.formatEther(balance);
            } catch (balanceError) {
              console.warn('Could not fetch balance:', balanceError);
              walletData.balance = '0';
            }

            setWallet(walletData);
            localStorage.setItem('cryptoflow_metamask_wallet', JSON.stringify(walletData));
            return;
          }
        } catch (error) {
          console.error('Error checking MetaMask connection:', error);
        }
      }

      // Fallback to stored wallet if MetaMask not connected
      const storedWallet = localStorage.getItem('cryptoflow_wallet');
      const storedMetaMaskWallet = localStorage.getItem('cryptoflow_metamask_wallet');
      
      if (storedMetaMaskWallet) {
        try {
          const parsedWallet = JSON.parse(storedMetaMaskWallet);
          setWallet(parsedWallet);
        } catch (error) {
          console.error('Error loading stored MetaMask wallet:', error);
          localStorage.removeItem('cryptoflow_metamask_wallet');
        }
      } else if (storedWallet) {
        try {
          const parsedWallet = JSON.parse(storedWallet);
          setWallet(parsedWallet);
        } catch (error) {
          console.error('Error loading stored wallet:', error);
          localStorage.removeItem('cryptoflow_wallet');
        }
      }
    };

    checkMetaMaskConnection();

    // Listen for account changes in MetaMask
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length > 0) {
          const address = accounts[0];
          const walletData: WalletData = {
            address,
            privateKey: '',
            network: 'mainnet',
          };

          try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const balance = await provider.getBalance(address);
            walletData.balance = ethers.formatEther(balance);
          } catch (error) {
            walletData.balance = '0';
          }

          setWallet(walletData);
          localStorage.setItem('cryptoflow_metamask_wallet', JSON.stringify(walletData));
        } else {
          // User disconnected
          setWallet(null);
          localStorage.removeItem('cryptoflow_metamask_wallet');
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);

  useEffect(() => {
    // Update provider when network changes
    const newProvider = new ethers.JsonRpcProvider(network.rpcUrl);
    setProvider(newProvider);
  }, [network]);

  const createWallet = async (seedPhrase: string) => {
    try {
      // Generate wallet from seed phrase
      const ethersWallet = ethers.Wallet.fromPhrase(seedPhrase);
      
      // Create wallet data with BSC mainnet info
      const walletData: WalletData = {
        address: ethersWallet.address, // This is a valid BSC address (same format as Ethereum)
        seedPhrase,
        privateKey: ethersWallet.privateKey,
        network: 'mainnet',
      };
      
      // Get initial balance
      try {
        const provider = new ethers.JsonRpcProvider(BSC_NETWORK.rpcUrl);
        const balance = await provider.getBalance(ethersWallet.address);
        walletData.balance = ethers.formatEther(balance);
      } catch (balanceError) {
        console.warn('Could not fetch initial balance:', balanceError);
        walletData.balance = '0';
      }
      
      setWallet(walletData);
      localStorage.setItem('cryptoflow_wallet', JSON.stringify(walletData));
    } catch (error) {
      console.error('Error creating BSC wallet:', error);
      throw new Error('Failed to create BSC wallet');
    }
  };

  const importWallet = async (seedPhrase: string) => {
    try {
      // Generate wallet from seed phrase
      const ethersWallet = ethers.Wallet.fromPhrase(seedPhrase);
      
      // Create wallet data with BSC mainnet info
      const walletData: WalletData = {
        address: ethersWallet.address, // Valid BSC address
        seedPhrase,
        privateKey: ethersWallet.privateKey,
        network: 'mainnet',
      };
      
      // Get initial balance
      try {
        const provider = new ethers.JsonRpcProvider(BSC_NETWORK.rpcUrl);
        const balance = await provider.getBalance(ethersWallet.address);
        walletData.balance = ethers.formatEther(balance);
      } catch (balanceError) {
        console.warn('Could not fetch initial balance:', balanceError);
        walletData.balance = '0';
      }
      
      setWallet(walletData);
      localStorage.setItem('cryptoflow_wallet', JSON.stringify(walletData));
    } catch (error) {
      console.error('Error importing BSC wallet:', error);
      throw new Error('Failed to import BSC wallet');
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (!wallet) {
      throw new Error('No wallet connected');
    }
    
    try {
      // Check if using MetaMask
      if (typeof window.ethereum !== 'undefined' && !wallet.privateKey) {
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [message, wallet.address],
        });
        return signature;
      } else {
        // Use internal wallet
        const ethersWallet = new ethers.Wallet(wallet.privateKey);
        const signature = await ethersWallet.signMessage(message);
        return signature;
      }
    } catch (error: any) {
      console.error('Error signing message:', error);
      throw new Error(error.message || 'Failed to sign message');
    }
  };

  const getBalance = async (): Promise<string> => {
    if (!wallet || !provider) {
      throw new Error('No BSC wallet or provider available');
    }
    
    try {
      const balance = await provider.getBalance(wallet.address);
      const formattedBalance = ethers.formatEther(balance);
      
      // Update wallet balance in state
      const updatedWallet = { ...wallet, balance: formattedBalance };
      setWallet(updatedWallet);
      localStorage.setItem('cryptoflow_wallet', JSON.stringify(updatedWallet));
      
      return formattedBalance;
    } catch (error) {
      console.error('Error getting BSC balance:', error);
      throw new Error('Failed to get BSC balance');
    }
  };

  const connectMetaMask = async () => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your MetaMask wallet.');
      }

      // Switch to BSC network if needed
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x38' }], // BSC Mainnet
        });
      } catch (switchError: any) {
        // If network doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x38',
              chainName: 'Binance Smart Chain',
              nativeCurrency: {
                name: 'BNB',
                symbol: 'BNB',
                decimals: 18,
              },
              rpcUrls: ['https://bsc-dataseed1.binance.org/'],
              blockExplorerUrls: ['https://bscscan.com/'],
            }],
          });
        } else {
          throw switchError;
        }
      }

      const address = accounts[0];
      
      // Create wallet data for MetaMask
      const walletData: WalletData = {
        address,
        privateKey: '', // MetaMask handles private key
        network: 'mainnet',
      };

      // Get balance
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const balance = await provider.getBalance(address);
        walletData.balance = ethers.formatEther(balance);
      } catch (balanceError) {
        console.warn('Could not fetch balance:', balanceError);
        walletData.balance = '0';
      }

      setWallet(walletData);
      localStorage.setItem('cryptoflow_metamask_wallet', JSON.stringify(walletData));
    } catch (error: any) {
      console.error('MetaMask connection error:', error);
      throw new Error(error.message || 'Failed to connect to MetaMask');
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    localStorage.removeItem('cryptoflow_wallet');
    localStorage.removeItem('cryptoflow_metamask_wallet');
  };

  const value = {
    wallet,
    isConnected: !!wallet,
    network,
    provider,
    createWallet,
    importWallet,
    connectMetaMask,
    signMessage,
    getBalance,
    disconnectWallet,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};