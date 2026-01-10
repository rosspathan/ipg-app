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
import { ArrowRight, Loader2, Wallet, TrendingUp, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { useTradingTransfer } from "@/hooks/useTradingBalances";
import { useOnchainBalances } from "@/hooks/useOnchainBalances";
import { useDirectTradingDeposit, DepositStatus } from "@/hooks/useDirectTradingDeposit";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  
  // For withdrawals (from trading to wallet)
  const { mutate: transfer, isPending: isWithdrawPending } = useTradingTransfer();
  
  // For deposits (from wallet to trading) - use direct on-chain transfer
  const { balances: onchainBalances, isLoading: onchainLoading } = useOnchainBalances();
  const { 
    executeDeposit, 
    status: depositStatus, 
    txHash, 
    error: depositError,
    reset: resetDeposit,
    isLoading: isDepositPending 
  } = useDirectTradingDeposit();

  // Get asset ID map for deposits
  const { data: assetIdMap = new Map() } = useQuery({
    queryKey: ['asset-id-map-dialog'],
    queryFn: async () => {
      const { data } = await supabase
        .from('assets')
        .select('id, symbol, contract_address, decimals')
        .or('network.ilike.%bep20%,network.ilike.%bsc%')
        .eq('is_active', true);
      
      const map = new Map<string, { id: string; contractAddress: string | null; decimals: number }>();
      data?.forEach(a => map.set(a.symbol.toUpperCase(), {
        id: a.id,
        contractAddress: a.contract_address,
        decimals: a.decimals || 18
      }));
      return map;
    },
    staleTime: 60000,
    enabled: open
  });

  // Use on-chain balances for deposits, trading balances for withdrawals
  const sourceBalances = direction === "to_trading" 
    ? onchainBalances.filter(b => b.balance > 0.000001).map(b => ({
        symbol: b.symbol,
        name: b.name,
        available: b.balance,
        asset_id: assetIdMap.get(b.symbol.toUpperCase())?.id || '',
        logo_url: b.logoUrl
      }))
    : tradingBalances;

  const selectedBalance = sourceBalances.find((b) => b.asset_id === selectedAsset || b.symbol === selectedAsset);

  // Check BNB for gas
  const bnbBalance = onchainBalances.find(a => a.symbol === 'BNB')?.balance || 0;
  const hasEnoughGas = bnbBalance > 0.001;

  // Reset when dialog closes or direction changes
  useEffect(() => {
    if (!open) {
      setAmount("");
      setSelectedAsset("");
      resetDeposit();
    }
  }, [open]);

  useEffect(() => {
    setAmount("");
    setSelectedAsset("");
    resetDeposit();
  }, [direction]);

  const handleTransfer = async () => {
    if (!selectedBalance || !amount || Number(amount) <= 0) return;

    if (direction === "to_trading") {
      // Direct on-chain deposit
      const assetInfo = assetIdMap.get(selectedBalance.symbol.toUpperCase());
      const onchainAsset = onchainBalances.find(b => b.symbol === selectedBalance.symbol);
      
      if (!assetInfo || !onchainAsset) {
        return;
      }

      const result = await executeDeposit({
        symbol: selectedBalance.symbol,
        amount: Number(amount),
        contractAddress: onchainAsset.contractAddress,
        decimals: onchainAsset.decimals,
        assetId: assetInfo.id,
      });

      if (result.success) {
        // Keep dialog open to show success, then close after a delay
        setTimeout(() => {
          setAmount("");
          setSelectedAsset("");
          resetDeposit();
          onOpenChange(false);
        }, 2000);
      }
    } else {
      // Withdrawal via edge function
      transfer(
        {
          asset_id: selectedBalance.asset_id,
          amount: Number(amount),
          direction,
        },
        {
          onSuccess: () => {
            setAmount("");
            setSelectedAsset("");
            onOpenChange(false);
          },
        }
      );
    }
  };

  const handleMax = () => {
    if (selectedBalance) {
      setAmount(selectedBalance.available.toString());
    }
  };

  const getStatusMessage = (status: DepositStatus) => {
    switch (status) {
      case 'signing': return 'Signing transaction...';
      case 'pending': return 'Confirming on BSC...';
      case 'confirmed': return 'Transfer complete!';
      case 'error': return depositError || 'Transfer failed';
      default: return '';
    }
  };

  const isPending = direction === "to_trading" ? isDepositPending : isWithdrawPending;
  const isDisabled = direction === "to_trading" 
    ? (!selectedAsset || !amount || Number(amount) <= 0 || isPending || (!hasEnoughGas && selectedBalance?.symbol !== 'BNB'))
    : (!selectedAsset || !amount || Number(amount) <= 0 || isPending);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transfer Funds</DialogTitle>
          <DialogDescription>
            Move funds between your wallet and trading balance
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

            {/* Loading state for on-chain balances */}
            {direction === "to_trading" && onchainLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading wallet balances...</span>
              </div>
            ) : (
              <>
                {/* Asset selection */}
                <div className="space-y-2">
                  <Label>Select Asset</Label>
                  <Select 
                    value={selectedAsset} 
                    onValueChange={setSelectedAsset}
                  >
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

                {/* Gas warning for deposits */}
                {direction === "to_trading" && !hasEnoughGas && selectedBalance?.symbol !== 'BNB' && (
                  <Alert className="bg-amber-500/10 border-amber-500/20">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <AlertDescription className="text-xs text-amber-400">
                      Low BNB balance ({bnbBalance.toFixed(4)} BNB). You need BNB for gas fees.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Transfer status for deposits */}
                {direction === "to_trading" && depositStatus !== 'idle' && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg ${
                    depositStatus === 'error' 
                      ? 'bg-destructive/10 text-destructive' 
                      : depositStatus === 'confirmed'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {depositStatus === 'confirmed' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : depositStatus === 'error' ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <span className="text-sm">{getStatusMessage(depositStatus)}</span>
                    {txHash && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 ml-auto text-xs"
                        onClick={() => window.open(`https://bscscan.com/tx/${txHash}`, '_blank')}
                      >
                        View <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                )}

                {/* Info notice */}
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <p className="text-xs text-blue-400">
                    {direction === "to_trading"
                      ? "One-click transfer: Your tokens will be sent to the platform wallet automatically."
                      : "Funds will be transferred back to your on-chain wallet. This may take a few minutes."}
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={handleTransfer}
                  disabled={isDisabled}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {direction === "to_trading" ? getStatusMessage(depositStatus) : "Processing..."}
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
      </DialogContent>
    </Dialog>
  );
}
