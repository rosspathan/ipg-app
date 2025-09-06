import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Mail, Shield, CheckCircle, Network } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/contexts/Web3Context";
import { supabase } from "@/integrations/supabase/client";

const EmailVerificationScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { wallet, signMessage, network } = useWeb3();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!wallet) {
      navigate("/wallet-selection");
      return;
    }
  }, [wallet, navigate]);

  const handleSendVerification = async () => {
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    if (!wallet) {
      toast({
        title: "Error",
        description: "No wallet connected",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Create verification message
      const verificationMessage = `IPG i-SMART BSC Wallet Verification\nNetwork: ${network.name} (Chain ID: ${network.chainId})\nWallet: ${wallet.address}\nEmail: ${email}\nTimestamp: ${Date.now()}`;
      
      // Sign the message with the wallet
      const signature = await signMessage(verificationMessage);
      
      // Send verification email via Supabase Auth
      const { error } = await supabase.auth.signUp({
        email: email,
        password: `wallet_${wallet.address}_${Date.now()}`, // Generate a secure password
        options: {
          emailRedirectTo: `${window.location.origin}/email-verified`,
          data: {
            wallet_address: wallet.address,
            signature: signature,
            verification_message: verificationMessage,
          }
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          // Try to sign in instead
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: `wallet_${wallet.address}_${Date.now()}`,
          });
          
          if (signInError) {
            throw new Error('Email already registered with different wallet');
          }
        } else {
          throw error;
        }
      }

      setVerificationSent(true);
      toast({
        title: "Verification Sent!",
        description: "Check your email for the verification link",
      });

    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send verification email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = () => {
    setVerificationSent(false);
    handleSendVerification();
  };

  const checkEmailVerification = async () => {
    setIsVerifying(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && user.email_confirmed_at) {
        toast({
          title: "Email Verified!",
          description: "Welcome to IPG i-SMART",
        });
        navigate("/app/wallet");
      } else {
        toast({
          title: "Not Verified Yet",
          description: "Please check your email and click the verification link",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check verification status",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (!wallet) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Email Verification</h1>
      </div>

      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Verify Your Email
          </h2>
          <p className="text-sm text-muted-foreground">
            Link your email address to your BSC wallet for secure access to IPG i-SMART
          </p>
        </div>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-base text-center flex items-center justify-center gap-2">
              <Network className="w-4 h-4" />
              BSC Wallet Connected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm font-medium">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {network.name}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Wallet Address:</p>
                <p className="font-mono text-sm break-all bg-muted p-2 rounded">
                  {wallet.address}
                </p>
              </div>
              {wallet.balance && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Balance:</p>
                  <p className="text-sm font-medium">
                    {parseFloat(wallet.balance).toFixed(4)} {network.currency}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {!verificationSent ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full"
              />
            </div>

            <Button 
              variant="default" 
              size="lg" 
              onClick={handleSendVerification}
              disabled={isLoading || !email.trim()}
              className="w-full"
            >
              {isLoading ? "Sending..." : "Send Verification Email"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 text-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Verification Sent!</p>
                    <p className="text-sm">Check your email: {email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button 
                variant="default" 
                size="lg" 
                onClick={checkEmailVerification}
                disabled={isVerifying}
                className="w-full"
              >
                {isVerifying ? "Checking..." : "I've Verified My Email"}
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleResendVerification}
                className="w-full"
              >
                Resend Verification Email
              </Button>
            </div>
          </div>
        )}

        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground text-center">
            🔐 Your BSC wallet signature proves ownership of this BEP20 address and secures your account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationScreen;