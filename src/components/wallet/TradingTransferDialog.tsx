import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ArrowRight, Loader2, Wallet, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import AssetLogo from "@/components/AssetLogo";

interface Asset {
  symbol: string;
  name: string;
  available: number;
  asset_id: string;
  logo_url?: string;
}

interface TradingTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  walletBalances: Asset[];
  tradingBalances: Asset[];
}

export function TradingTransferDialog({
  open,
  onOpenChange,
  walletBalances,
  tradingBalances,
}: TradingTransferDialogProps) {
  const [direction, setDirection] = useState<"to_trading" | "from_trading">("to_trading");
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Use trading balances for both directions (internal transfers)
  const sourceBalances = direction === "to_trading" ? walletBalances : tradingBalances;
  const selectedBalance = sourceBalances.find((b) => b.asset_id === selectedAsset || b.symbol === selectedAsset);

  // Reset when dialog closes or direction changes
  useEffect(() => {
    if (!open) {
      setAmount("");
      setSelectedAsset("");
      setTransferError(null);
      setTransferSuccess(false);
    }
  }, [open]);

  useEffect(() => {
    setAmount("");
    setSelectedAsset("");
    setTransferError(null);
    setTransferSuccess(false);
  }, [direction]);

  const handleTransfer = async () => {
    if (!selectedBalance || !amount || Number(amount) <= 0) return;

    setIsProcessing(true);
    setTransferError(null);

    try {
      const { data, error } = await supabase.functions.invoke('internal-balance-transfer', {
        body: {
          asset_id: selectedBalance.asset_id,
          amount: Number(amount),
          direction: direction === "to_trading" ? "to_trading" : "to_wallet",
        }
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Transfer failed');

      setTransferSuccess(true);
      toast({
        title: "Transfer Complete",
        description: data?.message || `${amount} ${selectedBalance.symbol} transferred successfully`,
      });

      // Refresh balances
      queryClient.invalidateQueries({ queryKey: ["trading-balances"] });
      queryClient.invalidateQueries({ queryKey: ["user-balance"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balances"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-assets-custodial"] });

      // Close after brief success display
      setTimeout(() => {
        setAmount("");
        setSelectedAsset("");
        setTransferSuccess(false);
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      const msg = err.message || "Transfer failed";
      setTransferError(msg);
      toast({ title: "Transfer Failed", description: msg, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMax = () => {
    if (selectedBalance) {
      setAmount(selectedBalance.available.toString());
    }
  };

  const isDisabled = !selectedAsset || !amount || Number(amount) <= 0 || isProcessing || transferSuccess;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer Funds</DialogTitle>
          <DialogDescription>
            Move funds between your wallet and trading balance — instant &amp; gas-free
          </DialogDescription>
        </DialogHeader>

        <Tabs value={direction} onValueChange={(v) => setDirection(v as "to_trading" | "from_trading")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="to_trading" className="gap-2">
              <Wallet className="h-4 w-4" />
              To Trading
            </TabsTrigger>
            <TabsTrigger value="from_trading" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              To Wallet
            </TabsTrigger>
          </TabsList>

          <TabsContent value={direction} className="space-y-4 mt-4">
            {/* Direction indicator */}
            <div className="flex items-center justify-center gap-3 p-3 rounded-lg bg-muted/50">
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

            {/* Asset selection */}
            <div className="space-y-2">
              <Label>Select Asset</Label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an asset" />
                </SelectTrigger>
                <SelectContent>
                  {sourceBalances.length === 0 ? (
                    <SelectItem value="none" disabled>
                      {direction === "to_trading" ? "No wallet balance" : "No trading balance"}
                    </SelectItem>
                  ) : (
                    sourceBalances.map((asset) => (
                      <SelectItem 
                        key={asset.asset_id || asset.symbol} 
                        value={asset.asset_id || asset.symbol}
                      >
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
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setTransferError(null);
                  }}
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

            {/* Status messages */}
            {transferError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{transferError}</span>
              </div>
            )}

            {transferSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Transfer complete!</span>
              </div>
            )}

            {/* Info */}
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-400">
                Instant internal transfer — no gas fees or blockchain confirmation needed.
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleTransfer}
              disabled={isDisabled}
            >
              {isProcessing ? (
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
