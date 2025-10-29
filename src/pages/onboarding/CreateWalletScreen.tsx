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

          {/* Recovery Phrase - PRIORITY #1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-orange-900/70 to-red-900/70 backdrop-blur-md border-orange-500/50 border-2">
              <div className="p-6">
                <h3 className="text-white text-xl font-bold mb-4">🔐 Your Recovery Phrase</h3>
                
                <div className="bg-orange-500/20 rounded-lg p-3 mb-4">
                  <p className="text-orange-100 text-sm leading-relaxed">
                    <strong>⚠️ Critical:</strong> These {wordCount} words are the ONLY way to recover your wallet. 
                    Write them down in order and store them in a safe place.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  {wallet.mnemonic.split(' ').map((word, index) => (
                    <div
                      key={index}
                      className="bg-black/30 rounded-lg p-2 text-center"
                    >
                      <span className="text-orange-400 text-xs font-semibold">{index + 1}</span>
                      <p className="text-white font-mono text-sm font-medium">{word}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => handleCopy(wallet.mnemonic, 'Recovery phrase')}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3"
                    aria-label="Copy recovery phrase"
                    data-testid="copy-recovery-phrase"
                  >
                    <Copy className="w-5 h-5 mr-2" />
                    Copy Recovery Phrase
                  </Button>
                  <Button
                    onClick={downloadBackup}
                    variant="outline"
                    className="w-full border-orange-400/50 text-orange-200 hover:bg-orange-500/20 hover:border-orange-400/70 font-semibold py-3"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Backup File
                  </Button>
                </div>

                <p className="text-orange-300 text-xs text-center mt-4">
                  Never share these words with anyone. IPG iSmart will never ask for them.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Why This Matters Info Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-blue-500/20 backdrop-blur-md border-blue-400/50">
              <div className="p-4">
                <p className="text-blue-100 text-sm leading-relaxed">
                  <strong>💡 Why backup matters:</strong> Your recovery phrase is like a master key to your wallet. 
                  If you lose your device or forget your PIN, these words are the ONLY way to access your funds again. 
                  IPG iSmart cannot recover them for you.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Wallet Address & QR - Secondary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="bg-black/40 backdrop-blur-md border-white/20">
              <div className="p-5 text-center">
                <h4 className="text-white/90 font-semibold mb-3 text-base">Your Wallet Address</h4>
                
                {/* QR Code - smaller */}
                <div className="mb-3">
                  <img 
                    src={wallet.qrCode} 
                    alt="Wallet QR Code"
                    className="w-28 h-28 mx-auto rounded-lg bg-white p-2"
                  />
                </div>

                {/* Address */}
                <div className="bg-black/30 rounded-lg p-2.5 mb-3">
                  <p className="text-white/90 text-xs font-mono break-all">
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
                  Copy Address (For Receiving)
                </Button>
                
                <p className="text-white/60 text-xs mt-3">
                  Share this address to receive funds. You'll see this again in your wallet.
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Private Key (Advanced) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
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
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card className={`backdrop-blur-md border-2 transition-all duration-300 ${
              hasConfirmedBackup 
                ? 'bg-green-500/20 border-green-500/60' 
                : 'bg-orange-500/20 border-orange-500/60 animate-pulse'
            }`}>
              <div className="p-5">
                <label className="flex items-start space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={hasConfirmedBackup}
                    onChange={(e) => setHasConfirmedBackup(e.target.checked)}
                    className="mt-1 w-6 h-6 rounded border-2 border-white/50 bg-black/30 text-blue-500 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <p className="text-white text-lg font-bold mb-2">
                      ✓ I have written down all {wordCount} words in order
                    </p>
                    <p className="text-white/90 text-sm leading-relaxed">
                      I understand these words are the ONLY way to recover my wallet. 
                      IPG iSmart cannot recover them for me if I lose them.
                    </p>
                  </div>
                </label>
              </div>
            </Card>
          </motion.div>

          {/* Continue Button with status message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-3"
          >
            {!hasConfirmedBackup && (
              <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-3 text-center">
                <p className="text-yellow-200 text-sm font-medium">
                  ⚠️ Please confirm you've backed up your recovery phrase to continue
                </p>
              </div>
            )}
            
            <Button
              onClick={handleContinue}
              disabled={!hasConfirmedBackup}
              className={`w-full font-bold py-6 rounded-2xl text-lg transition-all duration-300 ${
                hasConfirmedBackup
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-500/50'
                  : 'bg-gray-600 cursor-not-allowed opacity-60'
              }`}
              size="lg"
            >
              {hasConfirmedBackup ? '✓ Continue to Security Setup' : '⚠️ Back Up Recovery Phrase First'}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CreateWalletScreen;