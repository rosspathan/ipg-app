import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, DollarSign, Users, TrendingUp } from 'lucide-react';

interface RetroResult {
  total_sponsors_credited: number;
  total_commissions_paid: number;
  total_entries_created: number;
}

export function RetroactiveCommissionTool() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [result, setResult] = useState<RetroResult | null>(null);
  const { toast } = useToast();

  const loadPreview = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('calculate_retroactive_commissions');
      
      if (error) throw error;
      
      setPreview(data || []);
      
      const totalMissing = data?.reduce((sum: number, item: any) => sum + Number(item.missing_commission), 0) || 0;
      const uniqueSponsors = new Set(data?.map((item: any) => item.sponsor_id)).size;
      
      toast({
        title: 'Preview Loaded',
        description: `Found ${data?.length || 0} missing commissions for ${uniqueSponsors} sponsors (${totalMissing.toFixed(2)} BSK total)`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const executePayment = async () => {
    if (!confirm('This will credit missed commissions to user balances. This action cannot be undone. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('pay_retroactive_commissions');
      
      if (error) throw error;
      
      const resultData = data?.[0];
      setResult(resultData);
      setPreview([]);
      
      toast({
        title: 'Success!',
        description: `Paid ${resultData?.total_commissions_paid?.toFixed(2)} BSK to ${resultData?.total_sponsors_credited} sponsors`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalMissing = preview.reduce((sum, item) => sum + Number(item.missing_commission), 0);
  const uniqueSponsors = new Set(preview.map(item => item.sponsor_id)).size;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Retroactive Commission Payment</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Calculate and pay missed multi-level commissions from past badge purchases
          </p>
        </div>

        <Alert>
          <AlertDescription>
            This tool identifies commissions that should have been paid based on the current multi-level structure
            but were not paid at the time of purchase. It will credit the missing BSK to user withdrawable balances.
          </AlertDescription>
        </Alert>

        {result && (
          <Card className="p-4 bg-success/10 border-success">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-success" />
                <div className="text-2xl font-bold">{result.total_sponsors_credited}</div>
                <div className="text-sm text-muted-foreground">Sponsors Credited</div>
              </div>
              <div className="text-center">
                <DollarSign className="h-6 w-6 mx-auto mb-2 text-success" />
                <div className="text-2xl font-bold">{result.total_commissions_paid?.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total BSK Paid</div>
              </div>
              <div className="text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-success" />
                <div className="text-2xl font-bold">{result.total_entries_created}</div>
                <div className="text-sm text-muted-foreground">Commission Entries</div>
              </div>
            </div>
          </Card>
        )}

        {preview.length > 0 && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Missing Commissions</div>
                <div className="text-2xl font-bold">{preview.length}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Affected Sponsors</div>
                <div className="text-2xl font-bold">{uniqueSponsors}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Total BSK</div>
                <div className="text-2xl font-bold">{totalMissing.toFixed(2)}</div>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {preview.slice(0, 10).map((item, idx) => (
                <div key={idx} className="p-3 bg-muted/50 rounded text-sm">
                  <div className="flex justify-between">
                    <span>Level {item.level_num}</span>
                    <span className="font-mono">{Number(item.missing_commission).toFixed(2)} BSK</span>
                  </div>
                </div>
              ))}
              {preview.length > 10 && (
                <div className="text-center text-sm text-muted-foreground">
                  ...and {preview.length - 10} more
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button 
            onClick={loadPreview} 
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {preview.length > 0 ? 'Refresh Preview' : 'Preview Missing Commissions'}
          </Button>
          
          {preview.length > 0 && (
            <Button 
              onClick={executePayment} 
              disabled={loading}
              className="flex-1"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Execute Payment ({totalMissing.toFixed(0)} BSK)
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}