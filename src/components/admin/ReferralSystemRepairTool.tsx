import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Wrench, CheckCircle, XCircle, AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

interface V2RebuildResult {
  success: boolean;
  processed: number;
  inserted: number;
  skipped: number;
  errors: Array<{ user_id: string; error: string }>;
  samples: Array<{ user_id: string; levels: number; sponsor_id: string }>;
}

interface AuditResult {
  success: boolean;
  sponsor_stats: Array<{
    sponsor_id: string;
    expected_directs: number;
    actual_directs: number;
    diff: number;
  }>;
  total_sponsors_with_issues: number;
  inconsistencies: Array<{
    user_id: string;
    issue: string;
    expected_sponsor?: string;
    actual_sponsor?: string;
  }>;
  total_inconsistencies: number;
  users_needing_repair: number;
  repair_result?: V2RebuildResult;
}

export function ReferralSystemRepairTool() {
  const [isRepairing, setIsRepairing] = useState(false);
  const [result, setResult] = useState<RepairResult | null>(null);
  const [isRebuildingV2, setIsRebuildingV2] = useState(false);
  const [v2Result, setV2Result] = useState<V2RebuildResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

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

  const handleV2Rebuild = async () => {
    try {
      setIsRebuildingV2(true);
      setV2Result(null);

      const { data, error } = await supabase.functions.invoke('admin-rebuild-referral-trees-v2', {
        body: {
          force: true,
          include_unlocked: true
        }
      });

      if (error) throw error;

      setV2Result(data);
      
      if (data.success) {
        toast({
          title: "V2 Rebuild Complete",
          description: `Processed ${data.processed} users, inserted ${data.inserted} tree records, ${data.errors.length} errors`,
        });
      } else {
        toast({
          title: "V2 Rebuild Failed",
          description: data.error || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('V2 rebuild error:', error);
      toast({
        title: "V2 Rebuild Failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRebuildingV2(false);
    }
  };

  const handleAudit = async (withRepair = false) => {
    try {
      setIsAuditing(true);
      setAuditResult(null);

      const { data, error } = await supabase.functions.invoke('admin-audit-referral-consistency', {
        body: {
          repair: withRepair
        }
      });

      if (error) throw error;

      setAuditResult(data);
      
      if (data.success) {
        toast({
          title: withRepair ? "Audit & Repair Complete" : "Audit Complete",
          description: `Found ${data.total_sponsors_with_issues} sponsors with issues, ${data.total_inconsistencies} user inconsistencies`,
        });
      } else {
        toast({
          title: "Audit Failed",
          description: data.error || "An error occurred",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Audit error:', error);
      toast({
        title: "Audit Failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsAuditing(false);
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
          Fix referral relationships, rebuild trees, and audit consistency
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="repair" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="repair">Legacy Repair</TabsTrigger>
            <TabsTrigger value="v2rebuild">V2 Rebuild (All)</TabsTrigger>
            <TabsTrigger value="audit">Audit & Fix</TabsTrigger>
          </TabsList>

          <TabsContent value="repair" className="space-y-4">
            <Alert>
              <AlertDescription>
                This tool will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Create missing referral_links_new records for all users</li>
                  <li>Resolve and lock all users with sponsor_code_used but no locked sponsor</li>
                  <li>Rebuild trees for locked referrals only</li>
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
                    <h4 className="font-semibold">Recent Actions (first 100):</h4>
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
          </TabsContent>

          <TabsContent value="v2rebuild" className="space-y-4">
            <Alert>
              <AlertDescription>
                V2 Rebuild (All Users):
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Processes ALL users with sponsor_id (ignores lock status)</li>
                  <li>Normalizes direct_sponsor_id for consistency</li>
                  <li>Force deletes and rebuilds entire trees</li>
                  <li>Fixes missing Level 1 referrals</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleV2Rebuild}
              disabled={isRebuildingV2}
              size="lg"
              variant="default"
              className="w-full"
            >
              {isRebuildingV2 ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rebuilding All Trees...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rebuild All Trees (Ignore Lock)
                </>
              )}
            </Button>

            {v2Result && (
              <div className="space-y-4 mt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{v2Result.processed}</div>
                        <div className="text-sm text-muted-foreground">Users Processed</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{v2Result.inserted}</div>
                        <div className="text-sm text-muted-foreground">Records Inserted</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{v2Result.skipped}</div>
                        <div className="text-sm text-muted-foreground">Skipped</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{v2Result.errors.length}</div>
                        <div className="text-sm text-muted-foreground">Errors</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {v2Result.samples.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Sample Results (first 100):</h4>
                    <div className="max-h-[300px] overflow-y-auto space-y-1">
                      {v2Result.samples.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-start gap-2 p-2 bg-muted/50 rounded text-sm"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs truncate">{item.user_id}</div>
                            <div className="text-muted-foreground">
                              {item.levels} levels, sponsor: {item.sponsor_id.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {v2Result.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-red-600">Errors:</h4>
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {v2Result.errors.map((item, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm"
                        >
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs truncate">{item.user_id}</div>
                            <div className="text-red-600">{item.error}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Alert>
              <AlertDescription>
                Consistency Audit:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Compares expected vs actual direct referrals per sponsor</li>
                  <li>Identifies missing Level 1 users in referral_tree</li>
                  <li>Detects misassigned direct_sponsor_id values</li>
                  <li>Option to auto-repair all inconsistencies</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button
                onClick={() => handleAudit(false)}
                disabled={isAuditing}
                size="lg"
                variant="outline"
                className="flex-1"
              >
                {isAuditing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Auditing...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Audit Only
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleAudit(true)}
                disabled={isAuditing}
                size="lg"
                className="flex-1"
              >
                {isAuditing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Auditing & Repairing...
                  </>
                ) : (
                  <>
                    <Wrench className="mr-2 h-4 w-4" />
                    Audit & Fix All
                  </>
                )}
              </Button>
            </div>

            {auditResult && (
              <div className="space-y-4 mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{auditResult.total_sponsors_with_issues}</div>
                        <div className="text-sm text-muted-foreground">Sponsors w/ Issues</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{auditResult.total_inconsistencies}</div>
                        <div className="text-sm text-muted-foreground">User Inconsistencies</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{auditResult.users_needing_repair}</div>
                        <div className="text-sm text-muted-foreground">Users Need Repair</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {auditResult.sponsor_stats.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">Sponsor Discrepancies (top 100):</h4>
                    <div className="max-h-[250px] overflow-y-auto space-y-1">
                      {auditResult.sponsor_stats.map((stat, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-start gap-2 p-2 bg-muted/50 rounded text-sm"
                        >
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs truncate">{stat.sponsor_id}</div>
                            <div className="text-muted-foreground">
                              Expected: {stat.expected_directs}, Actual: {stat.actual_directs}, Diff: {stat.diff > 0 ? '+' : ''}{stat.diff}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {auditResult.inconsistencies.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold">User Inconsistencies (top 200):</h4>
                    <div className="max-h-[250px] overflow-y-auto space-y-1">
                      {auditResult.inconsistencies.map((issue, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded text-sm"
                        >
                          <XCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs truncate">{issue.user_id}</div>
                            <div className="text-orange-600">
                              {issue.issue === 'missing_level1' && `Missing Level 1 (expected sponsor: ${issue.expected_sponsor?.substring(0, 8)}...)`}
                              {issue.issue === 'misassigned_direct_sponsor' && `Wrong direct_sponsor_id (expected: ${issue.expected_sponsor?.substring(0, 8)}..., actual: ${issue.actual_sponsor?.substring(0, 8)}...)`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {auditResult.repair_result && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Repair completed: {auditResult.repair_result.processed} users processed, {auditResult.repair_result.inserted} records inserted
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
