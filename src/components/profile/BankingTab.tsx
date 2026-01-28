import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

export const BankingTab = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            <span>Crypto Deposits & Withdrawals</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>This exchange operates on crypto-only basis. Use the wallet section for all deposits and withdrawals.</p>
                <div className="flex gap-2">
                  <Link to="/app/wallet/deposit" className="text-primary hover:underline">
                    Make a Deposit →
                  </Link>
                  <Link to="/app/wallet/withdraw" className="text-primary hover:underline">
                    Make a Withdrawal →
                  </Link>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium">Supported Networks:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Binance Smart Chain (BEP20)</li>
              <li>• Ethereum (ERC20)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Supported Assets:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• BSK (Banala)</li>
              <li>• USDT (Tether)</li>
              <li>• USDI (BSK-Dollar)</li>
              <li>• BTC, ETH, BNB</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
