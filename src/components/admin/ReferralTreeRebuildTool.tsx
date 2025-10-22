import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RebuildResult {
  success: boolean;
  summary?: {
    total: number;
    success: number;
    skipped: number;
    errors: number;
  };
  results?: Array<{
    user_id: string;
    status: string;
    levels?: number;
    reason?: string;
    error?: string;
  }>;
}

export function ReferralTreeRebuildTool() {
  const [rebuilding, setRebuilding] = useState(false);
  const [result, setResult] = useState<RebuildResult | null>(null);

  const handleRebuild = async (force: boolean = false) => {
    try {
      setRebuilding(true);
      setResult(null);

      console.log('🔧 Starting referral tree rebuild...', { force });

      const { data, error } = await supabase.functions.invoke('admin-rebuild-referral-trees', {
        body: { force }
      });

      if (error) {
        console.error('Rebuild error:', error);
        toast.error(`Failed to rebuild trees: ${error.message}`);
        return;
      }

      console.log('✅ Rebuild complete:', data);
      setResult(data);

      if (data.success && data.summary) {
        toast.success(
          `Rebuilt ${data.summary.success} trees (${data.summary.skipped} skipped, ${data.summary.errors} errors)`
        );
      }
    } catch (error) {
      console.error('Rebuild error:', error);
      toast.error('Failed to rebuild referral trees');
    } finally {
      setRebuilding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Referral Tree Rebuild Tool
        </CardTitle>
        <CardDescription>
          Rebuild missing referral trees for users with locked sponsors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This tool rebuilds the referral tree for users who have locked sponsors but missing tree data.
            This is needed for multi-level commission distribution.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            onClick={() => handleRebuild(false)}
            disabled={rebuilding}
            className="flex-1"
          >
            {rebuilding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rebuilding...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Rebuild Missing Trees
              </>
            )}
          </Button>

          <Button
            onClick={() => handleRebuild(true)}
            disabled={rebuilding}
            variant="outline"
          >
            Force Rebuild All
          </Button>
        </div>

        {result && (
          <div className="space-y-3">
            {result.summary && (
              <Alert className="bg-primary/5">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-semibold">Summary</div>
                    <div className="text-sm">
                      Total: {result.summary.total} | 
                      Success: {result.summary.success} | 
                      Skipped: {result.summary.skipped} | 
                      Errors: {result.summary.errors}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {result.results && result.results.length > 0 && (
              <div className="space-y-2">
                <div className="font-semibold text-sm">Details:</div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {result.results.map((r, i) => (
                    <div
                      key={i}
                      className={`text-xs p-2 rounded border ${
                        r.status === 'success'
                          ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                          : r.status === 'skipped'
                          ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
                          : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                      }`}
                    >
                      <div className="font-mono">{r.user_id.slice(0, 8)}...</div>
                      <div>
                        Status: {r.status}
                        {r.levels && ` (${r.levels} levels)`}
                        {r.reason && ` - ${r.reason}`}
                        {r.error && ` - ${r.error}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
