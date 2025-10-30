import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RefundResult {
  refund_user_id: string;
  refund_badge_name: string;
  refund_amount: number;
  refund_status: string;
}

export function RefundFailedPurchases() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RefundResult[]>([]);

  const handleRefund = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('refund-failed-purchases');
      
      if (error) throw error;
      
      if (!data?.success) {
        throw new Error(data?.error || 'Refund failed');
      }
      
      setResults(data.data || []);
      
      const refundedCount = data.data?.filter((r: RefundResult) => r.refund_status === 'refunded').length || 0;
      
      if (refundedCount > 0) {
        toast({
          title: "Refunds Processed",
          description: `Successfully refunded ${refundedCount} failed badge purchase(s)`,
        });
      } else {
        toast({
          title: "No Refunds Needed",
          description: "No failed badge purchases found",
        });
      }
    } catch (error: any) {
      console.error('Refund error:', error);
      toast({
        title: "Refund Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Badge Purchase Refunds</CardTitle>
        <CardDescription>
          Automatically refund users who paid for badges but didn't receive them due to system errors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Automatic Refund Tool</AlertTitle>
          <AlertDescription>
            This tool will find all completed badge purchases where the badge was not assigned,
            refund the BSK amount, and mark the purchase as refunded.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={handleRefund} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Processing Refunds...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Process Refunds
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="font-semibold">Refund Results:</h3>
            {results.map((result, index) => (
              <Alert key={index} variant={result.refund_status === 'refunded' ? 'default' : 'destructive'}>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {result.refund_status === 'refunded' ? (
                    <>
                      Refunded <strong>{result.refund_amount} BSK</strong> for{' '}
                      <strong>{result.refund_badge_name}</strong> badge
                      <br />
                      <span className="text-xs opacity-70">User ID: {result.refund_user_id}</span>
                    </>
                  ) : (
                    result.refund_badge_name
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
