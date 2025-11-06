import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Mail, RefreshCw, CheckCircle, Link as LinkIcon, Gift, AlertCircle } from 'lucide-react';
import { OTPInput } from '@/components/auth/OTPInput';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { extractUsernameFromEmail } from '@/lib/user/username';
import { storeEvmAddress } from '@/lib/wallet/evmAddress';
import { useNavigate } from 'react-router-dom';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { storePendingReferral, getPendingReferral } from '@/utils/referralCapture';

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
  onBack: () => void; // onResendCode removed - handled internally
}

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({
  email,
  walletAddress,
  onVerified,
  onBack
}) => {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [codeError, setCodeError] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [referralValidated, setReferralValidated] = useState(false);
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
      
      // Check BOTH storage locations for referral code
      const signupRef = localStorage.getItem('ismart_signup_ref') || '';
      const pendingRef = getPendingReferral();
      const storedReferralCode = (pendingRef?.code || signupRef || '').toUpperCase().trim();

      console.info('[VERIFY] Referral header source:', {
        fromSignup: signupRef,
        fromPending: pendingRef?.code,
        chosen: storedReferralCode
      });
      
      // Complete onboarding via edge function (creates user + links wallet)
      const { data, error } = await supabase.functions.invoke('complete-onboarding', {
        body: {
          email,
          walletAddress: tempWalletAddress || walletAddress,
          verificationCode: code,
          storedCode,
          importedWallet // Pass imported wallet to edge function
        },
        headers: {
          'X-Referral-Code': storedReferralCode
        }
      });
      
      if (error) throw error;
      if (!data?.success) {
        // Handle specific error cases with user-friendly messages
        if (data?.reason === 'invalid_code') {
          toast({ 
            title: 'Invalid Code', 
            description: 'The verification code is incorrect. Please check and try again.',
            variant: 'destructive' 
          });
          return;
        }
        
        if (data?.reason === 'wallet_mismatch') {
          toast({ 
            title: 'Wallet Already Linked', 
            description: 'This email is already linked to a different wallet. Please use your original wallet to sign in.',
            variant: 'destructive',
            duration: 6000
          });
          return;
        }
        
        // Generic error handling
        const errorMessage = data?.error || 'Registration failed. Please try again.';
        toast({ 
          title: 'Verification Failed', 
          description: errorMessage,
          variant: 'destructive' 
        });
        return;
      }
      
      console.info('[VERIFY] ✓ Email verified, wallet linked to user:', data.userId);
      
      // Establish Supabase session if tokens were returned
      if (data.session?.access_token && data.session?.refresh_token) {
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
          });
          
          if (sessionError) {
            console.warn('[VERIFY] Could not establish session:', sessionError);
            toast({
              title: 'Session Warning',
              description: 'You may need to sign in again for BSK features',
              variant: 'default'
            });
          } else {
            console.log('[VERIFY] ✓ Supabase session established - BSK features ready');
          }
        } catch (sessionErr) {
          console.warn('[VERIFY] Session establishment error:', sessionErr);
        }
      }
      
      // Update profiles table with wallet address for BSK balance lookup
      if (data.walletAddress) {
        try {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              email: email,
              wallet_address: data.walletAddress.toLowerCase()
            })
            .eq('user_id', data.userId);
          
          if (updateError) {
            console.warn('[VERIFY] Could not update profile:', updateError);
          } else {
            console.log('[VERIFY] ✓ Profile updated with wallet address');
          }
        } catch (profileError) {
          console.warn('[VERIFY] Could not update profile with wallet:', profileError);
        }
      }
      
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
      
      // Web3-first: Store email verification flag locally (for BSK features)
      // NO Supabase session needed - wallet is the authentication
      localStorage.setItem('email_verified', 'true');
      localStorage.setItem('verified_email', email);
      
      // Store referral code if validated
      if (referralValidated && referralCode) {
        localStorage.setItem('ismart_signup_ref', referralCode.trim().toUpperCase());
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
        variant: "default",
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
          variant: "default",
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
      // Don't show generic "Edge Function" errors - show user-friendly message
      const errorMessage = error.message?.includes('Edge Function') 
        ? 'Unable to complete verification. Please check your code and try again.'
        : (error.message || 'Verification failed. Please try again.');
      
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const [isResending, setIsResending] = useState(false);

  // [STEP 1 & 5] Internal resend handler - no parent onResendCode call
  const handleResendCode = async (force: boolean = false) => {
    if ((!canResend && !force) || isResending) return;
    
    console.info('[VERIFY] Resending OTP...');
    setIsResending(true);
    setResendCountdown(60);
    setCanResend(false);
    
    try {
      // Generate fresh code and store in sessionStorage only
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      sessionStorage.setItem('verificationCode', code);
      sessionStorage.setItem('verificationEmail', email);
      
      // Sync with localStorage for persistence
      try {
        const raw = localStorage.getItem('ipg_onboarding_state');
        const parsed = raw ? JSON.parse(raw) : {};
        localStorage.setItem('ipg_onboarding_state', JSON.stringify({ ...parsed, email }));
      } catch (e) {
        console.warn('[VERIFY] Failed to sync localStorage:', e);
      }
      
      window.dispatchEvent(new Event('verification:email-updated'));
      
      const { error } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email,
          verificationCode: code,
          userName: extractUsernameFromEmail(email),
          isOnboarding: true
        }
      });

      if (error) throw error;
      
      console.info('[VERIFY] OTP resent successfully');
      toast({
        title: "Code Resent",
        description: "A new 6-digit code has been sent to your email",
        variant: "default",
      });
    } catch (error: any) {
      console.error('[VERIFY] Resend failed:', error);
      toast({
        title: "Failed to Resend",
        description: error.message,
        variant: "destructive"
      });
      setCanResend(true);
    } finally {
      setIsResending(false);
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
    setCode(value);
    setCodeError(false);
    
    // Auto-verify when 6 digits are entered
    if (value.length === 6) {
      setTimeout(() => handleVerifyCode(), 300);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6 && !isVerifying) {
      handleVerifyCode();
    }
  };

  const handleValidateReferral = async () => {
    if (!referralCode.trim()) {
      setReferralValidated(false);
      return;
    }

    setIsValidatingReferral(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, username, display_name')
        .eq('referral_code', referralCode.trim().toUpperCase())
        .maybeSingle();

      if (error) {
        console.error('Error validating referral:', error);
        toast({
          title: "Invalid Code",
          description: "This referral code doesn't exist",
          variant: "destructive"
        });
        setReferralValidated(false);
        return;
      }

      if (!data) {
        toast({
          title: "Invalid Code",
          description: "This referral code doesn't exist",
          variant: "destructive"
        });
        setReferralValidated(false);
        return;
      }

      // Validate sponsor exists
      const { data: sponsorProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', data.user_id)
        .maybeSingle();

      if (!sponsorProfile) {
        toast({
          title: "Invalid Code",
          description: "Sponsor not found",
          variant: "destructive"
        });
        setReferralValidated(false);
        return;
      }

      // Store pending referral
      storePendingReferral(referralCode.trim().toUpperCase(), data.user_id);
      setReferralValidated(true);
      
      toast({
        title: "✓ Referral Code Applied",
        description: "You'll be linked to your sponsor after verification",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Error validating referral:', error);
      toast({
        title: "Validation Failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
      setReferralValidated(false);
    } finally {
      setIsValidatingReferral(false);
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 relative overflow-hidden" style={{ height: '100dvh' }}>
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
            <h1 className="text-white font-semibold">Verify Email</h1>
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
              <Card className="bg-black/40 backdrop-blur-md border-white/30">
                <div className="p-6 space-y-6">
                  <div className="text-center">
                    <label className="text-white/90 text-sm font-medium block mb-4">
                      Enter Verification Code
                    </label>
                    
                    <OTPInput
                      value={code}
                      onChange={handleCodeChange}
                      disabled={isVerifying}
                      error={codeError}
                      length={6}
                      autoFocus
                    />
                    
                    {/* Verify Button */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="mt-6"
                    >
                      <Button
                        onClick={handleVerifyCode}
                        disabled={code.length !== 6 || isVerifying}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed h-12"
                      >
                        {isVerifying ? (
                          <div className="flex items-center justify-center gap-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            />
                            Verifying...
                          </div>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5 mr-2" />
                            Verify Email
                          </>
                        )}
                      </Button>
                    </motion.div>
                    
                    {code.length === 6 && !isVerifying && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-3 text-center text-green-400 text-sm"
                      >
                        Ready to verify
                      </motion.p>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* [STEP 4] Referral Code Input (Optional) */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.65 }}
            >
              <Card className="bg-purple-500/10 backdrop-blur-sm border-purple-500/30">
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-300 text-sm font-medium">Have a Referral Code? (Optional)</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      disabled={referralValidated || isValidatingReferral}
                      className="flex-1 bg-black/30 border-purple-400/30 text-white placeholder:text-white/50 uppercase font-mono disabled:opacity-60"
                      maxLength={12}
                    />
                    <Button
                      onClick={handleValidateReferral}
                      disabled={!referralCode.trim() || referralValidated || isValidatingReferral}
                      className="bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50"
                    >
                      {isValidatingReferral ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : referralValidated ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        'Apply'
                      )}
                    </Button>
                  </div>
                  
                  {referralValidated && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 text-green-400 text-xs"
                    >
                      <CheckCircle className="w-3 h-3" />
                      <span>Referral applied! You'll be linked after verification</span>
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>

            {/* Resend code with improved UI */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.75 }}
            >
              <Card className="bg-black/40 backdrop-blur-md border-white/30">
                <div className="p-4 space-y-3">
                  <div className="text-center">
                    {canResend ? (
                      <div className="space-y-2">
                        <Button
                          data-testid="email-otp-resend"
                          variant="ghost"
                          onClick={() => handleResendCode()}
                          disabled={isResending}
                          className="w-full border-white/30 text-white hover:bg-black/50 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
                          {isResending ? 'Sending...' : 'Resend Verification Code'}
                        </Button>
                        <p className="text-white/70 text-xs font-medium">Didn't receive it? Send a new code</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <div className="relative w-10 h-10">
                            <svg className="transform -rotate-90 w-10 h-10">
                              <circle
                                cx="20"
                                cy="20"
                                r="16"
                                stroke="currentColor"
                                strokeWidth="3"
                                fill="none"
                                className="text-white/10"
                              />
                              <circle
                                cx="20"
                                cy="20"
                                r="16"
                                stroke="currentColor"
                                strokeWidth="3"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 16}`}
                                strokeDashoffset={`${2 * Math.PI * 16 * (1 - resendCountdown / 60)}`}
                                className="text-green-400 transition-all duration-1000"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold">
                              {resendCountdown}
                            </div>
                          </div>
                        </div>
                        <p className="text-white/80 text-sm font-medium">
                          Code expires in {Math.floor(resendCountdown / 60)}:{String(resendCountdown % 60).padStart(2, '0')}
                        </p>
                        <p className="text-white/60 text-xs">
                          New code available in {resendCountdown}s
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Help section */}
                  <div className="pt-3 border-t border-white/10">
                    <details className="group">
                      <summary className="flex items-center justify-center gap-2 text-white/80 text-sm cursor-pointer hover:text-white transition-colors font-medium">
                        <AlertCircle className="w-4 h-4" />
                        <span>Didn't receive the code?</span>
                      </summary>
                      <div className="mt-3 space-y-2 text-sm text-white/90 font-medium">
                        <p>• Check your spam/junk folder</p>
                        <p>• Make sure {maskedEmail} is correct</p>
                        <p>• Wait {resendCountdown}s to request a new code</p>
                      </div>
                    </details>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Help text */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="text-center text-white/40 text-xs"
            >
              Email verification code • Expires in 10 minutes
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationScreen;