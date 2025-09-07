import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Shield, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthLock } from "@/hooks/useAuthLock";

const RecoveryVerifyScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setPin, saveLockState } = useAuthLock();
  
  const [mnemonic, setMnemonic] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [step, setStep] = useState<"verify" | "newpin">("verify");
  const [loading, setLoading] = useState(false);

  const validateMnemonic = (phrase: string): boolean => {
    const words = phrase.trim().toLowerCase().split(/\s+/);
    return words.length === 12 || words.length === 24;
  };

  const handleVerifyMnemonic = async () => {
    if (!validateMnemonic(mnemonic)) {
      toast({
        title: "Invalid Recovery Phrase",
        description: "Please enter a valid 12 or 24-word recovery phrase",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // In a real app, you would verify the mnemonic against the wallet
      // For now, we'll simulate verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Recovery Phrase Verified",
        description: "Now set a new PIN",
      });
      
      setStep("newpin");
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Invalid recovery phrase",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPin = async () => {
    if (newPin.length !== 6) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be 6 digits",
        variant: "destructive",
      });
      return;
    }

    if (newPin !== confirmPin) {
      toast({
        title: "PIN Mismatch",
        description: "PINs do not match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const success = await setPin(newPin);
      if (success) {
        // Reset failed attempts and unlock the app
        await saveLockState({
          failedAttempts: 0,
          lockedUntil: null,
          isUnlocked: true,
          lastUnlockAt: Date.now()
        });

        toast({
          title: "PIN Reset Successful",
          description: "Your new PIN has been set",
        });

        setTimeout(() => {
          navigate("/app/home");
        }, 1500);
      }
    } catch (error) {
      toast({
        title: "Failed to Set PIN",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (value: string, setter: (val: string) => void) => {
    if (value.length <= 6 && /^\d*$/.test(value)) {
      setter(value);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => step === "newpin" ? setStep("verify") : navigate(-1)}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">
          {step === "verify" ? "Verify Recovery Phrase" : "Set New PIN"}
        </h1>
      </div>

      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <Shield className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">
            {step === "verify" ? "Reset Your PIN" : "Create New PIN"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {step === "verify" 
              ? "Enter your 12 or 24-word recovery phrase to reset your PIN"
              : "Choose a new 6-digit PIN to secure your wallet"
            }
          </p>
        </div>

        {step === "verify" ? (
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base">Recovery Phrase</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mnemonic">12 or 24-word phrase</Label>
                <Textarea
                  id="mnemonic"
                  value={mnemonic}
                  onChange={(e) => setMnemonic(e.target.value)}
                  placeholder="Enter your recovery phrase..."
                  className="min-h-32 text-sm"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                <p className="text-xs text-muted-foreground">
                  Separate each word with a space. Words are case-insensitive.
                </p>
              </div>
              
              <Button 
                onClick={handleVerifyMnemonic}
                disabled={!mnemonic.trim() || loading}
                className="w-full"
              >
                {loading ? "Verifying..." : "Verify Recovery Phrase"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-card shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-base">Set New PIN</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newpin">New 6-Digit PIN</Label>
                <div className="relative">
                  <Input
                    id="newpin"
                    type={showPin ? "text" : "password"}
                    value={newPin}
                    onChange={(e) => handlePinChange(e.target.value, setNewPin)}
                    placeholder="••••••"
                    className="pr-10 text-center text-lg tracking-widest"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setShowPin(!showPin)}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNewPin">Confirm New PIN</Label>
                <Input
                  id="confirmNewPin"
                  type={showPin ? "text" : "password"}
                  value={confirmPin}
                  onChange={(e) => handlePinChange(e.target.value, setConfirmPin)}
                  placeholder="••••••"
                  className="text-center text-lg tracking-widest"
                />
              </div>

              <Button 
                onClick={handleSetNewPin}
                disabled={!newPin || !confirmPin || loading}
                className="w-full"
              >
                {loading ? "Setting PIN..." : "Set New PIN"}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Your recovery phrase is the only way to reset your PIN. 
            Keep it safe and never share it with anyone.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecoveryVerifyScreen;