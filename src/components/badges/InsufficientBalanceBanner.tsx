import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface InsufficientBalanceBannerProps {
  currentBalance: number;
  minimumRequired: number;
  onBuyBSK: () => void;
}

export function InsufficientBalanceBanner({ 
  currentBalance, 
  minimumRequired, 
  onBuyBSK 
}: InsufficientBalanceBannerProps) {
  const shortfall = minimumRequired - currentBalance;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Alert className="border-2 border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10">
        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        <AlertDescription className="ml-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                💰 You need BSK to purchase badges
              </p>
              <p className="text-sm text-muted-foreground">
                Current balance: <span className="font-mono font-semibold">{currentBalance.toLocaleString()} BSK</span>
                {" • "}
                Need at least: <span className="font-mono font-semibold text-yellow-600 dark:text-yellow-400">{minimumRequired.toLocaleString()} BSK</span>
                {" • "}
                Shortfall: <span className="font-mono font-semibold text-destructive">{shortfall.toLocaleString()} BSK</span>
              </p>
            </div>
            <Button
              onClick={onBuyBSK}
              className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 hover:from-yellow-600 hover:via-orange-600 hover:to-red-600 text-white font-semibold shadow-lg"
            >
              <Zap className="h-4 w-4 mr-2" />
              Buy BSK Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </motion.div>
  );
}
