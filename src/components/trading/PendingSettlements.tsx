import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useSettlements, TOKEN_CONTRACTS } from '@/hooks/useSettlements';
import { AlertCircle, ExternalLink, Clock, CheckCircle2, Loader2, Send, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export function PendingSettlements() {
  const { pendingSettlements, isLoading, confirmSettlement, isConfirming } = useSettlements();
  const { toast } = useToast();
  const [txHashInputs, setTxHashInputs] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-0">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (pendingSettlements.length === 0) {
    return null; // Don't show card if no pending settlements
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const handleConfirm = (settlementId: string) => {
    const txHash = txHashInputs[settlementId];
    if (!txHash || !txHash.startsWith('0x')) {
      toast({
        title: 'Invalid Transaction Hash',
        description: 'Please enter a valid BSC transaction hash starting with 0x',
        variant: 'destructive',
      });
      return;
    }
    confirmSettlement({ settlementRequestId: settlementId, txHash });
  };

  return (
    <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          Pending Settlements
          <Badge variant="destructive" className="ml-auto">
            {pendingSettlements.length} Action Required
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingSettlements.map((settlement) => {
          const isExpanded = expandedId === settlement.id;
          const tokenAddress = TOKEN_CONTRACTS[settlement.asset_symbol];
          const expiresIn = formatDistanceToNow(new Date(settlement.expires_at), { addSuffix: true });
          
          return (
            <div
              key={settlement.id}
              className="p-3 bg-background/50 rounded-lg border border-border/50"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    Send {settlement.amount} {settlement.asset_symbol}
                  </span>
                </div>
                <Badge variant={settlement.status === 'pending' ? 'outline' : 'secondary'}>
                  {settlement.status === 'pending' ? (
                    <>
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Confirming
                    </>
                  )}
                </Badge>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <span>To Address:</span>
                  <div className="flex items-center gap-1">
                    <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                      {settlement.to_wallet.slice(0, 6)}...{settlement.to_wallet.slice(-4)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => copyToClipboard(settlement.to_wallet, 'Address')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span>Token Contract:</span>
                  <a
                    href={`https://bscscan.com/token/${tokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    {tokenAddress?.slice(0, 6)}...{tokenAddress?.slice(-4)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex items-center justify-between text-orange-500">
                  <span>Expires:</span>
                  <span>{expiresIn}</span>
                </div>
              </div>

              {settlement.status === 'pending' && (
                <div className="mt-3 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setExpandedId(isExpanded ? null : settlement.id)}
                  >
                    {isExpanded ? 'Hide Details' : 'I sent the transfer'}
                  </Button>

                  {isExpanded && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        After sending the transfer from your wallet, paste the transaction hash below:
                      </p>
                      <Input
                        placeholder="0x... (BSC Transaction Hash)"
                        value={txHashInputs[settlement.id] || ''}
                        onChange={(e) => setTxHashInputs(prev => ({
                          ...prev,
                          [settlement.id]: e.target.value
                        }))}
                        className="text-xs font-mono"
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleConfirm(settlement.id)}
                        disabled={isConfirming || !txHashInputs[settlement.id]}
                      >
                        {isConfirming ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        Confirm Transfer
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {settlement.status === 'submitted' && settlement.tx_hash && (
                <div className="mt-2">
                  <a
                    href={`https://bscscan.com/tx/${settlement.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View on BSCScan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          );
        })}

        <p className="text-xs text-muted-foreground text-center pt-2">
          Transfer tokens from your connected wallet to complete the trade settlement.
        </p>
      </CardContent>
    </Card>
  );
}
