import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Wallet, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTradingBalances, useTradingTransfer } from "@/hooks/useTradingBalances";
import { useWalletBalances } from "@/hooks/useWalletBalances";
import AssetLogo from "@/components/AssetLogo";

export function TradingTransferPage() {
  const navigate = useNavigate();
  const [direction, setDirection] = useState<"to_trading" | "from_trading">("to_trading");
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [amount, setAmount] = useState("");

  // Fetch wallet balances (on-chain)
  const { balances: walletBalances, loading: walletLoading } = useWalletBalances();
  
  // Fetch trading balances
  const { data: tradingBalances, isLoading: tradingLoading } = useTradingBalances();

  const { mutate: transfer, isPending } = useTradingTransfer();

  // Map wallet balances to the format needed
  const walletAssets = (walletBalances || []).filter(b => b.available > 0).map(b => ({
    asset_id: b.asset_id,
    symbol: b.symbol,
    name: b.name,
    available: b.available,
    logo_url: b.logo_url,
  }));

  // Map trading balances to the format needed
  const tradingAssets = (tradingBalances || []).filter(b => b.available > 0).map(b => ({
    asset_id: b.asset_id,
    symbol: b.symbol,
    name: b.name,
    available: b.available,
    logo_url: b.logo_url,
  }));

  const sourceBalances = direction === "to_trading" ? walletAssets : tradingAssets;
  const selectedBalance = sourceBalances.find((b) => b.asset_id === selectedAsset);

  const handleTransfer = () => {
    if (!selectedAsset || !amount || Number(amount) <= 0) return;

    transfer(
      {
        asset_id: selectedAsset,
        amount: Number(amount),
        direction,
      },
      {
        onSuccess: () => {
          setAmount("");
          setSelectedAsset("");
          navigate("/app/wallet");
        },
      }
    );
  };

  const handleMax = () => {
    if (selectedBalance) {
      setAmount(selectedBalance.available.toString());
    }
  };

  const isLoading = walletLoading || tradingLoading;

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Transfer Funds</h1>
          <p className="text-sm text-muted-foreground">Move funds between wallet and trading</p>
        </div>
      </div>

      <Card className="bg-card/60 backdrop-blur-xl border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Transfer Direction</CardTitle>
          <CardDescription>
            Choose where to move your funds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={direction} onValueChange={(v) => {
            setDirection(v as "to_trading" | "from_trading");
            setSelectedAsset("");
            setAmount("");
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="to_trading" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                To Trading
              </TabsTrigger>
              <TabsTrigger value="from_trading" className="gap-2">
                <Wallet className="h-4 w-4" />
                To Wallet
              </TabsTrigger>
            </TabsList>

            <TabsContent value={direction} className="space-y-4 mt-4">
              {/* Direction indicator */}
              <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  {direction === "to_trading" ? (
                    <>
                      <Wallet className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">Wallet</span>
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">Trading</span>
                    </>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  {direction === "to_trading" ? (
                    <>
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium">Trading</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="h-5 w-5 text-green-500" />
                      <span className="text-sm font-medium">Wallet</span>
                    </>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Asset selection */}
                  <div className="space-y-2">
                    <Label>Select Asset</Label>
                    <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an asset" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceBalances.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No assets available
                          </div>
                        ) : (
                          sourceBalances.map((asset) => (
                            <SelectItem key={asset.asset_id} value={asset.asset_id}>
                              <div className="flex items-center gap-2">
                                <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} size="sm" />
                                <span>{asset.symbol}</span>
                                <span className="text-muted-foreground ml-auto">
                                  {asset.available.toFixed(4)}
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Amount</Label>
                      {selectedBalance && (
                        <span className="text-xs text-muted-foreground">
                          Available: {selectedBalance.available.toFixed(4)} {selectedBalance.symbol}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pr-16"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                        onClick={handleMax}
                        disabled={!selectedBalance}
                      >
                        MAX
                      </Button>
                    </div>
                  </div>

                  {/* Info notice */}
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-blue-400">
                      {direction === "to_trading"
                        ? "Funds transferred to trading balance will be held in the platform hot wallet for fast order execution."
                        : "Funds will be transferred back to your on-chain wallet. This may take a few minutes."}
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleTransfer}
                    disabled={!selectedAsset || !amount || Number(amount) <= 0 || isPending}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Transfer {amount && selectedBalance ? `${amount} ${selectedBalance.symbol}` : ""}
                      </>
                    )}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default TradingTransferPage;
