import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { OTPInput } from '@/components/auth/OTPInput';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Mail, RefreshCw, Clock } from 'lucide-react';
import { PasswordResetProgress } from '@/components/auth/PasswordResetProgress';

export default function VerifyResetCodeScreen() {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [email, setEmail] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(15 * 60); // 15 minutes in seconds
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Get email from location state
    const emailFromState = location.state?.email;
    if (!emailFromState) {
      toast({
        title: 'Error',
        description: 'Email not provided. Please start over.',
        variant: 'destructive',
      });
      navigate('/auth/forgot-password');
      return;
    }
    setEmail(emailFromState);
    document.title = 'Verify Reset Code - IPG Exchange';
  }, [location, navigate, toast]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Time remaining for code validity
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeRemaining]);

  // Auto-paste OTP from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const pastedText = e.clipboardData?.getData('text');
      if (pastedText && /^\d{6}$/.test(pastedText)) {
        setCode(pastedText);
        toast({
          title: 'Code Pasted',
          description: 'Verification code auto-filled from clipboard',
        });
      }
    };
    
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter the 6-digit verification code',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-reset-code', {
        body: { email, code },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Code Verified',
          description: 'Please enter your new password',
        });
        
        // Navigate to reset password screen with verified email and code
        navigate('/auth/reset-password', {
          state: { email, code, verified: true },
        });
      } else {
        throw new Error(data?.error || 'Failed to verify code');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid or expired code',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    try {
      const { error } = await supabase.functions.invoke('send-password-reset-email', {
        body: { email },
      });

      if (error) throw error;

      toast({
        title: 'Code Resent',
        description: 'A new verification code has been sent to your email',
      });
      setCode('');
      setResendCountdown(60); // Start 60 second countdown
      setTimeRemaining(15 * 60); // Reset validity timer
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to resend code. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleVerifyCode();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="p-8 space-y-6 border-border/50 backdrop-blur-xl bg-card/95">
          {/* Progress Indicator */}
          <PasswordResetProgress currentStep={2} />

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Check Your Email
            </h1>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit verification code to
            </p>
            <p className="text-sm font-medium text-foreground">{email}</p>
            
            {/* Time Remaining */}
            {timeRemaining > 0 ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-2">
                <Clock className="w-4 h-4" />
                <span>Code expires in {formatTime(timeRemaining)}</span>
              </div>
            ) : (
              <p className="text-sm text-destructive mt-2">Code expired. Please request a new one.</p>
            )}
          </div>

          {/* OTP Input */}
          <div className="space-y-4">
            <OTPInput
              value={code}
              onChange={setCode}
              length={6}
              autoFocus
            />
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleVerifyCode}
            disabled={code.length !== 6 || isVerifying}
            className="w-full h-12 text-base font-semibold"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </Button>

          {/* Resend Code */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            <Button
              variant="ghost"
              onClick={handleResendCode}
              disabled={resendCountdown > 0}
              className="text-primary hover:text-primary/80"
            >
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Code'}
            </Button>
          </div>

          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/auth/forgot-password')}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Forgot Password
          </Button>
        </Card>
      </motion.div>
    </div>
  );
}
