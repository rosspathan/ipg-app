import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Wrench, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface RepairResult {
  success: boolean;
  repair: {
    total: number;
    created: number;
    locked: number;
    skipped: number;
    failed: number;
  };
  trees: {
    rebuilt: number;
  };
  results?: Array<{
    user_id: string;
    action: 'created' | 'locked' | 'failed';
    details?: string;
    error?: string;
  }>;
}

export function ReferralSystemRepairTool() {
  const [isRepairing, setIsRepairing] = useState(false);
  const [result, setResult] = useState<RepairResult | null>(null);

  const handleRepair = async () => {
    try {
      setIsRepairing(true);
      setResult(null);

      const { data, error } = await supabase.functions.invoke('admin-repair-referral-system', {
        body: {}
      });

      if (error) throw error;

      setResult(data);
      
      if (data.success) {
        toast({
          title: "System Repaired Successfully",
          description: `Created ${data.repair.created} records, locked ${data.repair.locked} referrals, rebuilt ${data.trees.rebuilt} trees`,
        });
      } else {
        toast({
          title: "Repair Failed",
          description: data.error || "An error occurred during repair",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Repair error:', error);
      toast({
        title: "Repair Failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Complete Referral System Repair
        </CardTitle>
        <CardDescription>
          Automatically fix all referral relationships and rebuild trees
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            This tool will:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Create missing referral_links_new records for all users</li>
              <li>Resolve and lock all users with sponsor_code_used but no locked sponsor</li>
              <li>Rebuild all referral trees automatically</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleRepair}
          disabled={isRepairing}
          size="lg"
          className="w-full"
        >
          {isRepairing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Repairing System...
            </>
          ) : (
            <>
              <Wrench className="mr-2 h-4 w-4" />
              Repair Complete System
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{result.repair.created}</div>
                    <div className="text-sm text-muted-foreground">Records Created</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{result.repair.locked}</div>
                    <div className="text-sm text-muted-foreground">Referrals Locked</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{result.trees.rebuilt}</div>
                    <div className="text-sm text-muted-foreground">Trees Rebuilt</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{result.repair.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Users Processed</span>
                <span className="font-medium">{result.repair.total}</span>
              </div>
              <Progress 
                value={((result.repair.created + result.repair.locked + result.repair.skipped) / result.repair.total) * 100} 
              />
            </div>

            {result.results && result.results.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold">Recent Actions (showing first 100):</h4>
                <div className="max-h-[300px] overflow-y-auto space-y-1">
                  {result.results.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-start gap-2 p-2 bg-muted/50 rounded text-sm"
                    >
                      {item.action === 'created' && <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />}
                      {item.action === 'locked' && <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />}
                      {item.action === 'failed' && <XCircle className="h-4 w-4 text-red-600 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs truncate">{item.user_id}</div>
                        <div className="text-muted-foreground">
                          {item.details || item.error}
                        </div>
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
