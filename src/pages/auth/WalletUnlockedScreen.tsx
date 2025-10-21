import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthUser } from '@/hooks/useAuthUser';
import { getStoredEvmAddress } from '@/lib/wallet/evmAddress';
import QRCode from 'qrcode';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/useWindowSize';

export default function WalletUnlockedScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const { width, height } = useWindowSize();
  
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    loadWalletAddress();
    
    // Stop confetti after 3 seconds
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    // Auto-advance after 4 seconds
    const advanceTimer = setTimeout(() => {
      handleContinue();
    }, 4000);

    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(advanceTimer);
    };
  }, []);

  const loadWalletAddress = async () => {
    try {
      if (!user?.id) {
        navigate('/app/home', { replace: true });
        return;
      }

      const address = await getStoredEvmAddress(user.id);
      if (address) {
        setWalletAddress(address);
        
        // Generate QR code
        const qr = await QRCode.toDataURL(address, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCode(qr);
      }
    } catch (error) {
      console.error('Error loading wallet address:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      toast({
        title: "Copied!",
        description: "Wallet address copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy address",
        variant: "destructive",
      });
    }
  };

  const handleContinue = () => {
    const returnPath = localStorage.getItem('ipg_return_path') || '/app/home';
    localStorage.removeItem('ipg_return_path');
    navigate(returnPath, { replace: true });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 dark:from-slate-900 dark:via-blue-900 dark:to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div 
      className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 dark:from-slate-900 dark:via-blue-900 dark:to-slate-900 relative overflow-hidden cursor-pointer"
      style={{ height: '100dvh' }}
      onClick={handleContinue}
    >
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}

      {/* Background glow */}
      <motion.div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 py-8">
        {/* Success icon with pulsing rings */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.1
          }}
          className="relative mb-8"
        >
          {/* Pulsing rings */}
          <motion.div
            className="absolute inset-0 rounded-full bg-green-500/20"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
          
          <div className="relative w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-xl">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        {/* Welcome back text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome Back!
          </h1>
          <p className="text-muted-foreground">
            Your wallet is ready
          </p>
        </motion.div>

        {/* Wallet address card */}
        {walletAddress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="w-full max-w-md"
          >
            <Card className="bg-card/90 dark:bg-white/10 backdrop-blur-sm border">
              <div className="p-6 text-center space-y-4">
                <h3 className="font-semibold text-foreground">Your Wallet Address</h3>
                
                {/* QR Code */}
                {qrCode && (
                  <div className="flex justify-center">
                    <img 
                      src={qrCode} 
                      alt="Wallet QR Code"
                      className="w-32 h-32 rounded-lg bg-white p-2"
                    />
                  </div>
                )}

                {/* Address */}
                <div className="bg-muted/50 dark:bg-black/30 rounded-lg p-3">
                  <p className="text-foreground dark:text-white/90 text-sm font-mono break-all">
                    {walletAddress}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy();
                  }}
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Address
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Continue hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="text-muted-foreground text-sm mt-8"
        >
          Tap anywhere to continue
        </motion.p>
      </div>
    </div>
  );
}
