import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { HeaderLogoFlipper } from "@/components/brand/HeaderLogoFlipper";
import Confetti from "react-confetti";
import { useWindowSize } from "@/hooks/useWindowSize";

/**
 * AuthVerified - Email confirmed! Now setup PIN
 */
export default function AuthVerified() {
  const navigate = useNavigate();
  const { width, height } = useWindowSize();

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate("/onboarding/security", { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background/95 to-success/5">
      <Confetti
        width={width}
        height={height}
        recycle={false}
        numberOfPieces={300}
        gravity={0.3}
      />
      
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="flex justify-center">
          <HeaderLogoFlipper size="lg" />
        </div>

        <Card className="bg-card/80 backdrop-blur-xl border-success/50 shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <CheckCircle2 className="h-20 w-20 text-success" />
                <div className="absolute inset-0 animate-ping opacity-30">
                  <CheckCircle2 className="h-20 w-20 text-success" />
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl text-success">Email Verified!</CardTitle>
            <CardDescription className="text-lg">
              Welcome to IPG I-SMART Crypto Exchange 🎉
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
              <p className="text-success font-medium mb-2">
                Your account is almost ready!
              </p>
              <p className="text-success/90 text-sm">
                Next step: Set up your 6-digit PIN and biometric security
              </p>
            </div>

            <Button
              onClick={() => navigate("/onboarding/security", { replace: true })}
              className="w-full group bg-success hover:bg-success/90"
              size="lg"
            >
              Continue to Security Setup
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Redirecting automatically in 3 seconds...
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
