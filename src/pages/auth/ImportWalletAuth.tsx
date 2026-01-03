import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import * as bip39 from 'bip39';
import { ethers } from 'ethers';
import { useAuthUser } from '@/hooks/useAuthUser';
import { hasAnySecurity } from '@/utils/localSecurityStorage';
import { storeWallet, setWalletStorageUserId } from '@/utils/walletStorage';

const ImportWalletAuth: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const [seedPhrase, setSeedPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // SECURITY: Blocked test mnemonics
  const BLOCKED_MNEMONICS = [
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    "legal winner thank year wave sausage worth useful legal winner thank yellow",
    "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong"
  ];

  const handleImport = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to import your wallet",
        variant: "destructive"
      });
      navigate('/auth/login');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const cleanPhrase = seedPhrase.trim().toLowerCase();
      const words = cleanPhrase.split(/\s+/);

      if (words.length !== 12 && words.length !== 24) {
        setError('Please enter 12 or 24 words');
        return;
      }

      const isValid = bip39.validateMnemonic(cleanPhrase);
      
      if (!isValid) {
        setError('Invalid recovery phrase. Please check your words and try again.');
        return;
      }

      // SECURITY: Block known test mnemonics
      if (BLOCKED_MNEMONICS.includes(cleanPhrase)) {
        setError('This is a publicly known test phrase and cannot be used. Please use your own unique recovery phrase.');
        return;
      }

      // Derive wallet from mnemonic
      const ethersWallet = ethers.Wallet.fromPhrase(cleanPhrase);
      const address = ethersWallet.address;
      const privateKey = ethersWallet.privateKey;

      // SECURITY: Check if this wallet is already linked to another user
      const { data: existingWallet } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('wallet_address', address)
        .neq('user_id', user.id)
        .maybeSingle();

      if (existingWallet) {
        setError('This wallet is already linked to another account. Please use your own unique recovery phrase.');
        return;
      }

      // Store in localStorage with user-scoped key
      const walletData = {
        address,
        privateKey,
        seedPhrase: cleanPhrase,
        network: 'mainnet' as const,
        balance: '0'
      };
      
      // Set user ID for scoped storage and store wallet
      setWalletStorageUserId(user.id);
      storeWallet(walletData, user.id);

      // Update Supabase profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          wallet_address: address,
          wallet_addresses: {
            'evm-mainnet': address,
            'bsc-mainnet': address
          },
          setup_complete: true
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Success!",
        description: "Wallet imported successfully",
      });

      // Security disabled - go directly to /app/home
      navigate('/app/home');
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import wallet. Please try again.');
      toast({
        title: "Import Failed",
        description: err.message || "Failed to import wallet",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhraseChange = (value: string) => {
    setSeedPhrase(value);
    if (error) setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-background flex flex-col">
      <div className="flex-1 flex flex-col px-6 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/auth/login')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white ml-4">Import Wallet</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 flex flex-col justify-center space-y-6 max-w-md mx-auto w-full"
        >
          {/* Icon & Message */}
          <div className="text-center space-y-2 mb-4">
            <div className="w-20 h-20 mx-auto mb-6 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Download className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">Wallet Required</h2>
            <p className="text-white/70 text-sm">
              To access your account, please import your wallet using your recovery phrase
            </p>
          </div>

          {/* Email (Read-only) */}
          {user && (
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email Address</Label>
              <div className="bg-white/5 border border-white/20 text-white/70 rounded-lg px-4 py-3">
                {user.email}
              </div>
            </div>
          )}

          {/* Recovery Phrase */}
          <div className="space-y-2">
            <Label htmlFor="phrase" className="text-white">Recovery Phrase</Label>
            <Textarea
              id="phrase"
              value={seedPhrase}
              onChange={(e) => handlePhraseChange(e.target.value)}
              placeholder="Enter your 12 or 24-word recovery phrase (separate words with spaces)"
              rows={6}
              className="resize-none bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
              autoFocus
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 text-red-300 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/30">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={loading || !seedPhrase.trim()}
            className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-6 rounded-2xl text-lg"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Importing Wallet...
              </>
            ) : (
              'Import Wallet'
            )}
          </Button>

          {/* Security Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <h4 className="text-yellow-200 font-semibold text-sm mb-2 flex items-center">
              <span className="mr-2">🔒</span>
              Security Tips
            </h4>
            <ul className="text-yellow-200/80 text-xs space-y-1">
              <li>• Make sure you're in a secure location</li>
              <li>• Never share your recovery phrase with anyone</li>
              <li>• Your phrase is encrypted and stored only on this device</li>
            </ul>
          </div>

          {/* Help Link */}
          <div className="text-center pt-4 border-t border-white/10">
            <p className="text-white/70 text-sm">
              Don't have a recovery phrase?{' '}
              <button
                onClick={() => navigate('/auth/signup')}
                className="text-white font-semibold underline hover:no-underline"
              >
                Create a new account
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ImportWalletAuth;
