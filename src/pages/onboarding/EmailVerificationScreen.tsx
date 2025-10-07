import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { verifyEmailCode } from '@/utils/security';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface EmailVerificationScreenProps {
  email: string;
  walletAddress?: string; // EVM address from onboarding
  onVerified: () => void;
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
  const [resendCountdown, setResendCountdown] = useState(60);
  const { toast } = useToast();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

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
    const raw = inputRef.current?.value ?? code;
    const cleaned = (raw || '').replace(/\D/g, '').trim();
    if (cleaned.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit verification code",
        variant: "destructive"
      });
      return;
    }

    setIsVerifying(true);
    try {
      // Step 1: Verify the local code
      const result = verifyEmailCode(email, cleaned);

      if (!result.valid) {
        toast({
          title: "Invalid Code",
          description: result.error || "Please check your code and try again",
          variant: "destructive"
        });
        setIsVerifying(false);
        return;
      }

      // Step 2: Create Supabase user account
      const tempPassword = `${cleaned}${email}${Date.now()}`; // Temporary secure password
      
      // Prepare wallet addresses in JSONB format
      const walletAddresses = walletAddress ? {
        evm: {
          mainnet: walletAddress,
          bsc: walletAddress // Same address for both EVM networks
        }
      } : {};
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/app/home`,
          data: {
            email_verified: true,
            onboarding_completed: true,
            wallet_address: walletAddress, // Legacy single address
            wallet_addresses: walletAddresses // New JSONB structure
          }
        }
      });

      if (signUpError) {
        console.error('Supabase signup error:', signUpError);
        const msg = (signUpError.message || '').toLowerCase();

        // If the user already exists, send a magic sign-in link instead
        if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/app/home`
            }
          });

          if (!otpError) {
            toast({
              title: 'Sign-in link sent',
              description: 'Check your email to finish signing in and complete onboarding.'
            });
          } else {
            toast({
              title: 'Sign-in failed',
              description: otpError.message || 'Could not send a sign-in link. Please try again.',
              variant: 'destructive'
            });
          }
        } else {
          toast({
            title: 'Account Creation Failed',
            description: signUpError.message || 'Failed to create your account',
            variant: 'destructive'
          });
        }

        setIsVerifying(false);
        return;
      }

      // Step 3: Auto sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: tempPassword
      });

      if (signInError) {
        console.error('Auto sign-in failed:', signInError);
        // Fallback: send magic link to complete sign-in
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/app/home`
          }
        });

        if (!otpError) {
          toast({
            title: 'Sign-in link sent',
            description: 'Check your email to finish signing in.'
          });
        } else {
          toast({
            title: 'Sign-in required',
            description: otpError.message || 'Please verify your email to sign in.',
            variant: 'destructive'
          });
        }

        setIsVerifying(false);
        return;
      }

      toast({
        title: "Account Created!",
        description: "Your account has been successfully created",
        className: "bg-success/10 border-success/50 text-success",
      });

      // Small delay for toast to show
      setTimeout(() => {
        onVerified();
        navigate('/app/home');
      }, 1000);

    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Verification Failed",
        description: "An error occurred while creating your account",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = () => {
    if (!canResend) return;
    
    setResendCountdown(60);
    setCanResend(false);
    onResendCode();
    
    toast({
      title: "Code Resent",
      description: "A new verification code has been sent to your email",
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerifyCode();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 relative overflow-hidden">
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
                {email}
              </motion.p>
            </div>

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
                      type="text"
                      value={code}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      onKeyPress={handleKeyPress}
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
              className="text-center"
            >
              {canResend ? (
                <Button
                  variant="outline"
                  onClick={handleResendCode}
                  className="border-white/30 text-white hover:bg-white/20"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Code
                </Button>
              ) : (
                <p className="text-white/60 text-sm">
                  Resend code in {resendCountdown}s
                </p>
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