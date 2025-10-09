import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { importWallet, validateMnemonic, WalletInfo } from '@/utils/wallet';
import { useToast } from '@/hooks/use-toast';

interface ImportWalletScreenProps {
  onWalletImported: (wallet: WalletInfo) => void;
  onBack: () => void;
}

const ImportWalletScreen: React.FC<ImportWalletScreenProps> = ({
  onWalletImported,
  onBack
}) => {
  const [mnemonic, setMnemonic] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    error?: string;
  } | null>(null);
  const { toast } = useToast();

  const handleMnemonicChange = (value: string) => {
    setMnemonic(value);
    
    // Validate in real-time if there's enough text
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      const validation = validateMnemonic(trimmed);
      setValidationState(validation);
    } else {
      setValidationState(null);
    }
  };

  const handleImport = async () => {
    if (!mnemonic.trim()) {
      toast({
        title: "Error",
        description: "Please enter your recovery phrase",
        variant: "destructive"
      });
      return;
    }

    const validation = validateMnemonic(mnemonic.trim());
    if (!validation.isValid) {
      toast({
        title: "Invalid Recovery Phrase",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    try {
      const result = await importWallet(mnemonic.trim());
      if (result.success && result.wallet) {
        // Store EVM address to sessionStorage for later persistence
        if (result.wallet?.address) {
          const { storeEvmAddressTemp } = await import('@/lib/wallet/evmAddress');
          storeEvmAddressTemp(result.wallet.address);
        }
        
        toast({
          title: "Success!",
          description: "Wallet imported successfully",
        });
        onWalletImported(result.wallet);
      } else {
        toast({
          title: "Import Failed",
          description: result.error || "Failed to import wallet",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const suggestMnemonic = (suggestion: string) => {
    setMnemonic(suggestion);
    handleMnemonicChange(suggestion);
  };

  // Sample valid mnemonics for testing
  const sampleMnemonics = [
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    "legal winner thank year wave sausage worth useful legal winner thank yellow"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 right-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
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
            <h1 className="text-white font-semibold">Import Wallet</h1>
          </div>

          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pb-8 space-y-6">
          {/* Introduction */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">📥</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Import Your Wallet
            </h2>
            <p className="text-white/80 text-base max-w-sm mx-auto">
              Enter your 12, 18, or 24-word recovery phrase to restore your existing wallet
            </p>
          </motion.div>

          {/* Recovery Phrase Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Recovery Phrase</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMnemonic(!showMnemonic)}
                    className="text-white/60 hover:bg-white/10"
                  >
                    {showMnemonic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>

                <Textarea
                  value={mnemonic}
                  onChange={(e) => handleMnemonicChange(e.target.value)}
                  placeholder="Enter your recovery phrase (12, 18, or 24 words)..."
                  className={`min-h-[120px] bg-black/30 border-white/30 text-white placeholder:text-white/50 resize-none ${
                    showMnemonic ? '' : 'blur-sm'
                  }`}
                />

                {/* Real-time validation */}
                {validationState && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-3 flex items-center space-x-2 text-sm ${
                      validationState.isValid ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {validationState.isValid ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="w-4 h-4 flex items-center justify-center text-xs">❌</span>
                    )}
                    <span>
                      {validationState.isValid 
                        ? `Valid ${mnemonic.trim().split(/\s+/).length}-word recovery phrase` 
                        : validationState.error
                      }
                    </span>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Security Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm border-yellow-500/30">
              <div className="p-4">
                <h4 className="text-yellow-200 font-semibold text-sm mb-2 flex items-center">
                  <span className="mr-2">🛡️</span>
                  Security Tips
                </h4>
                <ul className="text-yellow-200/80 text-xs space-y-1">
                  <li>• Make sure you're in a private, secure location</li>
                  <li>• Double-check each word for spelling errors</li>
                  <li>• Words should be separated by single spaces</li>
                  <li>• We never store or have access to your recovery phrase</li>
                </ul>
              </div>
            </Card>
          </motion.div>

          {/* Quick Test Options (for development) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-2"
          >
            <p className="text-white/60 text-sm text-center">Quick test with sample phrases:</p>
            <div className="grid grid-cols-1 gap-2">
              {sampleMnemonics.map((sample, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => suggestMnemonic(sample)}
                  className="border-white/20 text-white/70 hover:bg-white/10 text-xs p-2 h-auto"
                >
                  Sample {index + 1}: {sample.split(' ').slice(0, 3).join(' ')}...
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Import Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Button
              onClick={handleImport}
              disabled={!validationState?.isValid || isImporting}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 font-semibold py-4 rounded-2xl"
              size="lg"
            >
              {isImporting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                  />
                  Importing Wallet...
                </>
              ) : (
                'Import Wallet'
              )}
            </Button>
          </motion.div>

          {/* Help Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center"
          >
            <p className="text-white/50 text-xs">
              Don't have a recovery phrase?{' '}
              <button
                onClick={onBack}
                className="text-purple-400 hover:text-purple-300 underline"
              >
                Create a new wallet instead
              </button>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ImportWalletScreen;