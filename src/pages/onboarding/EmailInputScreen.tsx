import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Mail, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateVerificationCode, storeVerificationCode } from '@/utils/security';
import { useToast } from '@/hooks/use-toast';
import { extractUsernameFromEmail } from '@/lib/user/username';

interface EmailInputScreenProps {
  onEmailSubmitted: (email: string) => void;
  onBack: () => void;
  walletAddress?: string; // Show imported wallet address
}

const EmailInputScreen: React.FC<EmailInputScreenProps> = ({
  onEmailSubmitted,
  onBack,
  walletAddress
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendVerification = async () => {
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

      onEmailSubmitted(email.trim().toLowerCase());
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
      handleSendVerification();
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden" style={{ height: '100dvh' }}>
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"
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
          className="absolute bottom-20 right-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"
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
            <h1 className="text-white font-semibold">Email Verification</h1>
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
                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center"
              >
                <Mail className="w-10 h-10 text-white" />
              </motion.div>
              
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-2xl font-bold text-white mb-3"
              >
                {walletAddress ? 'Link Email to Wallet' : 'Verify Your Email'}
              </motion.h2>
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-white/80 text-base"
              >
                {walletAddress 
                  ? 'Enter your email to link it with your imported wallet'
                  : "We'll send you a verification code to secure your account"}
              </motion.p>
            </div>

            {/* Wallet Address Display (for imported wallets) */}
            {walletAddress && (
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <Card className="bg-green-900/60 backdrop-blur-md border-green-500/40">
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-green-400 text-sm font-medium">Imported Wallet</span>
                    </div>
                    <div className="font-mono text-white text-sm break-all bg-black/20 p-3 rounded-lg">
                      {walletAddress}
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Email input card */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card className="bg-black/40 backdrop-blur-md border-white/30">
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-white/90 text-sm font-medium block mb-2">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter your email address"
                      className="bg-black/30 border-white/30 text-white placeholder:text-white/50 focus:border-blue-400"
                      disabled={isLoading}
                    />
                  </div>

                  <Button
                    onClick={handleSendVerification}
                    disabled={isLoading || !email.trim()}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 font-semibold py-3 rounded-xl"
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
                        <Send className="w-5 h-5 mr-2" />
                        Send Verification Code
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Benefits */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card className="bg-gradient-to-r from-green-900/70 to-emerald-900/70 backdrop-blur-md border-green-500/50">
                <div className="p-4">
                  <h4 className="text-green-100 font-semibold text-sm mb-3 flex items-center">
                    <span className="mr-2">✨</span>
                    Why verify your email?
                  </h4>
                  <ul className="text-green-50 text-xs space-y-2">
                    <li className="flex items-center">
                      <span className="w-4 h-4 bg-green-500/30 rounded-full flex items-center justify-center mr-2 text-[10px]">✓</span>
                      Secure account recovery
                    </li>
                    <li className="flex items-center">
                      <span className="w-4 h-4 bg-green-500/30 rounded-full flex items-center justify-center mr-2 text-[10px]">✓</span>
                      Important security notifications
                    </li>
                    <li className="flex items-center">
                      <span className="w-4 h-4 bg-green-500/30 rounded-full flex items-center justify-center mr-2 text-[10px]">✓</span>
                      Exclusive offers and updates
                    </li>
                    <li className="flex items-center">
                      <span className="w-4 h-4 bg-green-500/30 rounded-full flex items-center justify-center mr-2 text-[10px]">✓</span>
                      Trading alerts and notifications
                    </li>
                  </ul>
                </div>
              </Card>
            </motion.div>

            {/* Security note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="text-center"
            >
              <p className="text-white/50 text-xs">
                🔒 We'll never share your email address with third parties
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default EmailInputScreen;