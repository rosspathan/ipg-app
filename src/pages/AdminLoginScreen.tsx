import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, Shield, CheckCircle, AlertCircle } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const AdminLoginScreen = () => {
  const navigate = useNavigate();
  const { wallet, isConnected, createWallet, signMessage } = useWeb3();
  const { setIsAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState<'connect' | 'sign' | 'verified'>('connect');

  // If already an admin, redirect to admin panel
  useEffect(() => {
    const isAdminStored = localStorage.getItem('cryptoflow_web3_admin');
    if (isAdminStored === 'true') {
      setIsAdmin(true);
      navigate('/admin');
    }
  }, [setIsAdmin, navigate]);

  const handleConnectWallet = async () => {
    setLoading(true);
    setError("");
    
    try {
      if (!isConnected) {
        // Generate a new seed phrase for the wallet
        const { generateMnemonic } = await import('bip39');
        const seedPhrase = generateMnemonic();
        await createWallet(seedPhrase);
      }
      setStep('sign');
    } catch (error) {
      setError("Failed to connect wallet. Please try again.");
      console.error("Wallet connection error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignMessage = async () => {
    if (!wallet?.address) {
      setError("Wallet not connected");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1: Get nonce from server
      const nonceResponse = await supabase.functions.invoke('web3-admin-auth', {
        body: { action: 'getNonce' }
      });

      if (nonceResponse.error) {
        throw new Error(nonceResponse.error.message);
      }

      const { nonce, timestamp } = nonceResponse.data;

      // Step 2: Create message to sign
      const message = `CryptoFlow Admin Login\nNonce: ${nonce}\nWallet: ${wallet.address}\nTimestamp: ${timestamp}`;

      // Step 3: Sign the message
      const signature = await signMessage(message);

      // Step 4: Verify with server
      const verifyResponse = await supabase.functions.invoke('web3-admin-auth', {
        body: {
          action: 'verifySignature',
          walletAddress: wallet.address,
          signature,
          nonce
        }
      });

      if (verifyResponse.error) {
        throw new Error(verifyResponse.error.message);
      }

      const { success: isValid, isAdmin } = verifyResponse.data;

      if (isValid && isAdmin) {
        // Store admin status in localStorage and auth context
        localStorage.setItem('cryptoflow_web3_admin', 'true');
        localStorage.setItem('cryptoflow_admin_wallet', wallet.address);
        setIsAdmin(true);
        setSuccess("Admin authentication successful!");
        setStep('verified');
        
        // Redirect to admin panel after a short delay
        setTimeout(() => {
          navigate('/admin');
        }, 2000);
      } else {
        setError("Authentication failed. Your wallet is not authorized for admin access.");
      }

    } catch (error: any) {
      setError(error.message || "Authentication failed. Please try again.");
      console.error("Admin auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Login</CardTitle>
          <CardDescription>
            Connect your authorized wallet to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Connect Wallet */}
          {step === 'connect' && (
            <div className="space-y-4">
              <div className="text-center">
                <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Connect your BSC wallet to begin admin authentication
                </p>
              </div>
              
              <Button 
                onClick={handleConnectWallet}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? "Connecting..." : "Connect Wallet"}
              </Button>
            </div>
          )}

          {/* Step 2: Sign Message */}
          {step === 'sign' && wallet && (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-sm font-medium">Wallet Connected</p>
                <p className="text-xs text-muted-foreground break-all">
                  {wallet.address}
                </p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Sign the authentication message to verify your admin privileges:
                </p>
              </div>

              <Button 
                onClick={handleSignMessage}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? "Signing..." : "Sign Message"}
              </Button>
            </div>
          )}

          {/* Step 3: Verified */}
          {step === 'verified' && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
              <div>
                <h3 className="text-lg font-semibold text-green-700">Authenticated!</h3>
                <p className="text-sm text-muted-foreground">
                  Redirecting to admin panel...
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLoginScreen;