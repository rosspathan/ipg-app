import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

interface RebuildResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results?: Array<{
    user_id: string;
    status: 'success' | 'failed' | 'skipped';
    levels_built?: number;
    error?: string;
  }>;
}

export function RebuildAllTreesTool() {
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [forceRebuild, setForceRebuild] = useState(false);
  const [result, setResult] = useState<RebuildResult | null>(null);
  const { toast } = useToast();

  const handleRebuildAll = async () => {
    setIsRebuilding(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('admin-rebuild-all-trees', {
        body: { force: forceRebuild }
      });

      if (error) throw error;

      setResult(data);
      
      toast({
        title: "Rebuild Complete",
        description: `Successfully rebuilt ${data.successful} trees. ${data.failed} failed, ${data.skipped} skipped.`,
        variant: data.failed > 0 ? "destructive" : "default"
      });
    } catch (error: any) {
      console.error('Error rebuilding trees:', error);
      toast({
        title: "Rebuild Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRebuilding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Rebuild All Referral Trees
        </CardTitle>
        <CardDescription>
          Reconstruct referral trees for all users with locked sponsors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This tool will walk up the sponsor chain for each user and rebuild their complete referral tree up to 50 levels.
            This ensures all commissions are distributed correctly.
          </AlertDescription>
        </Alert>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="force-rebuild"
            checked={forceRebuild}
            onCheckedChange={(checked) => setForceRebuild(checked as boolean)}
            disabled={isRebuilding}
          />
          <label
            htmlFor="force-rebuild"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Force rebuild (delete existing trees and rebuild from scratch)
          </label>
        </div>

        <Button 
          onClick={handleRebuildAll}
          disabled={isRebuilding}
          className="w-full"
        >
          {isRebuilding ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Rebuilding Trees...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {forceRebuild ? 'Force Rebuild All Trees' : 'Rebuild Missing Trees'}
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-semibold">Rebuild Results</h4>
            
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{result.successful}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <div className="text-2xl font-bold">{result.failed}</div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold">{result.skipped}</div>
                  <div className="text-sm text-muted-foreground">Skipped</div>
                </CardContent>
              </Card>
            </div>

            <Progress value={(result.successful / result.total) * 100} />
            
            <div className="text-sm text-muted-foreground text-center">
              Processed {result.total} users total
            </div>

            {result.results && result.results.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2 text-sm">
                <h5 className="font-medium">Sample Results (first 100):</h5>
                {result.results.map((res, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {res.status === 'success' && <CheckCircle className="h-3 w-3 text-green-500" />}
                    {res.status === 'failed' && <XCircle className="h-3 w-3 text-destructive" />}
                    {res.status === 'skipped' && <AlertCircle className="h-3 w-3 text-yellow-500" />}
                    <span className="font-mono">{res.user_id.slice(0, 8)}...</span>
                    {res.levels_built && <span className="text-muted-foreground">({res.levels_built} levels)</span>}
                    {res.error && <span className="text-destructive">{res.error}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
