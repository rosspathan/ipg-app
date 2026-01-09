import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Check, QrCode, AlertTriangle, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

interface CustodialDepositInstructionsProps {
  assetSymbol?: string;
  amount?: number;
}

export function CustodialDepositInstructions({ 
  assetSymbol = "BNB",
  amount 
}: CustodialDepositInstructionsProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Fetch active hot wallet
  const { data: hotWallet, isLoading } = useQuery({
    queryKey: ['platform-hot-wallet'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_hot_wallet')
        .select('address, chain')
        .eq('is_active', true)
        .eq('chain', 'BSC')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const copyAddress = async () => {
    if (!hotWallet?.address) return;
    
    try {
      await navigator.clipboard.writeText(hotWallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied",
        description: "Deposit address copied to clipboard",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the address manually",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-8">
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!hotWallet?.address) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Deposit address not available. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Deposit Instructions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline">BSC (BEP-20)</Badge>
          {assetSymbol && <Badge>{assetSymbol}</Badge>}
        </div>

        {/* QR Code */}
        <div className="flex justify-center p-4 bg-white rounded-lg">
          <QRCodeSVG 
            value={hotWallet.address} 
            size={160}
            level="H"
            includeMargin
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Deposit Address</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-muted rounded-lg text-xs font-mono break-all">
              {hotWallet.address}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={copyAddress}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Amount to send */}
        {amount && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="text-xs text-muted-foreground">Amount to send</div>
            <div className="text-lg font-bold">
              {amount} {assetSymbol}
            </div>
          </div>
        )}

        {/* Warnings */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <ul className="space-y-1 mt-1">
              <li>• Only send <strong>{assetSymbol}</strong> on <strong>BSC (BEP-20)</strong> network</li>
              <li>• Deposits require 15 confirmations (~45 seconds)</li>
              <li>• Sending wrong tokens may result in permanent loss</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Explorer link */}
        <a
          href={`https://bscscan.com/address/${hotWallet.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1 text-xs text-primary hover:underline"
        >
          View on BscScan
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  );
}

export default CustodialDepositInstructions;
