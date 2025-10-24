import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, PlayCircle, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function RetroactiveRewardsProcessor() {
  const [processing, setProcessing] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const runPreview = async () => {
    setProcessing(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('process-retroactive-rewards', {
        body: { dryRun: true },
      });

      if (error) throw error;

      setPreview(data);
      toast({
        title: 'Preview Complete',
        description: `Found ${data.stats.totalPurchases} purchases to process`,
      });
    } catch (error: any) {
      console.error('Preview error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to preview retroactive rewards',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const processRewards = async () => {
    if (!confirm('This will distribute rewards to all eligible users. Continue?')) {
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('process-retroactive-rewards', {
        body: { dryRun: false },
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: '✅ Processing Complete',
        description: `Distributed ${data.stats.totalBSKDistributed} BSK across ${data.stats.teamIncomeProcessed + data.stats.vipMilestonesProcessed} rewards`,
      });
    } catch (error: any) {
      console.error('Processing error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process retroactive rewards',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const stats = preview?.stats || result?.stats;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Retroactive Rewards Processor</h1>
        <p className="text-muted-foreground mt-2">
          Process past badge purchases to award 50-level team income and VIP milestone rewards
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This tool will process all historical badge purchases and distribute rewards that were missed.
          Rewards are <strong>idempotent</strong> - running multiple times won't create duplicate rewards.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Step 1: Preview
            </CardTitle>
            <CardDescription>
              Scan the system to see what rewards need to be distributed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={runPreview}
              disabled={processing}
              className="w-full"
              variant="outline"
            >
              {processing && !result ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Run Preview
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5" />
              Step 2: Process
            </CardTitle>
            <CardDescription>
              Execute the reward distribution (cannot be undone)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={processRewards}
              disabled={!preview || processing}
              className="w-full"
            >
              {processing && result ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Process All Rewards
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Eye className="w-5 h-5" />}
              {result ? 'Processing Results' : 'Preview Results'}
            </CardTitle>
            <CardDescription>
              {result ? `Batch ID: ${result.batchId}` : 'Dry run - no changes made'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Purchases</p>
                <p className="text-2xl font-bold">{stats.totalPurchases}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Team Income</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-blue-600">{stats.teamIncomeProcessed}</p>
                  <Badge variant="outline" className="text-xs">
                    +{stats.teamIncomeProcessed}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{stats.teamIncomeSkipped} already processed</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">VIP Milestones</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-purple-600">{stats.vipMilestonesProcessed}</p>
                  <Badge variant="outline" className="text-xs">
                    +{stats.vipMilestonesProcessed}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{stats.vipMilestonesSkipped} already processed</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total BSK</p>
                <p className="text-2xl font-bold text-green-600">
                  {result ? stats.totalBSKDistributed.toLocaleString() : '~Calculating'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result ? 'Distributed' : 'Estimated'}
                </p>
              </div>
            </div>

            {result && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Processing Progress</span>
                  <span className="text-sm text-muted-foreground">100%</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
            )}

            {stats.errors && stats.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {stats.errors.length} errors encountered during processing.
                  Check console for details.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
