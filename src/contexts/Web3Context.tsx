import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface WalletData {
  address: string;
  seedPhrase?: string;
  privateKey: string;
}

interface Web3ContextType {
  wallet: WalletData | null;
  isConnected: boolean;
  createWallet: (seedPhrase: string) => Promise<void>;
  importWallet: (seedPhrase: string) => Promise<void>;
  signMessage: (message: string) => Promise<string>;
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

  useEffect(() => {
    // Check for stored wallet on initialization
    const storedWallet = localStorage.getItem('cryptoflow_wallet');
    if (storedWallet) {
      try {
        setWallet(JSON.parse(storedWallet));
      } catch (error) {
        console.error('Error loading stored wallet:', error);
        localStorage.removeItem('cryptoflow_wallet');
      }
    }
  }, []);

  const createWallet = async (seedPhrase: string) => {
    try {
      const ethersWallet = ethers.Wallet.fromPhrase(seedPhrase);
      const walletData: WalletData = {
        address: ethersWallet.address,
        seedPhrase,
        privateKey: ethersWallet.privateKey,
      };
      
      setWallet(walletData);
      localStorage.setItem('cryptoflow_wallet', JSON.stringify(walletData));
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw new Error('Failed to create wallet');
    }
  };

  const importWallet = async (seedPhrase: string) => {
    try {
      const ethersWallet = ethers.Wallet.fromPhrase(seedPhrase);
      const walletData: WalletData = {
        address: ethersWallet.address,
        seedPhrase,
        privateKey: ethersWallet.privateKey,
      };
      
      setWallet(walletData);
      localStorage.setItem('cryptoflow_wallet', JSON.stringify(walletData));
    } catch (error) {
      console.error('Error importing wallet:', error);
      throw new Error('Failed to import wallet');
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (!wallet) {
      throw new Error('No wallet connected');
    }
    
    try {
      const ethersWallet = new ethers.Wallet(wallet.privateKey);
      const signature = await ethersWallet.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Error signing message:', error);
      throw new Error('Failed to sign message');
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    localStorage.removeItem('cryptoflow_wallet');
  };

  const value = {
    wallet,
    isConnected: !!wallet,
    createWallet,
    importWallet,
    signMessage,
    disconnectWallet,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
};