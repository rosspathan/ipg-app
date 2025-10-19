import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, Wallet, ArrowLeft, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const WalletLoginScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [activeTab, setActiveTab] = useState("mnemonic");

  const handleWalletLogin = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    if (activeTab === "mnemonic" && !mnemonic.trim()) {
      toast({
        title: "Mnemonic Required",
        description: "Please enter your 12-word recovery phrase",
        variant: "destructive",
      });
      return;
    }

    if (activeTab === "private-key" && !privateKey.trim()) {
      toast({
        title: "Private Key Required",
        description: "Please enter your private key",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Call wallet-login edge function
      const { data, error } = await supabase.functions.invoke("wallet-login", {
        body: {
          email: email.trim(),
          mnemonic: activeTab === "mnemonic" ? mnemonic.trim() : undefined,
          privateKey: activeTab === "private-key" ? privateKey.trim() : undefined,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Login failed");

      // Verify the OTP token to establish proper Supabase session
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        type: 'magiclink',
        token_hash: data.accessToken
      });

      if (verifyError) {
        throw verifyError;
      }

      toast({
        title: "Login Successful! ✅",
        description: `Welcome back, ${data.email}`,
      });

      // Navigate to app
      setTimeout(() => {
        navigate("/app");
      }, 500);
    } catch (error: any) {
      console.error("Wallet login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6 backdrop-blur-sm bg-card/95 border-primary/20">
        {/* Header */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Button>

          <div className="flex justify-center mb-4">
            <Wallet className="h-16 w-16 text-primary" />
          </div>

          <h1 className="text-3xl font-bold text-center text-foreground">
            Wallet Login
          </h1>
          <p className="text-center text-muted-foreground">
            Access your account using your recovery phrase or private key
          </p>
        </div>

        {/* Email Input (Required for all methods) */}
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Enter the email associated with your wallet
          </p>
        </div>

        {/* Wallet Login Methods */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mnemonic">
              <KeyRound className="h-4 w-4 mr-2" />
              Mnemonic
            </TabsTrigger>
            <TabsTrigger value="private-key">
              <Lock className="h-4 w-4 mr-2" />
              Private Key
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mnemonic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mnemonic">12-Word Recovery Phrase</Label>
              <Textarea
                id="mnemonic"
                placeholder="Enter your 12-word recovery phrase (separated by spaces)"
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                disabled={loading}
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter the 12 words you saved during signup, separated by spaces
              </p>
            </div>

            <Alert>
              <KeyRound className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Your recovery phrase is encrypted and never leaves your device
                unencrypted. We use it to verify your wallet ownership.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="private-key" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="private-key">Private Key</Label>
              <Textarea
                id="private-key"
                placeholder="0x..."
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                disabled={loading}
                rows={3}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Enter your wallet's private key (starts with 0x)
              </p>
            </div>

            <Alert variant="destructive">
              <Lock className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Warning:</strong> Never share your private key with
                anyone. Only enter it on official IPG I-SMART EXCHANGE pages.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        {/* Login Button */}
        <Button
          onClick={handleWalletLogin}
          disabled={loading || !email}
          className="w-full"
          size="lg"
        >
          {loading ? "Verifying..." : "Login with Wallet"}
        </Button>

        {/* Help Text */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Lost your recovery phrase?{" "}
            <button
              className="text-primary hover:underline"
              onClick={() =>
                toast({
                  title: "Recovery Not Possible",
                  description:
                    "For security, we cannot recover lost recovery phrases. You'll need to create a new account.",
                  variant: "destructive",
                })
              }
            >
              Learn more
            </button>
          </p>

          <p className="text-xs text-muted-foreground">
            Don't have an account?{" "}
            <button
              className="text-primary hover:underline font-semibold"
              onClick={() => navigate("/onboarding")}
            >
              Sign up here
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default WalletLoginScreen;
