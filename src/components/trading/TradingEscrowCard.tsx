import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useEscrowBalance } from "@/hooks/useEscrowBalance";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Copy, ExternalLink, RefreshCw, Shield } from "lucide-react";
import { toast } from "sonner";

interface TradingEscrowCardProps {
  assetSymbol?: string;
}

export default function TradingEscrowCard({ assetSymbol }: TradingEscrowCardProps) {
  const { 
    balances, 
    deposits, 
    contractConfig, 
    isLoading, 
    refetch,
    withdraw,
    isWithdrawing 
  } = useEscrowBalance(assetSymbol);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(assetSymbol || "");

  const handleCopyAddress = () => {
    if (contractConfig?.contract_address) {
      navigator.clipboard.writeText(contractConfig.contract_address);
      toast.success("Escrow address copied!");
    }
  };

  const handleWithdraw = () => {
    if (!selectedAsset || !withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    withdraw({ 
      asset_symbol: selectedAsset, 
      amount: parseFloat(withdrawAmount) 
    });
    setWithdrawAmount("");
  };

  const selectedBalance = balances?.find(b => b.asset_symbol === selectedAsset);

  if (!contractConfig) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Trading Escrow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Escrow contract not configured. Please contact admin.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Trading Escrow
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => refetch()}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Escrow Contract Address */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Deposit to Escrow Contract</p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono truncate flex-1">
              {contractConfig.contract_address}
            </code>
            <Button variant="ghost" size="icon" onClick={handleCopyAddress}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              asChild
            >
              <a 
                href={`https://bscscan.com/address/${contractConfig.contract_address}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
          <Badge variant="outline" className="mt-2">
            {contractConfig.chain} • Chain ID: {contractConfig.chain_id}
          </Badge>
        </div>

        {/* Balances */}
        <div>
          <h4 className="text-sm font-medium mb-2">Your Escrow Balances</h4>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : balances && balances.length > 0 ? (
            <div className="space-y-2">
              {balances.map(balance => (
                <div 
                  key={balance.id} 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedAsset === balance.asset_symbol ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedAsset(balance.asset_symbol)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{balance.asset_symbol}</span>
                    <span className="text-sm">{balance.deposited.toFixed(6)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>Available: {balance.available.toFixed(6)}</span>
                    <span>Locked: {balance.locked.toFixed(6)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <Wallet className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No escrow balances</p>
              <p className="text-xs">Deposit tokens to the escrow contract to trade</p>
            </div>
          )}
        </div>

        {/* Withdraw Section */}
        {selectedBalance && selectedBalance.available > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Withdraw from Escrow</h4>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min={0}
                max={selectedBalance.available}
                step="0.000001"
              />
              <Button 
                onClick={handleWithdraw}
                disabled={isWithdrawing || !withdrawAmount}
              >
                <ArrowUpFromLine className="w-4 h-4 mr-1" />
                Withdraw
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Max: {selectedBalance.available.toFixed(6)} {selectedBalance.asset_symbol}
            </p>
          </div>
        )}

        {/* Recent Deposits */}
        {deposits && deposits.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-2">Recent Deposits</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {deposits.slice(0, 5).map(deposit => (
                <div key={deposit.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ArrowDownToLine className="w-3 h-3 text-success" />
                    <span>{deposit.amount.toFixed(6)} {deposit.asset_symbol}</span>
                  </div>
                  <Badge variant={deposit.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                    {deposit.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How to Deposit */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-2">How to Deposit</h4>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Approve the escrow contract to spend your tokens</li>
            <li>Call deposit(tokenAddress, amount) on the contract</li>
            <li>Wait for 12 confirmations to see your balance</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
