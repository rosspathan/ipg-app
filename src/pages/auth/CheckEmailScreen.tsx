import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, ArrowLeft, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';

const CheckEmailScreen: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState<string>('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    // Get email from sessionStorage
    const storedEmail = sessionStorage.getItem('lastSignupEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // No email stored, redirect back to signup
      toast({
        title: "Session Expired",
        description: "Please sign up again to receive a verification email.",
        variant: "destructive"
      });
      navigate('/auth/signup');
    }
  }, [navigate, toast]);

  const handleResendEmail = async () => {
    if (!email) return;

    setResending(true);
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) throw error;

      setResendSuccess(true);
      toast({
        title: "Email Sent",
        description: "We've sent another verification email to your inbox.",
      });
    } catch (error: any) {
      console.error('Resend error:', error);
      toast({
        title: "Resend Failed",
        description: error.message || "Could not resend email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setResending(false);
    }
  };

  const handleOpenEmailApp = () => {
    window.location.href = `mailto:${email}`;
  };

  const handleBackToSignup = () => {
    sessionStorage.removeItem('lastSignupEmail');
    navigate('/auth/signup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-background flex flex-col">
      <div className="flex-1 flex flex-col px-6 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToSignup}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white ml-4">Check Your Email</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 flex flex-col justify-center items-center space-y-8 max-w-md mx-auto w-full"
        >
          {/* Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full" />
            <div className="relative bg-white/10 backdrop-blur-sm p-6 rounded-full border border-white/20">
              <Mail className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Message */}
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold text-white">Verify Your Email</h2>
            <p className="text-white/80 text-lg">
              We've sent a confirmation link to:
            </p>
            <p className="text-white font-semibold text-lg bg-white/10 px-4 py-2 rounded-lg">
              {email}
            </p>
            <p className="text-white/70 text-sm mt-4">
              Click the link in the email to activate your account
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            <Button
              onClick={handleResendEmail}
              disabled={resending || resendSuccess}
              className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-6 rounded-2xl text-lg"
              size="lg"
            >
              {resending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : resendSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Email Sent!
                </>
              ) : (
                'Resend Verification Email'
              )}
            </Button>

            <Button
              onClick={handleOpenEmailApp}
              variant="outline"
              className="w-full border-white/30 text-white hover:bg-white/10 font-semibold py-6 rounded-2xl text-lg"
              size="lg"
            >
              <ExternalLink className="w-5 h-5 mr-2" />
              Open Email App
            </Button>

            <Button
              onClick={() => navigate('/auth/login')}
              variant="ghost"
              className="w-full text-white hover:bg-white/10 font-semibold py-6 rounded-2xl text-lg"
              size="lg"
            >
              I've Confirmed - Sign In
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center space-y-2 pt-4">
            <p className="text-white/60 text-sm">
              Didn't receive the email? Check your spam folder
            </p>
            <button
              onClick={handleBackToSignup}
              className="text-white/80 hover:text-white text-sm underline"
            >
              Use a different email address
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CheckEmailScreen;
