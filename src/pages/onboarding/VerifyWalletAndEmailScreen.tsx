import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Wallet, Mail, CheckCircle, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { extractUsernameFromEmail } from '@/lib/user/username';

interface VerifyWalletAndEmailScreenProps {
  walletAddress: string;
  onVerified: (email: string) => void;
  onBack: () => void;
}

const VerifyWalletAndEmailScreen: React.FC<VerifyWalletAndEmailScreenProps> = ({
  walletAddress,
  onVerified,
  onBack
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    toast({
      title: "Copied!",
      description: "Wallet address copied to clipboard",
    });
  };

  const handleContinue = async () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive"
      });
      return;
    }

    if (!validateEmail(email.trim())) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Generate verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code in sessionStorage for verification screen
      sessionStorage.setItem('verificationCode', code);
      sessionStorage.setItem('verificationEmail', email.trim().toLowerCase());
      
      try {
        const raw = localStorage.getItem('ipg_onboarding_state');
        const parsed = raw ? JSON.parse(raw) : {};
        localStorage.setItem('ipg_onboarding_state', JSON.stringify({ ...parsed, email: email.trim() }));
      } catch {}
      
      window.dispatchEvent(new Event('verification:email-updated'));

      // Send email via our edge function
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email: email.trim(),
          verificationCode: code,
          userName: extractUsernameFromEmail(email.trim()),
          isOnboarding: true
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Verification Email Sent!",
        description: "Check your inbox for the verification code",
      });

      onVerified(email.trim().toLowerCase());
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast({
        title: "Error",
        description: "Failed to send verification email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleContinue();
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden" style={{ height: '100dvh' }}>
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
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
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="text-center">
            <h1 className="text-white font-semibold">Verify & Link</h1>
          </div>

          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pb-4 overflow-y-auto flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-md mx-auto w-full space-y-6"
          >
            {/* Icon and title */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center"
              >
                <Wallet className="w-10 h-10 text-white" />
              </motion.div>
              
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-2xl font-bold text-white mb-3"
              >
                Verify Your Wallet
              </motion.h2>
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-white/80 text-base"
              >
                Confirm this is your wallet address, then link it to your email
              </motion.p>
            </div>

            {/* Wallet Address Card */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card className="bg-black/40 backdrop-blur-md border-white/30">
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-white font-medium">Wallet Address</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyAddress}
                      className="text-white/70 hover:text-white hover:bg-white/10"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="bg-black/30 p-4 rounded-xl">
                    <p className="font-mono text-white text-sm break-all leading-relaxed">
                      {walletAddress}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-purple-200 text-xs">
                      Double-check this address matches your wallet. It will be permanently linked to your email.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Email Input Card */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card className="bg-black/40 backdrop-blur-md border-white/30">
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-white/70" />
                    <span className="text-white font-medium">Email Address</span>
                  </div>
                  
                  <div>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter your email"
                      className="bg-black/30 border-white/30 text-white placeholder:text-white/50 focus:border-purple-400"
                      disabled={isLoading}
                    />
                    <p className="text-white/60 text-xs mt-2">
                      We'll send a verification code to this email
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Continue button */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Button
                onClick={handleContinue}
                disabled={isLoading || !email.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 font-semibold py-6 rounded-xl text-lg"
              >
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                    />
                    Sending Code...
                  </>
                ) : (
                  <>
                    Continue to Verification
                    <ChevronLeft className="w-5 h-5 ml-2 rotate-180" />
                  </>
                )}
              </Button>
            </motion.div>

            {/* Info text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-center text-white/60 text-sm"
            >
              Your wallet remains secure. We never access your private keys.
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default VerifyWalletAndEmailScreen;
