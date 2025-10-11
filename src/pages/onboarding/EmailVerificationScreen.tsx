import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Mail, RefreshCw, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { storeEvmAddress } from '@/lib/wallet/evmAddress';
import { extractUsernameFromEmail } from '@/lib/user/username';
import { useNavigate } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

// Mask email for display
const maskEmail = (e: string) => {
  try {
    const [name, domain] = e.split('@');
    if (!name || !domain) return e;
    const maskedName = name.length <= 2 ? name[0] + '***' : name.slice(0, 2) + '***';
    const domainParts = domain.split('.');
    const domainMasked = domainParts[0].slice(0, 1) + '***' + (domainParts.length > 1 ? '.' + domainParts.slice(1).join('.') : '');
    return `${maskedName}@${domainMasked}`;
  } catch {
    return e;
  }
};

interface EmailVerificationScreenProps {
  email: string;
  walletAddress?: string; // EVM address from onboarding
  onVerified: (mnemonic?: string, walletAddress?: string) => void;
  onResendCode: () => void;
  onBack: () => void;
}

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({
  email,
  walletAddress,
  onVerified,
  onResendCode,
  onBack
}) => {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60); // Resend cooldown 60s
  const [showMagicLink, setShowMagicLink] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInitialSent = useRef(false);
  const maskedEmail = useMemo(() => maskEmail(email), [email]);

  // Log OTP mode
  useEffect(() => {
    console.info('OTP_EMAIL_V1_ACTIVE');
  }, []);

  // Initialize countdown timer (email already sent by EmailInputScreen)
  useEffect(() => {
    console.info('Email verification screen loaded - email already sent from input screen');
    setResendCountdown(60);
    setCanResend(false);
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCountdown]);

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      // Wait silently until 6 digits are entered
      return;
    }

    setIsVerifying(true);
    
    try {
      const storedCode = sessionStorage.getItem('verificationCode');
      const storedEmail = sessionStorage.getItem('verificationEmail');
      const tempWalletAddress = sessionStorage.getItem('ipg_temp_evm_address');
      
      if (!storedCode || storedEmail !== email) {
        throw new Error('Verification session expired');
      }
      
      if (code !== storedCode) {
        throw new Error('Invalid verification code');
      }
      
      // Check for imported wallet data
      let importedWallet: { address: string; mnemonic: string } | undefined;
      
      if (Capacitor.isNativePlatform()) {
        // Mobile: Check Capacitor Preferences
        const { value: address } = await Preferences.get({ key: 'pending_wallet_address' });
        const { value: mnemonic } = await Preferences.get({ key: 'pending_wallet_mnemonic' });
        
        if (address && mnemonic) {
          importedWallet = { address: address.trim().toLowerCase(), mnemonic: mnemonic.trim() };
          console.log('[VERIFY] Found imported wallet (mobile):', address.trim().toLowerCase());
        }
      } else {
        // Web: Check localStorage
        const pendingWallet = localStorage.getItem('pending_wallet_import');
        if (pendingWallet) {
          try {
            const parsed = JSON.parse(pendingWallet);
            if (parsed.address && parsed.mnemonic) {
              importedWallet = { 
                address: String(parsed.address).trim().toLowerCase(), 
                mnemonic: String(parsed.mnemonic).trim() 
              };
              console.log('[VERIFY] Found imported wallet (web):', String(parsed.address).trim().toLowerCase());
            }
          } catch (e) {
            console.warn('[VERIFY] Failed to parse pending wallet:', e);
          }
        }
      }
      
      // Complete onboarding via edge function (creates user + links wallet)
      const { data, error } = await supabase.functions.invoke('complete-onboarding', {
        body: {
          email,
          walletAddress: tempWalletAddress || walletAddress,
          verificationCode: code,
          storedCode,
          importedWallet // Pass imported wallet to edge function
        }
      });
      
      if (error) throw error;
      if (!data?.success) {
        if (data?.reason === 'invalid_code') {
          toast({ title: 'Invalid Code', description: 'Please check the 6-digit code and try again.', variant: 'destructive' });
          return;
        }
        if (data?.reason === 'wallet_mismatch' || data?.reason === 'wallet_exists') {
          // Email already linked to a different wallet - guide user to sign in with existing wallet
          const existingAddress = data?.existingAddress || 'another wallet';
          toast({ 
            title: 'Account Already Exists', 
            description: `This email is linked to wallet ${existingAddress.slice(0, 6)}...${existingAddress.slice(-4)}. Please use Wallet Login with your existing wallet to access your account and balances.`,
            variant: 'destructive',
            duration: 8000
          });
          // Navigate back to wallet login after 2 seconds
          setTimeout(() => {
            window.location.href = '/auth/login';
          }, 2000);
          return;
        }
        throw new Error(data?.error || 'Registration failed');
      }
      
      console.info('[VERIFY] User registered:', data.userId, data.username);
      
      // Clean up imported wallet data
      if (importedWallet) {
        if (Capacitor.isNativePlatform()) {
          await Preferences.remove({ key: 'pending_wallet_address' });
          await Preferences.remove({ key: 'pending_wallet_mnemonic' });
        } else {
          localStorage.removeItem('pending_wallet_import');
        }
        console.log('[VERIFY] Cleaned up imported wallet data');
      }
      
      // Now verify OTP to create session
      const { error: otpError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });

      if (otpError) {
        console.warn('[VERIFY] OTP verify failed, but user created:', otpError);
        // User is created, continue anyway
      }

      // Emit events for UI refresh
      window.dispatchEvent(new CustomEvent('profile:updated', { 
        detail: { username: data.username } 
      }));
      
      if (tempWalletAddress) {
        window.dispatchEvent(new CustomEvent('evm:address:updated', { 
          detail: { address: tempWalletAddress } 
        }));
      }

      // Check if mnemonic was returned (new wallet generation)
      if (data.mnemonic) {
        toast({
          title: "✓ Email Verified",
          description: importedWallet 
            ? "Wallet linked successfully!" 
            : "IMPORTANT: Save your recovery phrase!",
        });
        
        // Clean up temp storage
        sessionStorage.removeItem('ipg_temp_evm_address');
        sessionStorage.removeItem('verificationCode');
        try {
          sessionStorage.setItem('verificationEmail', email);
          const raw = localStorage.getItem('ipg_onboarding_state');
          const parsed = raw ? JSON.parse(raw) : {};
          localStorage.setItem('ipg_onboarding_state', JSON.stringify({ ...parsed, email }));
          window.dispatchEvent(new Event('verification:email-updated'));
        } catch {}
        
        // Pass mnemonic to show backup screen
        onVerified(data.mnemonic, data.walletAddress);
      } else {
        toast({
          title: "✓ Email Verified",
          description: "Your account is ready!",
        });
        
        // Clean up temp storage
        sessionStorage.removeItem('ipg_temp_evm_address');
        sessionStorage.removeItem('verificationCode');
        try {
          sessionStorage.setItem('verificationEmail', email);
          const raw = localStorage.getItem('ipg_onboarding_state');
          const parsed = raw ? JSON.parse(raw) : {};
          localStorage.setItem('ipg_onboarding_state', JSON.stringify({ ...parsed, email }));
          window.dispatchEvent(new Event('verification:email-updated'));
        } catch {}
        
        onVerified();
      }
    } catch (error: any) {
      console.error('[VERIFY] Error:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async (force: boolean = false) => {
    if (!canResend && !force) return;
    
    setResendCountdown(60);
    setCanResend(false);
    
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      sessionStorage.setItem('verificationCode', code);
      sessionStorage.setItem('verificationEmail', email);
      try {
        const raw = localStorage.getItem('ipg_onboarding_state');
        const parsed = raw ? JSON.parse(raw) : {};
        localStorage.setItem('ipg_onboarding_state', JSON.stringify({ ...parsed, email }));
      } catch {}
      window.dispatchEvent(new Event('verification:email-updated'));
      
      const { error } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email,
          verificationCode: code,
          userName: email.split('@')[0],
          isOnboarding: true
        }
      });

      if (error) throw error;

      onResendCode();
      
      toast({
        title: "Code Resent",
        description: "A new 6-digit code has been sent to your email",
      });
    } catch (error: any) {
      toast({
        title: "Failed to Resend",
        description: error.message,
        variant: "destructive"
      });
      setCanResend(true);
    }
  };

  const handleMagicLink = async () => {
    toast({
      title: "Magic Link Not Available",
      description: "Please contact support if you need assistance with verification",
      variant: "destructive"
    });
  };

  const handleCodeChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const cleanValue = value.replace(/\D/g, '').slice(0, 6);
    setCode(cleanValue);
    
    // Auto-verify when 6 digits are entered
    if (cleanValue.length === 6) {
      setTimeout(() => handleVerifyCode(), 500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6 && !isVerifying) {
      handleVerifyCode();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 relative overflow-hidden">
      {/* Dev ribbon */}
      <div data-testid="dev-ribbon" className="fixed top-1 right-1 z-50 text-[10px] px-2 py-1 rounded bg-indigo-600/80 text-white">
        OTP EMAIL v1
      </div>
      
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 right-10 w-72 h-72 bg-green-500/10 rounded-full blur-3xl"
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
        <motion.div
          className="absolute bottom-20 left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"
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
            <h1 className="text-white font-semibold">Verify Email</h1>
          </div>

          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pb-8 flex flex-col justify-center">
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
                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center"
              >
                <Mail className="w-10 h-10 text-white" />
              </motion.div>
              
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-2xl font-bold text-white mb-3"
              >
                Check Your Email
              </motion.h2>
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-white/80 text-base"
              >
                We sent a 6-digit code to
              </motion.p>
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-green-400 font-semibold"
              >
                {maskedEmail}
              </motion.p>
            </div>

            {/* Wallet Address Display (for imported wallets) */}
            {walletAddress && (
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.55 }}
              >
                <Card className="bg-green-500/10 backdrop-blur-sm border-green-500/30">
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-sm font-medium">Linking Wallet Address</span>
                    </div>
                    <div className="font-mono text-white text-xs break-all bg-black/30 p-3 rounded-lg">
                      {walletAddress}
                    </div>
                    <p className="text-white/60 text-xs">
                      This wallet will be linked to your email after verification
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Code input card */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-white/90 text-sm font-medium block mb-2">
                      Verification Code
                    </label>
                    <Input
                      ref={inputRef}
                      data-testid="email-otp-input"
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onPaste={(e) => {
                        e.preventDefault();
                        const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                        handleCodeChange(paste);
                      }}
                      placeholder="000000"
                      className="bg-black/30 border-white/30 text-white placeholder:text-white/50 focus:border-green-400 text-center text-2xl font-mono tracking-widest"
                      disabled={isVerifying}
                      maxLength={6}
                    />
                    
                    {/* Visual progress indicators */}
                    <div className="flex justify-center mt-3 space-x-2">
                      {[...Array(6)].map((_, index) => (
                        <div
                          key={index}
                          className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            index < code.length 
                              ? 'bg-green-400 scale-110' 
                              : 'bg-white/30'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <Button
                    data-testid="email-otp-submit"
                    onClick={handleVerifyCode}
                    disabled={isVerifying || code.length !== 6}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 font-semibold py-3 rounded-xl"
                  >
                    {isVerifying ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                        />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Verify Code
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Resend code */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="text-center space-y-3"
            >
              {canResend ? (
                <Button
                  data-testid="email-otp-resend"
                  variant="outline"
                  onClick={() => handleResendCode()}
                  className="border-white/30 text-white hover:bg-white/20"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Code
                </Button>
              ) : (
                <p className="text-white/60 text-sm">
                  Resend code in {Math.floor(resendCountdown / 60)}:{String(resendCountdown % 60).padStart(2, '0')}
                </p>
              )}

              {showMagicLink && (
                <Button
                  data-testid="email-otp-fallback-magic"
                  variant="outline"
                  onClick={handleMagicLink}
                  className="border-amber-400/50 text-amber-300 hover:bg-amber-400/20"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Send Magic Link Instead
                </Button>
              )}
            </motion.div>

            {/* Help text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-center space-y-2"
            >
              <p className="text-white/50 text-xs">
                Code expires in 10 minutes
              </p>
              <p className="text-white/50 text-xs">
                Check your spam folder if you don't see the email
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationScreen;