import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useWeb3 } from "@/contexts/Web3Context";

const EmailVerifiedScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { wallet } = useWeb3();
  const [isProcessing, setIsProcessing] = useState(true);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  useEffect(() => {
    const processEmailVerification = async () => {
      try {
        // Get the current user session
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error('No authenticated user found');
        }

        if (!user.email_confirmed_at) {
          throw new Error('Email not verified');
        }

        // Create or update user profile
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || '',
            wallet_address: user.user_metadata?.wallet_address || wallet?.address,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't throw here, as the user is still verified
        }

        setVerificationSuccess(true);
        toast({
          title: "Email Verified!",
          description: "Your account has been successfully verified",
        });

      } catch (error: any) {
        console.error('Verification process error:', error);
        toast({
          title: "Verification Error",
          description: error.message || "Something went wrong during verification",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    processEmailVerification();
  }, [wallet, toast]);

  const handleContinue = () => {
    navigate("/app/wallet");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full justify-center space-y-6">
        <div className="text-center space-y-6">
          {isProcessing ? (
            <>
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Processing Verification...
                </h2>
                <p className="text-sm text-muted-foreground">
                  Please wait while we complete your account setup
                </p>
              </div>
            </>
          ) : verificationSuccess ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Email Verified Successfully!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your account is now active and ready to use
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Verification Failed
                </h2>
                <p className="text-sm text-muted-foreground">
                  There was an issue verifying your email. Please try again.
                </p>
              </div>
            </>
          )}
        </div>

        {verificationSuccess && (
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base text-center">Welcome to CryptoFlow!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Your wallet is now connected and verified. You can start using all CryptoFlow features.
              </p>
              
              <Button 
                variant="default" 
                size="lg" 
                onClick={handleContinue}
                className="w-full"
              >
                Continue to Wallet
              </Button>
            </CardContent>
          </Card>
        )}

        {!isProcessing && !verificationSuccess && (
          <div className="space-y-3">
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate("/email-verification")}
              className="w-full"
            >
              Try Again
            </Button>
            
            <Button 
              variant="ghost" 
              size="lg" 
              onClick={() => navigate("/wallet-selection")}
              className="w-full"
            >
              Start Over
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerifiedScreen;