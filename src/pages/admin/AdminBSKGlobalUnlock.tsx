import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, ShieldAlert, CheckCircle2, XCircle, AlertTriangle, Users, Coins, ArrowRight, Lock, Unlock, Download } from 'lucide-react';
import { format } from 'date-fns';

const CONFIRMATION_PHRASE = 'UNLOCK ALL LOCKED BSK PERMANENTLY';

export default function AdminBSKGlobalUnlock() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [typedPhrase, setTypedPhrase] = useState('');
  const [showRecords, setShowRecords] = useState(false);

  // Preview data
  const { data: preview, isLoading: previewLoading, error: previewError } = useQuery({
    queryKey: ['bsk-global-unlock-preview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('preview_bsk_global_unlock');
      if (error) throw error;
      return data as any;
    },
  });

  // Past events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['bsk-global-unlock-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_global_unlock_events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // User records for completed event
  const completedEvent = events?.find((e: any) => e.status === 'completed');
  const { data: userRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['bsk-unlock-user-records', completedEvent?.id],
    queryFn: async () => {
      if (!completedEvent) return [];
      const { data, error } = await supabase
        .from('bsk_unlock_user_records')
        .select('*')
        .eq('event_id', completedEvent.id)
        .order('locked_bsk_before', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!completedEvent && showRecords,
  });

  // Execute mutation
  const executeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('execute_bsk_global_unlock', {
        p_confirmation_phrase: CONFIRMATION_PHRASE,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast({ title: 'Global Unlock Complete', description: `${data.users_processed} users processed. ${data.total_tradable_credited} BSK credited.` });
      } else {
        toast({ title: 'Blocked', description: data?.reason || 'Cannot execute', variant: 'destructive' });
      }
      setShowConfirm(false);
      setTypedPhrase('');
      queryClient.invalidateQueries({ queryKey: ['bsk-global-unlock'] });
      queryClient.invalidateQueries({ queryKey: ['bsk-global-unlock-preview'] });
      queryClient.invalidateQueries({ queryKey: ['bsk-global-unlock-events'] });
    },
    onError: (err: any) => {
      toast({ title: 'Execution Failed', description: err.message, variant: 'destructive' });
      setShowConfirm(false);
      setTypedPhrase('');
    },
  });

  const isSunset = preview && !preview.can_execute;
  const canExecute = preview?.can_execute === true;

  const exportCSV = () => {
    if (!userRecords?.length) return;
    const headers = ['User ID', 'Locked Before', 'Deducted', 'Tradable Credited', 'Remainder', 'Withdrawable Before', 'Withdrawable After', 'Status'];
    const rows = userRecords.map((r: any) => [r.user_id, r.locked_bsk_before, r.locked_bsk_deducted, r.tradable_bsk_credited, r.remainder_bsk, r.withdrawable_before, r.withdrawable_after, r.status]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bsk-global-unlock-records-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          BSK Global Unlock & Sunset
        </h1>
        <p className="text-muted-foreground text-sm">
          One-time irreversible conversion of all locked BSK to tradable BSK at 3:1 ratio. After execution, locked BSK is permanently discontinued.
        </p>
      </div>

      {/* Status Banner */}
      {isSunset && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
            <div>
              <p className="font-semibold text-green-700 dark:text-green-400">Locked BSK Has Been Sunset</p>
              <p className="text-sm text-muted-foreground">{preview?.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Cards */}
      {previewLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : previewError ? (
        <Card className="border-destructive"><CardContent className="p-4 text-destructive">Failed to load preview: {(previewError as Error).message}</CardContent></Card>
      ) : canExecute ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Users} label="Users with Locked BSK" value={preview.total_users_with_locked} />
            <StatCard icon={Lock} label="Total Locked BSK" value={Number(preview.total_locked_bsk).toLocaleString()} accent="destructive" />
            <StatCard icon={Unlock} label="Tradable BSK to Credit" value={Number(preview.total_tradable_bsk_to_credit).toLocaleString()} accent="success" />
            <StatCard icon={Coins} label="Remainder (Burned)" value={Number(preview.total_remainder_bsk_burned).toLocaleString()} accent="warning" />
          </div>

          {/* Conversion Explanation */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Conversion Preview</CardTitle>
              <CardDescription>Review before executing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PreviewRow label="Conversion Ratio" value="3 Locked → 1 Tradable" />
                <PreviewRow label="Users to Process" value={preview.total_users_with_locked} />
                <PreviewRow label="Users with Zero" value={`${preview.total_users_zero} (skipped)`} />
              </div>
              <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Locked BSK</span>
                  <span className="font-mono font-semibold text-destructive">{Number(preview.total_locked_bsk).toLocaleString()} BSK</span>
                </div>
                <div className="flex items-center justify-center"><ArrowRight className="h-4 w-4 text-muted-foreground" /></div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tradable BSK (3:1)</span>
                  <span className="font-mono font-semibold text-green-600">{Number(preview.total_tradable_bsk_to_credit).toLocaleString()} BSK</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Remainder (Burned)</span>
                  <span className="font-mono font-semibold text-yellow-600">{Number(preview.total_remainder_bsk_burned).toLocaleString()} BSK</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between text-sm font-bold">
                  <span>Total Withdrawable Added</span>
                  <span className="text-green-600">{Number(preview.total_tradable_bsk_to_credit).toLocaleString()} BSK</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic">{preview.note}</p>
            </CardContent>
          </Card>

          {/* Execute Button */}
          <Card className="border-destructive/30">
            <CardContent className="p-6 text-center space-y-4">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
              <h3 className="text-lg font-bold">Irreversible Action</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                This will convert ALL locked BSK across ALL users to tradable BSK and permanently disable locked BSK. This cannot be undone.
              </p>
              <Button size="lg" variant="destructive" onClick={() => setShowConfirm(true)} className="px-8">
                <ShieldAlert className="h-4 w-4 mr-2" />
                Execute Global Unlock
              </Button>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Completed Event Summary */}
      {completedEvent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Execution Summary
            </CardTitle>
            <CardDescription>Executed on {format(new Date(completedEvent.completed_at), 'PPpp')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MiniStat label="Users Processed" value={completedEvent.total_users_processed} />
              <MiniStat label="Users Failed" value={completedEvent.total_users_failed} accent={completedEvent.total_users_failed > 0 ? 'destructive' : undefined} />
              <MiniStat label="Locked BSK Removed" value={Number(completedEvent.total_locked_bsk_deducted).toLocaleString()} />
              <MiniStat label="Tradable BSK Credited" value={Number(completedEvent.total_tradable_bsk_credited).toLocaleString()} />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowRecords(!showRecords)}>
                {showRecords ? 'Hide' : 'View'} User Records ({completedEvent.total_users_processed})
              </Button>
              {showRecords && userRecords?.length && (
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="h-3 w-3 mr-1" /> Export CSV
                </Button>
              )}
            </div>

            {showRecords && (
              <div className="border rounded-lg overflow-auto max-h-[500px]">
                {recordsLoading ? (
                  <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">User ID</th>
                        <th className="text-right p-2">Locked Before</th>
                        <th className="text-right p-2">Tradable Credited</th>
                        <th className="text-right p-2">Remainder</th>
                        <th className="text-center p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userRecords?.map((r: any) => (
                        <tr key={r.id} className="border-t">
                          <td className="p-2 font-mono text-[10px]">{r.user_id.slice(0, 8)}…</td>
                          <td className="p-2 text-right">{Number(r.locked_bsk_before).toLocaleString()}</td>
                          <td className="p-2 text-right text-green-600">{Number(r.tradable_bsk_credited).toLocaleString()}</td>
                          <td className="p-2 text-right text-yellow-600">{Number(r.remainder_bsk)}</td>
                          <td className="p-2 text-center">
                            <Badge variant={r.status === 'completed' ? 'default' : 'destructive'} className="text-[10px]">
                              {r.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {completedEvent.error_summary && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-destructive">Failed Records</CardTitle></CardHeader>
                <CardContent>
                  <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(completedEvent.error_summary, null, 2)}</pre>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Confirm Global BSK Unlock
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This action will:</p>
              <ul className="list-disc ml-4 space-y-1 text-sm">
                <li>Convert <strong>{Number(preview?.total_locked_bsk || 0).toLocaleString()} locked BSK</strong> across <strong>{preview?.total_users_with_locked || 0} users</strong></li>
                <li>Credit <strong>{(Number(preview?.total_tradable_bsk_to_credit || 0) + Number(preview?.total_goodwill_from_remainder || 0)).toLocaleString()} tradable BSK</strong></li>
                <li>Permanently disable locked BSK</li>
              </ul>
              <p className="font-semibold text-sm mt-3">Type exactly: <code className="bg-muted px-2 py-1 rounded text-xs">{CONFIRMATION_PHRASE}</code></p>
              <Input
                value={typedPhrase}
                onChange={(e) => setTypedPhrase(e.target.value)}
                placeholder="Type confirmation phrase..."
                className="font-mono text-sm"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTypedPhrase('')}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={typedPhrase !== CONFIRMATION_PHRASE || executeMutation.isPending}
              onClick={() => executeMutation.mutate()}
            >
              {executeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
              Execute Irreversible Unlock
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
  const colorMap: Record<string, string> = {
    destructive: 'text-destructive',
    success: 'text-green-600',
    warning: 'text-yellow-600',
  };
  return (
    <Card>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={`text-lg md:text-xl font-bold ${accent ? colorMap[accent] || '' : ''}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="text-center p-2 bg-muted/30 rounded-lg">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${accent === 'destructive' ? 'text-destructive' : ''}`}>{value}</p>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between md:flex-col md:items-start gap-1 p-3 bg-muted/20 rounded-lg">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}
