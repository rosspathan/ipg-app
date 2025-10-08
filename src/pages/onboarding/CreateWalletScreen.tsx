import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, Copy, Download, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { createWallet, WalletInfo } from '@/utils/wallet';
import { useToast } from '@/hooks/use-toast';

interface CreateWalletScreenProps {
  onWalletCreated: (wallet: WalletInfo) => void;
  onBack: () => void;
}

const CreateWalletScreen: React.FC<CreateWalletScreenProps> = ({
  onWalletCreated,
  onBack
}) => {
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [hasConfirmedBackup, setHasConfirmedBackup] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Generate initial wallet
    generateWallet();
  }, [wordCount]);

  const generateWallet = async () => {
    setIsGenerating(true);
    try {
      const result = await createWallet(wordCount);
      if (result.success && result.wallet) {
        setWallet(result.wallet);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create wallet",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate wallet",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const downloadBackup = () => {
    if (!wallet) return;

    const backupData = {
      address: wallet.address,
      mnemonic: wallet.mnemonic,
      createdAt: new Date().toISOString(),
      network: 'BEP20/ERC20'
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ipg-wallet-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Backup Downloaded",
      description: "Keep this file safe and secure",
    });
  };

  const handleContinue = async () => {
    if (!wallet) return;
    
    if (!hasConfirmedBackup) {
      toast({
        title: "Backup Required",
        description: "Please confirm you've backed up your recovery phrase",
        variant: "destructive"
      });
      return;
    }

    // Persist EVM address to Supabase if user is authenticated
    if (wallet?.address) {
      try {
        const { persistEvmAddress } = await import('@/lib/wallet/evmAddress');
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user?.id) {
          await persistEvmAddress(user.id, wallet.address);
          console.info('USR_WALLET_LINK_V3', { user: user.id, address: wallet.address.slice(0, 8) + '...' });
        }
      } catch (err) {
        console.warn('[CREATE] Failed to persist EVM address:', err);
      }
    }

    onWalletCreated(wallet);
  };

  if (!wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"
          />
          <p className="text-white">Generating secure wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 right-10 w-72 h-72 bg-green-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="text-center">
            <h1 className="text-white font-semibold">Create Wallet</h1>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={generateWallet}
            disabled={isGenerating}
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pb-8 space-y-6">
          {/* Word Count Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <div className="p-4">
                <h3 className="text-white font-semibold mb-3">Recovery Phrase Length</h3>
                <div className="flex space-x-2">
                  <Button
                    variant={wordCount === 12 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWordCount(12)}
                    className={wordCount === 12 
                      ? "bg-blue-500 hover:bg-blue-600" 
                      : "border-white/30 text-white hover:bg-white/20"
                    }
                  >
                    12 Words
                  </Button>
                  <Button
                    variant={wordCount === 24 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWordCount(24)}
                    className={wordCount === 24 
                      ? "bg-blue-500 hover:bg-blue-600" 
                      : "border-white/30 text-white hover:bg-white/20"
                    }
                  >
                    24 Words (More Secure)
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Wallet Address & QR */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <div className="p-6 text-center">
                <h3 className="text-white font-semibold mb-4">Your Wallet Address</h3>
                
                {/* QR Code */}
                <div className="mb-4">
                  <img 
                    src={wallet.qrCode} 
                    alt="Wallet QR Code"
                    className="w-32 h-32 mx-auto rounded-lg bg-white p-2"
                  />
                </div>

                {/* Address */}
                <div className="bg-black/30 rounded-lg p-3 mb-4">
                  <p className="text-white/90 text-sm font-mono break-all">
                    {wallet.address}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(wallet.address, 'Address')}
                  className="border-white/30 text-white hover:bg-white/20"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Address
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Recovery Phrase */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-sm border-orange-500/30">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">🔐 Recovery Phrase</h3>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(wallet.mnemonic, 'Recovery phrase')}
                      className="border-orange-400/50 text-orange-300 hover:bg-orange-500/20"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadBackup}
                      className="border-orange-400/50 text-orange-300 hover:bg-orange-500/20"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {wallet.mnemonic.split(' ').map((word, index) => (
                    <div
                      key={index}
                      className="bg-black/30 rounded-lg p-2 text-center"
                    >
                      <span className="text-orange-400 text-xs">{index + 1}</span>
                      <p className="text-white font-mono text-sm">{word}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-orange-500/20 rounded-lg p-3 mb-4">
                  <p className="text-orange-200 text-xs">
                    ⚠️ <strong>Critical:</strong> Write down these words in order and store them safely. 
                    This is the ONLY way to recover your wallet if you lose access.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Private Key (Advanced) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white/80 text-sm font-medium">Private Key (Advanced)</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="text-white/60 hover:bg-white/10"
                  >
                    {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                
                {showPrivateKey && (
                  <div className="bg-black/30 rounded-lg p-3">
                    <p className="text-white/90 text-xs font-mono break-all">
                      {wallet.privateKey}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Backup Confirmation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <div className="p-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasConfirmedBackup}
                    onChange={(e) => setHasConfirmedBackup(e.target.checked)}
                    className="mt-1 rounded border-white/30 bg-transparent text-blue-500 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-white text-sm font-medium">
                      I have safely backed up my recovery phrase
                    </p>
                    <p className="text-white/70 text-xs mt-1">
                      I understand that I need these words to recover my wallet and IPG iSmart cannot help me recover them if lost.
                    </p>
                  </div>
                </label>
              </div>
            </Card>
          </motion.div>

          {/* Continue Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Button
              onClick={handleContinue}
              disabled={!hasConfirmedBackup}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 font-semibold py-4 rounded-2xl"
              size="lg"
            >
              Continue to Email Verification
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CreateWalletScreen;