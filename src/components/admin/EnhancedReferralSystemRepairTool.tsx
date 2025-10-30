import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Wrench, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AuditStats {
  missingLevel1Trees: number;
  incorrectLevel1Trees: number;
  invalidDirectSponsor: number;
}

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

export function EnhancedReferralSystemRepairTool() {
  const [isRepairing, setIsRepairing] = useState(false);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditStats, setAuditStats] = useState<AuditStats | null>(null);
  const [result, setResult] = useState<RepairResult | null>(null);

  const loadAuditStats = async () => {
    setIsLoadingAudit(true);
    try {
      // Count missing level-1 tree rows
      const { data: lockedLinks } = await supabase
        .from('referral_links_new')
        .select('user_id, sponsor_id')
        .not('sponsor_id', 'is', null)
        .not('locked_at', 'is', null);

      const { data: existingTrees } = await supabase
        .from('referral_tree')
        .select('user_id, ancestor_id, direct_sponsor_id')
        .eq('level', 1);

      const lockedSet = new Set(lockedLinks?.map(l => l.user_id) || []);
      const treeSet = new Set(existingTrees?.map(t => t.user_id) || []);
      
      const missingLevel1Trees = lockedLinks?.filter(l => !treeSet.has(l.user_id)).length || 0;
      
      // Count incorrect level-1 trees
      const incorrectLevel1Trees = existingTrees?.filter(tree => {
        const link = lockedLinks?.find(l => l.user_id === tree.user_id);
        return link && link.sponsor_id !== tree.ancestor_id;
      }).length || 0;

      // Count invalid direct_sponsor_id
      const invalidDirectSponsor = existingTrees?.filter(tree => 
        !tree.direct_sponsor_id || tree.direct_sponsor_id === null
      ).length || 0;

      setAuditStats({
        missingLevel1Trees,
        incorrectLevel1Trees,
        invalidDirectSponsor
      });
    } catch (error) {
      console.error('Error loading audit stats:', error);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadAuditStats();
  }, []);

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
        // Reload audit stats after repair
        await loadAuditStats();
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

  const handleForceRebuildAll = async () => {
    try {
      setIsRepairing(true);
      setResult(null);

      const { data, error } = await supabase.functions.invoke('admin-rebuild-referral-trees', {
        body: { force: true }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Trees Rebuilt Successfully",
          description: `${data.summary.success} trees rebuilt, ${data.summary.errors} errors`,
        });
        await loadAuditStats();
      } else {
        toast({
          title: "Rebuild Failed",
          description: data.error || "An error occurred during rebuild",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Rebuild error:', error);
      toast({
        title: "Rebuild Failed",
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
          Complete Referral System Repair & Audit
        </CardTitle>
        <CardDescription>
          View system health and repair all referral relationships
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audit Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={auditStats?.missingLevel1Trees ? 'border-red-500' : 'border-green-500'}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className={`text-3xl font-bold ${auditStats?.missingLevel1Trees ? 'text-red-600' : 'text-green-600'}`}>
                  {isLoadingAudit ? '...' : auditStats?.missingLevel1Trees || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Missing Level-1 Trees</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Users with locked sponsors but no tree record
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={auditStats?.incorrectLevel1Trees ? 'border-orange-500' : 'border-green-500'}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className={`text-3xl font-bold ${auditStats?.incorrectLevel1Trees ? 'text-orange-600' : 'text-green-600'}`}>
                  {isLoadingAudit ? '...' : auditStats?.incorrectLevel1Trees || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Incorrect Level-1 Trees</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Trees where ancestor doesn't match sponsor
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className={auditStats?.invalidDirectSponsor ? 'border-orange-500' : 'border-green-500'}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className={`text-3xl font-bold ${auditStats?.invalidDirectSponsor ? 'text-orange-600' : 'text-green-600'}`}>
                  {isLoadingAudit ? '...' : auditStats?.invalidDirectSponsor || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Invalid Direct Sponsor</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Tree records with null direct_sponsor_id
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={loadAuditStats}
            disabled={isLoadingAudit}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingAudit ? 'animate-spin' : ''}`} />
            Refresh Audit
          </Button>
        </div>

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

        <div className="flex gap-2">
          <Button
            onClick={handleRepair}
            disabled={isRepairing}
            size="lg"
            className="flex-1"
          >
            {isRepairing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Repairing System...
              </>
            ) : (
              <>
                <Wrench className="mr-2 h-4 w-4" />
                Repair & Rebuild All
              </>
            )}
          </Button>

          <Button
            onClick={handleForceRebuildAll}
            disabled={isRepairing}
            size="lg"
            variant="destructive"
            className="flex-1"
          >
            {isRepairing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Force Rebuilding...
              </>
            ) : (
              <>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Force Rebuild All Trees
              </>
            )}
          </Button>
        </div>

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
