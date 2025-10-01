import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, Shield, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useAuthAdmin } from "@/hooks/useAuthAdmin";
import { supabase } from "@/integrations/supabase/client";

const AdminLoginScreen = () => {
  const navigate = useNavigate();
  const { wallet, isConnected, connectMetaMask, signMessage, disconnectWallet } = useWeb3();
  const { setIsAdmin, isAdmin, user } = useAuthAdmin();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [step, setStep] = useState<'connect' | 'sign' | 'verified'>('connect');
  const [walletAuthorized, setWalletAuthorized] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [grantLoading, setGrantLoading] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Email/Password login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(true);

  // If already an admin, redirect to admin panel
  useEffect(() => {
    console.log('AdminLoginScreen: Checking stored admin state...');
    const isAdminStored = localStorage.getItem('cryptoflow_web3_admin');
    console.log('AdminLoginScreen: Stored admin state:', isAdminStored);
    if (isAdminStored === 'true') {
      console.log('AdminLoginScreen: Found stored admin, redirecting to /admin');
      setIsAdmin(true);
      navigate('/admin');
    } else {
      console.log('AdminLoginScreen: No stored admin state, showing login form');
    }
  }, [setIsAdmin, navigate]);

  // If already signed in and has admin role via email, redirect
  useEffect(() => {
    if (isAdmin && user) {
      console.log('AdminLoginScreen: Admin role detected (email), redirecting to /admin');
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, user, navigate]);

  const handleConnectWallet = async () => {
    setLoading(true);
    setError("");
    setWalletAuthorized(null);
    
    try {
      await connectMetaMask();
      setStep('sign');
    } catch (error: any) {
      setError(error.message || "Failed to connect wallet. Please install MetaMask and try again.");
      console.error("Wallet connection error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchWallet = async () => {
    disconnectWallet();
    setStep('connect');
    setError("");
    setSuccess("");
    setWalletAuthorized(null);
  };

  const handleSignMessage = async () => {
    if (!wallet?.address) {
      setError("Wallet not connected");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log('Starting admin authentication for wallet:', wallet.address);
      
      // Step 1: Get fresh nonce from server
      const nonceResponse = await supabase.functions.invoke('web3-admin-auth', {
        body: { action: 'getNonce' }
      });

      if (nonceResponse.error) {
        console.error('Nonce generation error:', nonceResponse.error);
        throw new Error(nonceResponse.error.message);
      }

      const { nonce, timestamp } = nonceResponse.data;
      console.log('Received nonce:', nonce);

      // Step 2: Create message to sign
      const message = `IPG i-SMART Admin Login\nNonce: ${nonce}\nWallet: ${wallet.address}\nTimestamp: ${timestamp}`;

      // Step 3: Sign the message
      const signature = await signMessage(message);

      // Step 4: Verify with server
      console.log('Sending verification request with:', {
        action: 'verifySignature',
        walletAddress: wallet.address,
        nonce,
        signatureLength: signature?.length
      });

      const verifyResponse = await supabase.functions.invoke('web3-admin-auth', {
        body: {
          action: 'verifySignature',
          walletAddress: wallet.address,
          signature,
          nonce
        }
      });

      console.log('Verify response:', verifyResponse);

      if (verifyResponse.error) {
        console.error('Verify response error:', verifyResponse.error);
        throw new Error(verifyResponse.error.message || 'Authentication failed');
      }

      const { success: isValid, isAdmin } = verifyResponse.data;

      if (isValid && isAdmin) {
        // Store admin status in localStorage and auth context
        localStorage.setItem('cryptoflow_web3_admin', 'true');
        localStorage.setItem('cryptoflow_admin_wallet', wallet.address);
        setIsAdmin(true);
        setWalletAuthorized(true);
        setSuccess(`Welcome Admin ${wallet.address}`);
        setStep('verified');
        
        // Redirect to admin panel after showing success message
        setTimeout(() => {
          navigate('/admin');
        }, 2500);
      } else {
        setWalletAuthorized(false);
        setError("This wallet is not authorized for admin access. Please switch to your admin wallet in MetaMask and reconnect.");
      }

    } catch (error: any) {
      if (error.message.includes('not authorized') || error.message.includes('Wallet not authorized')) {
        setWalletAuthorized(false);
        setError("This wallet is not authorized for admin access. Please switch to your admin wallet in MetaMask and reconnect.");
      } else {
        setError(error.message || "Authentication failed. Please try again.");
      }
      console.error("Admin auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantByEmail = async () => {
    setError("");
    setSuccess("");
    if (!adminEmail) {
      setError("Please enter admin email.");
      return;
    }
    setGrantLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('grant-admin-by-email', {
        body: { email: adminEmail }
      });
      if (error) throw error;
      setSuccess(`Admin granted to ${adminEmail}. Now go to Login and sign in with this email, then access the Admin panel.`);
    } catch (e: any) {
      setError(e.message || 'Failed to grant admin by email');
    } finally {
      setGrantLoading(false);
    }
  };

  const handleSetPassword = async () => {
    setError("");
    setSuccess("");
    if (!adminPassword || adminPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    setPasswordLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-password-reset', {
        body: { 
          email: 'rosspathan@gmail.com',
          newPassword: adminPassword 
        }
      });
      if (error) throw error;
      setSuccess(`Password set successfully for rosspathan@gmail.com. You can now login with this password.`);
      setAdminPassword(""); // Clear the password field
    } catch (e: any) {
      setError(e.message || 'Failed to set password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setError("");
    setSuccess("");
    if (!loginEmail || !loginPassword) {
      setError("Please enter both email and password.");
      return;
    }
    
    setLoginLoading(true);
    try {
      // Sign in with email and password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      if (data.user) {
        // Check if user has admin role
        const { data: roleData, error: roleError } = await supabase
          .rpc('has_role', { 
            _user_id: data.user.id, 
            _role: 'admin' 
          });

        if (roleError) {
          console.error('Role check error:', roleError);
          throw new Error('Failed to verify admin privileges');
        }

        if (roleData) {
          // User is admin, set admin state and redirect
          localStorage.setItem('cryptoflow_admin_user', data.user.id);
          setIsAdmin(true);
          setSuccess(`Welcome Admin ${data.user.email}`);
          setTimeout(() => {
            navigate('/admin');
          }, 1500);
        } else {
          setError("Your account does not have admin privileges.");
          await supabase.auth.signOut();
        }
      }
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoginLoading(false);
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

          {/* Email/Password Login Section */}
          {showEmailLogin && (
            <div className="space-y-4">
              <div className="text-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Admin Email Login</p>
                <p className="text-xs text-muted-foreground">
                  Sign in with your admin email and password
                </p>
              </div>
              
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="rosspathan@gmail.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <Button 
                  onClick={handleEmailLogin}
                  disabled={loginLoading || !loginEmail || !loginPassword}
                  className="w-full"
                  size="lg"
                >
                  {loginLoading ? "Signing in..." : "Sign In"}
                </Button>
              </div>
              
              <div className="text-center">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowEmailLogin(false)}
                >
                  Use Web3 Wallet Instead
                </Button>
              </div>
            </div>
          )}

          {/* Web3 Wallet Login Section */}
          {!showEmailLogin && (
            <>
              <div className="text-center">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowEmailLogin(true)}
                  className="mb-4"
                >
                  Use Email Login Instead
                </Button>
              </div>

              {/* Step 1: Connect Wallet */}
              {step === 'connect' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <Wallet className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Connect your MetaMask wallet to begin admin authentication
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleConnectWallet}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? "Connecting..." : "Connect MetaMask"}
                  </Button>
                </div>
              )}

              {/* Step 2: Sign Message */}
              {step === 'sign' && wallet && (
                <div className="space-y-4">
                  <div className="text-center">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm font-medium">Wallet Connected</p>
                    <div className="bg-muted p-3 rounded-lg mt-2">
                      <p className="text-xs font-mono text-muted-foreground break-all">
                        {wallet.address}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Sign the authentication message to verify your admin privileges. This will open MetaMask for signature.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      onClick={handleSignMessage}
                      disabled={loading}
                      className="w-full"
                      size="lg"
                    >
                      {loading ? "Signing..." : "Sign Message"}
                    </Button>

                    {walletAuthorized === false && (
                      <Button 
                        onClick={handleSwitchWallet}
                        variant="outline"
                        className="w-full"
                        size="lg"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Switch Wallet
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Verified */}
              {step === 'verified' && (
                <div className="text-center space-y-4">
                  <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-700">Admin Access Granted!</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Redirecting to admin dashboard...
                    </p>
                    {wallet && (
                      <div className="bg-green-50 p-3 rounded-lg mt-3">
                        <p className="text-xs font-mono text-green-700 break-all">
                          {wallet.address}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="pt-4 border-t space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">Alternative: Grant Admin by Email</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
                <Button onClick={handleGrantByEmail} disabled={grantLoading || !adminEmail}>
                  {grantLoading ? "Granting..." : "Grant Admin"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                After granting, go to Login and sign in with this email, then open the Admin panel.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Set Password for rosspathan@gmail.com</p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Enter new password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
                <Button onClick={handleSetPassword} disabled={passwordLoading || !adminPassword}>
                  {passwordLoading ? "Setting..." : "Set Password"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Set a secure password (minimum 6 characters) to login with rosspathan@gmail.com.
              </p>
            </div>
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