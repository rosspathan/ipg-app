import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, Copy, Download, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { createWallet, WalletInfo } from '@/utils/wallet';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/utils/clipboard';
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

  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    toast({
      title: success ? "Copied!" : "Error",
      description: success ? `${label} copied to clipboard` : "Failed to copy to clipboard",
      variant: success ? "default" : "destructive",
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

    // Store EVM address to sessionStorage for later persistence
    if (wallet?.address) {
      const { storeEvmAddressTemp } = await import('@/lib/wallet/evmAddress');
      storeEvmAddressTemp(wallet.address);
    }

    onWalletCreated(wallet);
  };

  if (!wallet) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center" style={{ height: '100dvh' }}>
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
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden" style={{ height: '100dvh' }}>
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

      <div className="relative z-10 h-full flex flex-col" style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)', paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-black/50"
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
            className="text-white hover:bg-black/50"
          >
            <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pb-4 space-y-6 overflow-y-auto">
          {/* Word Count Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-black/40 backdrop-blur-md border-white/30">
              <div className="p-4">
                <h3 className="text-white font-semibold mb-3">Recovery Phrase Length</h3>
                <div className="flex space-x-2">
                  <Button
                    variant={wordCount === 12 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setWordCount(12)}
                    className={wordCount === 12 
                      ? "bg-blue-500 hover:bg-blue-600" 
                      : "border-white/30 text-white hover:bg-black/50"
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
                      : "border-white/30 text-white hover:bg-black/50"
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
            <Card className="bg-black/40 backdrop-blur-md border-white/30">
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
                  onClick={() => handleCopy(wallet.address, 'Address')}
                  className="border-white/30 text-white hover:bg-black/40 hover:border-white/40"
                  aria-label="Copy wallet address"
                  data-testid="copy-wallet-address"
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
            <Card className="bg-gradient-to-r from-orange-900/70 to-red-900/70 backdrop-blur-md border-orange-500/50">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">🔐 Recovery Phrase</h3>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(wallet.mnemonic, 'Recovery phrase')}
                      className="border-orange-400/50 text-orange-300 hover:bg-orange-500/10 hover:border-orange-400/70"
                      aria-label="Copy recovery phrase"
                      data-testid="copy-recovery-phrase"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadBackup}
                      className="border-orange-400/50 text-orange-300 hover:bg-orange-500/10 hover:border-orange-400/70"
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
            <Card className="bg-black/40 backdrop-blur-md border-white/20">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white/80 text-sm font-medium">Private Key (Advanced)</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="text-white/60 hover:bg-black/40"
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
            <Card className="bg-black/40 backdrop-blur-md border-white/30">
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
              Continue
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CreateWalletScreen;