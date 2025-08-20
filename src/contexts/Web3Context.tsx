import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

// BSC Network Configuration
const BSC_NETWORK = {
  chainId: 56,
  name: 'Binance Smart Chain',
  currency: 'BNB',
  rpcUrl: 'https://bsc-dataseed1.binance.org/',
  blockExplorerUrl: 'https://bscscan.com',
};

const BSC_TESTNET = {
  chainId: 97,
  name: 'BSC Testnet',
  currency: 'tBNB',
  rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  blockExplorerUrl: 'https://testnet.bscscan.com',
};

interface WalletData {
  address: string;
  seedPhrase?: string;
  privateKey: string;
  network: 'mainnet' | 'testnet';
  balance?: string;
}

interface Web3ContextType {
  wallet: WalletData | null;
  isConnected: boolean;
  network: typeof BSC_NETWORK | typeof BSC_TESTNET;
  provider: ethers.JsonRpcProvider | null;
  createWallet: (seedPhrase: string, useTestnet?: boolean) => Promise<void>;
  importWallet: (seedPhrase: string, useTestnet?: boolean) => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  getBalance: () => Promise<string>;
  switchNetwork: (useTestnet: boolean) => Promise<void>;
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
  const [network, setNetwork] = useState<typeof BSC_NETWORK | typeof BSC_TESTNET>(BSC_NETWORK);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);

  useEffect(() => {
    // Initialize provider
    const newProvider = new ethers.JsonRpcProvider(network.rpcUrl);
    setProvider(newProvider);
    
    // Check for stored wallet on initialization
    const storedWallet = localStorage.getItem('cryptoflow_wallet');
    const storedNetwork = localStorage.getItem('cryptoflow_network');
    
    if (storedWallet) {
      try {
        const parsedWallet = JSON.parse(storedWallet);
        setWallet(parsedWallet);
        
        if (storedNetwork) {
          const isTestnet = JSON.parse(storedNetwork);
          setNetwork(isTestnet ? BSC_TESTNET : BSC_NETWORK);
        }
      } catch (error) {
        console.error('Error loading stored wallet:', error);
        localStorage.removeItem('cryptoflow_wallet');
        localStorage.removeItem('cryptoflow_network');
      }
    }
  }, []);

  useEffect(() => {
    // Update provider when network changes
    const newProvider = new ethers.JsonRpcProvider(network.rpcUrl);
    setProvider(newProvider);
  }, [network]);

  const createWallet = async (seedPhrase: string, useTestnet: boolean = false) => {
    try {
      // Generate wallet from seed phrase
      const ethersWallet = ethers.Wallet.fromPhrase(seedPhrase);
      
      // Set network
      const selectedNetwork = useTestnet ? BSC_TESTNET : BSC_NETWORK;
      setNetwork(selectedNetwork);
      
      // Create wallet data with BSC network info
      const walletData: WalletData = {
        address: ethersWallet.address, // This is a valid BSC address (same format as Ethereum)
        seedPhrase,
        privateKey: ethersWallet.privateKey,
        network: useTestnet ? 'testnet' : 'mainnet',
      };
      
      // Get initial balance
      try {
        const provider = new ethers.JsonRpcProvider(selectedNetwork.rpcUrl);
        const balance = await provider.getBalance(ethersWallet.address);
        walletData.balance = ethers.formatEther(balance);
      } catch (balanceError) {
        console.warn('Could not fetch initial balance:', balanceError);
        walletData.balance = '0';
      }
      
      setWallet(walletData);
      localStorage.setItem('cryptoflow_wallet', JSON.stringify(walletData));
      localStorage.setItem('cryptoflow_network', JSON.stringify(useTestnet));
    } catch (error) {
      console.error('Error creating BSC wallet:', error);
      throw new Error('Failed to create BSC wallet');
    }
  };

  const importWallet = async (seedPhrase: string, useTestnet: boolean = false) => {
    try {
      // Generate wallet from seed phrase
      const ethersWallet = ethers.Wallet.fromPhrase(seedPhrase);
      
      // Set network
      const selectedNetwork = useTestnet ? BSC_TESTNET : BSC_NETWORK;
      setNetwork(selectedNetwork);
      
      // Create wallet data with BSC network info
      const walletData: WalletData = {
        address: ethersWallet.address, // Valid BSC address
        seedPhrase,
        privateKey: ethersWallet.privateKey,
        network: useTestnet ? 'testnet' : 'mainnet',
      };
      
      // Get initial balance
      try {
        const provider = new ethers.JsonRpcProvider(selectedNetwork.rpcUrl);
        const balance = await provider.getBalance(ethersWallet.address);
        walletData.balance = ethers.formatEther(balance);
      } catch (balanceError) {
        console.warn('Could not fetch initial balance:', balanceError);
        walletData.balance = '0';
      }
      
      setWallet(walletData);
      localStorage.setItem('cryptoflow_wallet', JSON.stringify(walletData));
      localStorage.setItem('cryptoflow_network', JSON.stringify(useTestnet));
    } catch (error) {
      console.error('Error importing BSC wallet:', error);
      throw new Error('Failed to import BSC wallet');
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (!wallet) {
      throw new Error('No BSC wallet connected');
    }
    
    try {
      const ethersWallet = new ethers.Wallet(wallet.privateKey);
      const signature = await ethersWallet.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Error signing message with BSC wallet:', error);
      throw new Error('Failed to sign message with BSC wallet');
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

  const switchNetwork = async (useTestnet: boolean) => {
    const selectedNetwork = useTestnet ? BSC_TESTNET : BSC_NETWORK;
    const networkType: 'mainnet' | 'testnet' = useTestnet ? 'testnet' : 'mainnet';
    
    setNetwork(selectedNetwork);
    localStorage.setItem('cryptoflow_network', JSON.stringify(useTestnet));
    
    if (wallet) {
      const updatedWallet: WalletData = { 
        ...wallet, 
        network: networkType
      };
      setWallet(updatedWallet);
      localStorage.setItem('cryptoflow_wallet', JSON.stringify(updatedWallet));
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    setProvider(null);
    localStorage.removeItem('cryptoflow_wallet');
    localStorage.removeItem('cryptoflow_network');
  };

  const value = {
    wallet,
    isConnected: !!wallet,
    network,
    provider,
    createWallet,
    importWallet,
    signMessage,
    getBalance,
    switchNetwork,
    disconnectWallet,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};