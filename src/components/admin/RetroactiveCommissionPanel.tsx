import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, DollarSign, Users, TrendingUp, AlertCircle } from 'lucide-react';

interface RetroPreview {
  sponsor_id: string;
  payer_id: string;
  level_num: number;
  badge_purchase_id: string;
  should_have_earned: number;
  actually_earned: number;
  missing_commission: number;
}

interface RetroResult {
  total_sponsors_credited: number;
  total_commissions_paid: number;
  total_entries_created: number;
}

export function RetroactiveCommissionPanel() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<RetroPreview[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [result, setResult] = useState<RetroResult | null>(null);
  const { toast } = useToast();

  const loadPreview = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('pay-retroactive-commissions', {
        body: { action: 'preview' }
      });
      
      if (error) throw error;
      
      setPreview(data.preview || []);
      setSummary(data.summary);
      
      toast({
        title: 'Preview Loaded',
        description: `Found ${data.summary.total_entries} missing commissions totaling ${data.summary.total_bsk.toFixed(2)} BSK`,
      });
    } catch (error: any) {
      toast({
        title: 'Error Loading Preview',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const executePayment = async () => {
    if (!summary || summary.total_entries === 0) {
      toast({
        title: 'No Commissions to Pay',
        description: 'Load preview first to see what will be paid',
        variant: 'destructive',
      });
      return;
    }

    const confirmMessage = `This will credit ${summary.total_bsk.toFixed(2)} BSK to ${summary.unique_sponsors} sponsors (${summary.total_entries} commission entries). This action cannot be undone.\n\nContinue?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pay-retroactive-commissions', {
        body: { action: 'execute' }
      });
      
      if (error) throw error;
      
      setResult(data.result);
      setPreview([]);
      setSummary(null);
      
      toast({
        title: 'Success!',
        description: `Paid ${data.result.total_commissions_paid.toFixed(2)} BSK to ${data.result.total_sponsors_credited} sponsors`,
      });
    } catch (error: any) {
      toast({
        title: 'Payment Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Retroactive Commission Payment</h2>
          <p className="text-muted-foreground mt-2">
            Calculate and pay missed multi-level commissions from past badge purchases
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This tool identifies commissions that should have been paid based on the current 50-level commission structure
            but were not paid at the time of badge purchase. It will credit missing BSK to user withdrawable balances.
          </AlertDescription>
        </Alert>

        {result && (
          <Card className="p-6 bg-success/10 border-success">
            <h3 className="text-lg font-semibold mb-4 text-success">Payment Completed Successfully!</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-success" />
                <div className="text-3xl font-bold">{result.total_sponsors_credited}</div>
                <div className="text-sm text-muted-foreground mt-1">Sponsors Credited</div>
              </div>
              <div className="text-center">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-success" />
                <div className="text-3xl font-bold">{result.total_commissions_paid?.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground mt-1">Total BSK Paid</div>
              </div>
              <div className="text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-success" />
                <div className="text-3xl font-bold">{result.total_entries_created}</div>
                <div className="text-sm text-muted-foreground mt-1">Commission Entries</div>
              </div>
            </div>
          </Card>
        )}

        {summary && preview.length > 0 && (
          <div className="space-y-4">
            <Card className="p-6 bg-primary/5">
              <h3 className="font-semibold mb-4">Payment Preview</h3>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Missing Commissions</div>
                  <div className="text-3xl font-bold">{summary.total_entries}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Affected Sponsors</div>
                  <div className="text-3xl font-bold">{summary.unique_sponsors}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Total BSK</div>
                  <div className="text-3xl font-bold text-primary">{summary.total_bsk.toFixed(2)}</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-semibold mb-3">Sample Entries (showing first 15)</h4>
              <div className="max-h-80 overflow-y-auto space-y-2">
                {preview.slice(0, 15).map((item, idx) => (
                  <div key={idx} className="p-3 bg-muted/50 rounded-lg text-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">Level {item.level_num}</span>
                        <span className="text-muted-foreground ml-2">
                          (Should: {item.should_have_earned.toFixed(2)} | Paid: {item.actually_earned.toFixed(2)})
                        </span>
                      </div>
                      <span className="font-mono font-bold text-primary">
                        +{item.missing_commission.toFixed(2)} BSK
                      </span>
                    </div>
                  </div>
                ))}
                {preview.length > 15 && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    ...and {preview.length - 15} more entries
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        <div className="flex gap-3">
          <Button 
            onClick={loadPreview} 
            disabled={loading}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            {loading && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
            {preview.length > 0 ? 'Refresh Preview' : 'Load Preview'}
          </Button>
          
          {summary && summary.total_entries > 0 && (
            <Button 
              onClick={executePayment} 
              disabled={loading}
              className="flex-1"
              size="lg"
            >
              {loading && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
              Execute Payment ({summary.total_bsk.toFixed(0)} BSK)
            </Button>
          )}
        </div>

        {preview.length === 0 && !result && !loading && (
          <Alert>
            <AlertDescription>
              Click "Load Preview" to calculate which commissions need to be paid retroactively.
              This is a safe operation and won't modify any data.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
}