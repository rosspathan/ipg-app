import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHotWalletAddress } from '@/hooks/useTradingBalances';
import { transferBNB, transferERC20, transferViaMetaMask } from '@/lib/wallet/onchainTransfer';
import { getStoredWallet } from '@/utils/walletStorage';
import { getStoredEvmAddress } from '@/lib/wallet/evmAddress';
import { useToast } from '@/hooks/use-toast';

export type DepositStatus = 'idle' | 'signing' | 'pending' | 'confirmed' | 'error';

export interface DirectDepositRequest {
  symbol: string;
  amount: number;
  contractAddress: string | null;
  decimals: number;
  assetId: string;
}

export interface DirectDepositResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export function useDirectTradingDeposit() {
  const [status, setStatus] = useState<DepositStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { data: hotWalletAddress } = useHotWalletAddress();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /**
   * Execute a direct on-chain transfer to the platform hot wallet
   * 
   * @param request - The deposit request with asset details
   * @param privateKey - Optional private key (if not provided, will try stored wallet or MetaMask)
   * @returns Result with success status and tx hash
   */
  const executeDeposit = async (
    request: DirectDepositRequest,
    privateKey?: string
  ): Promise<DirectDepositResult> => {
    setStatus('idle');
    setTxHash(null);
    setError(null);

    try {
      // Validate hot wallet address
      if (!hotWalletAddress) {
        throw new Error('Platform deposit address not available');
      }

      // Get user for storage lookup
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please sign in to continue');
      }

      // Get user's wallet address for the deposit record
      const userWalletAddress = await getStoredEvmAddress(user.id);
      if (!userWalletAddress) {
        throw new Error('Could not determine your wallet address');
      }

      const amountStr = request.amount.toString();

      // Determine transfer method
      let result;

      if (privateKey) {
        // Use provided private key
        setStatus('signing');
        
        if (!request.contractAddress || request.symbol === 'BNB') {
          result = await transferBNB(privateKey, hotWalletAddress, amountStr);
        } else {
          result = await transferERC20(
            privateKey,
            request.contractAddress,
            hotWalletAddress,
            amountStr,
            request.decimals
          );
        }
      } else {
        // Try to get stored wallet
        const storedWallet = getStoredWallet(user.id);
        
        if (storedWallet?.privateKey) {
          setStatus('signing');
          
          if (!request.contractAddress || request.symbol === 'BNB') {
            result = await transferBNB(storedWallet.privateKey, hotWalletAddress, amountStr);
          } else {
            result = await transferERC20(
              storedWallet.privateKey,
              request.contractAddress,
              hotWalletAddress,
              amountStr,
              request.decimals
            );
          }
        } else {
          // Fallback to MetaMask
          setStatus('signing');
          result = await transferViaMetaMask(
            request.contractAddress,
            hotWalletAddress,
            amountStr,
            request.decimals
          );
        }
      }

      if (!result.success) {
        throw new Error(result.error || 'Transfer failed');
      }

      setStatus('pending');
      setTxHash(result.txHash || null);

      // Record the deposit for faster detection by monitor
      if (result.txHash) {
        try {
          await supabase.from('custodial_deposits').insert({
            user_id: user.id,
            tx_hash: result.txHash,
            asset_id: request.assetId,
            amount: request.amount,
            from_address: userWalletAddress,
            status: 'detected',
          });
        } catch (recordErr) {
          // Non-fatal - monitor will pick it up anyway
          console.warn('[DirectDeposit] Failed to pre-record deposit:', recordErr);
        }
      }

      setStatus('confirmed');

      // Invalidate queries to refresh balances
      queryClient.invalidateQueries({ queryKey: ['onchain-balances-all'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-assets-custodial'] });
      queryClient.invalidateQueries({ queryKey: ['trading-balances'] });

      toast({
        title: 'Transfer Sent!',
        description: `${request.amount} ${request.symbol} is on its way. Balance will update shortly.`,
      });

      return {
        success: true,
        txHash: result.txHash,
      };
    } catch (err: any) {
      const errorMessage = err.message || 'Transfer failed';
      setStatus('error');
      setError(errorMessage);

      toast({
        title: 'Transfer Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  const reset = () => {
    setStatus('idle');
    setTxHash(null);
    setError(null);
  };

  return {
    executeDeposit,
    status,
    txHash,
    error,
    reset,
    isLoading: status === 'signing' || status === 'pending',
    hotWalletAddress,
  };
}
