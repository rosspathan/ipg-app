import { ManualBSKPurchaseForm } from "@/components/user/ManualBSKPurchaseForm";
import { ArrowLeft, TrendingUp, Shield, Zap, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ManualBSKPurchaseScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-4 p-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Purchase BSK</h1>
            <p className="text-sm text-muted-foreground">Buy BSK tokens with special bonuses</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Benefits Section */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">+50% Bonus</h3>
              <p className="text-sm text-muted-foreground">
                Get 50% extra BSK as holding bonus with every purchase
              </p>
            </CardContent>
          </Card>

          <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold text-lg">Secure & Verified</h3>
              <p className="text-sm text-muted-foreground">
                All transactions are verified by our team for your security
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
            <CardContent className="p-6 space-y-3">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-semibold text-lg">Multiple Uses</h3>
              <p className="text-sm text-muted-foreground">
                Use BSK for badge upgrades, programs, and exclusive features
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Form */}
        <ManualBSKPurchaseForm />

        {/* FAQ Section */}
        <Card className="border-border/50">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-bold mb-4">💡 How BSK Purchase Works</h2>
            
            <div className="space-y-4 text-sm">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <p className="font-semibold mb-1">Send Payment to BEP20 Address</p>
                  <p className="text-muted-foreground">
                    Transfer your payment to our secure BEP20 wallet address on BNB Smart Chain
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <div>
                  <p className="font-semibold mb-1">Submit Transaction Proof</p>
                  <p className="text-muted-foreground">
                    Upload screenshot and BSCScan link to verify your transaction
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <div>
                  <p className="font-semibold mb-1">Admin Verification</p>
                  <p className="text-muted-foreground">
                    Our team verifies your transaction (typically within 2-24 hours)
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center font-bold text-xs">
                  ✓
                </div>
                <div>
                  <p className="font-semibold mb-1 text-green-600 dark:text-green-400">BSK Credited with Bonus!</p>
                  <p className="text-muted-foreground">
                    Receive your BSK + 50% holding bonus directly in your account
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 mt-4">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">🎁 Bonus Structure:</strong> For every 1,000 BSK you purchase, you'll receive:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 ml-4 list-disc">
                <li><strong className="text-foreground">1,000 Withdrawable BSK</strong> - Use for purchases & withdrawals</li>
                <li><strong className="text-green-600 dark:text-green-400">+500 Holding Bonus BSK</strong> - Earn passive rewards</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
