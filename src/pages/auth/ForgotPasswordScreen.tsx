import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email('Invalid email address')
});

const ForgotPasswordScreen: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    // Validate email
    const validation = emailSchema.safeParse({ email });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: "Validation Error",
        description: firstError.message,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset-email', {
        body: { email: email.trim() },
      });

      if (error) throw error;

      if (data?.success) {
        setEmailSent(true);
        toast({
          title: "Code Sent!",
          description: "Check your email for the verification code.",
        });
      } else {
        throw new Error(data?.error || 'Failed to send reset code');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reset code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !emailSent) {
      handleResetPassword();
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-background flex flex-col">
        <div className="flex-1 flex flex-col px-6 py-8">
          {/* Header */}
          <div className="flex items-center mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/auth/login')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-white ml-4">Password Reset</h1>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex-1 flex flex-col justify-center items-center space-y-6 max-w-md mx-auto w-full"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-4"
            >
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </motion.div>

            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Check Your Email</h2>
              <p className="text-white/70 text-lg">
                We've sent a 6-digit verification code to:
              </p>
              <p className="text-white font-semibold text-xl">{email}</p>
              <p className="text-white/60 text-sm mt-4">
                Enter the code to reset your password. 
                The code will expire in 15 minutes.
              </p>
            </div>

            <div className="w-full space-y-4 mt-8">
              <Button
                onClick={() => navigate('/auth/verify-reset-code', { state: { email } })}
                className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-6 rounded-2xl text-lg"
                size="lg"
              >
                Enter Verification Code
              </Button>

              <Button
                onClick={() => setEmailSent(false)}
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10 font-semibold py-6 rounded-2xl text-lg"
                size="lg"
              >
                Try Different Email
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-background flex flex-col">
      <div className="flex-1 flex flex-col px-6 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/auth/login')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white ml-4">Forgot Password</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 flex flex-col justify-center space-y-6 max-w-md mx-auto w-full"
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center"
            >
              <Mail className="w-10 h-10 text-white" />
            </motion.div>
          </div>

          {/* Instructions */}
          <div className="text-center space-y-2 mb-4">
            <h2 className="text-3xl font-bold text-white">Reset Your Password</h2>
            <p className="text-white/70">
              Enter your email address and we'll send you a verification code to reset your password.
            </p>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={handleKeyPress}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
              autoFocus
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleResetPassword}
            disabled={loading || !email}
            className="w-full bg-white text-primary hover:bg-white/90 font-semibold py-6 rounded-2xl text-lg"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sending Code...
              </>
            ) : (
              'Send Verification Code'
            )}
          </Button>

          {/* Back to Sign In */}
          <div className="text-center">
            <p className="text-white/70 text-sm">
              Remember your password?{' '}
              <button
                onClick={() => navigate('/auth/login')}
                className="text-white font-semibold underline hover:no-underline"
              >
                Sign In
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;
