import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Shield, Fingerprint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import cryptoLogo from "@/assets/crypto-logo.jpg";

const AppLockScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pin, setPin] = useState("");
  const [storedPin, setStoredPin] = useState("");
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  useEffect(() => {
    const savedPin = localStorage.getItem("cryptoflow_pin");
    const savedBiometric = localStorage.getItem("cryptoflow_biometric") === "true";
    
    if (!savedPin) {
      // No PIN set, redirect to setup
      navigate("/security-setup");
      return;
    }
    
    setStoredPin(savedPin);
    setBiometricEnabled(savedBiometric);
  }, [navigate]);

  const handlePinSubmit = () => {
    if (pin === storedPin) {
      toast({
        title: "Welcome back!",
        description: "Access granted",
      });
      navigate("/app/wallet");
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin("");
      
      if (newAttempts >= maxAttempts) {
        toast({
          title: "Too many attempts",
          description: "Please try again later",
          variant: "destructive",
        });
        // In a real app, implement lockout logic
      } else {
        toast({
          title: "Incorrect PIN",
          description: `${maxAttempts - newAttempts} attempts remaining`,
          variant: "destructive",
        });
      }
    }
  };

  const handleBiometricAuth = () => {
    // Simulate biometric authentication
    toast({
      title: "Biometric authentication",
      description: "Feature not available in demo",
    });
    
    // In real implementation, use biometric APIs
    setTimeout(() => {
      navigate("/app/wallet");
    }, 1000);
  };

  const handlePinChange = (value: string) => {
    if (value.length <= 6 && /^\d*$/.test(value)) {
      setPin(value);
      
      // Auto-submit when 6 digits entered
      if (value.length === 6) {
        setTimeout(() => {
          if (value === storedPin) {
            toast({
              title: "Welcome back!",
              description: "Access granted",
            });
            navigate("/app/wallet");
          } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            setPin("");
            
            if (newAttempts >= maxAttempts) {
              toast({
                title: "Too many attempts",
                description: "Please try again later",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Incorrect PIN",
                description: `${maxAttempts - newAttempts} attempts remaining`,
                variant: "destructive",
              });
            }
          }
        }, 100);
      }
    }
  };

  if (attempts >= maxAttempts) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center space-y-4 max-w-sm">
          <Shield className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold text-foreground">
            Account Locked
          </h1>
          <p className="text-sm text-muted-foreground">
            Too many incorrect attempts. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center space-y-8 max-w-sm w-full">
        <div className="flex flex-col items-center space-y-4">
          <img 
            src={cryptoLogo} 
            alt="IPG i-SMART Logo" 
            className="w-16 h-16 rounded-xl shadow-card"
          />
          <h1 className="text-2xl font-bold text-foreground">
            IPG i-SMART
          </h1>
          <p className="text-muted-foreground text-center text-sm">
            Enter your PIN to continue
          </p>
        </div>

        <Card className="w-full bg-gradient-card shadow-card border-0">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold mb-2">Enter PIN</h2>
                <div className="flex justify-center space-x-2 mb-4">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full border-2 ${
                        i < pin.length 
                          ? "bg-primary border-primary" 
                          : "border-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <Input
                type="password"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                className="text-center text-2xl tracking-widest opacity-0 absolute -left-full"
                autoFocus
                maxLength={6}
              />

              {/* Number pad could be implemented here for better mobile UX */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((num, i) => (
                  <Button
                    key={i}
                    variant={num === "" ? "ghost" : "outline"}
                    className="h-12 text-lg"
                    disabled={num === ""}
                    onClick={() => {
                      if (num === "⌫") {
                        setPin(pin.slice(0, -1));
                      } else if (typeof num === "number" && pin.length < 6) {
                        setPin(pin + num.toString());
                      }
                    }}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>

            {biometricEnabled && (
              <div className="pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleBiometricAuth}
                  className="w-full"
                >
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Use Biometric
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {attempts > 0 && (
          <div className="text-center">
            <p className="text-sm text-destructive">
              {attempts}/{maxAttempts} incorrect attempts
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppLockScreen;