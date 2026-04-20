import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface KYCAccessDiagnosticProps {
  userId: string;
  /** Compact card variant for embedding in lists */
  compact?: boolean;
}

interface DiagnosticResult {
  user_id: string;
  can_trade: boolean;
  can_withdraw: boolean;
  can_migrate: boolean;
  can_transfer: boolean;
  documents_status: string | null;
  face_status: string | null;
  mobile_status: string | null;
  final_status: string | null;
  is_legacy: boolean | null;
  kyc_version: number | null;
  final_approved_at: string | null;
  cutoff_at: string | null;
  reason: string;
  reasons: string[];
}

/**
 * Per-user KYC access diagnostic. Calls the kyc_access_diagnostic RPC and
 * shows the exact reason why a user is or is not trade-eligible.
 *
 * Used in the admin KYC review console so admins can instantly see why a
 * user cannot trade after "approval" (e.g., is_legacy=true, version<2,
 * approved before cutoff, or a missing pillar).
 */
export function KYCAccessDiagnostic({ userId, compact = false }: KYCAccessDiagnosticProps) {
  const [data, setData] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'kyc_access_diagnostic',
      { _user_id: userId },
    );
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }
    setData(rpcData as unknown as DiagnosticResult);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="p-4 text-sm text-destructive">
          Failed to load diagnostic: {error ?? 'unknown'}
        </CardContent>
      </Card>
    );
  }

  const allowed = data.can_trade;

  return (
    <Card
      className={cn(
        'overflow-hidden border-2',
        allowed
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : 'border-amber-500/40 bg-amber-500/5',
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            {allowed ? (
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-amber-600" />
            )}
            KYC Access Check
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={load}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Re-check
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div
          className={cn(
            'rounded-md px-3 py-2 text-sm font-medium border',
            allowed
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300',
          )}
        >
          {data.reason}
        </div>

        {/* Capability grid */}
        <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
          <CapabilityChip label="Trade" allowed={data.can_trade} />
          <CapabilityChip label="Withdraw" allowed={data.can_withdraw} />
          <CapabilityChip label="Transfer" allowed={data.can_transfer} />
          <CapabilityChip label="Migrate" allowed={data.can_migrate} />
        </div>

        {/* Detailed flags */}
        {!compact && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-2 border-t border-border/50">
            <Flag label="Documents" value={data.documents_status} />
            <Flag label="Face" value={data.face_status} />
            <Flag label="Mobile" value={data.mobile_status} />
            <Flag label="Final" value={data.final_status} />
            <Flag
              label="Legacy"
              value={data.is_legacy ? 'YES (blocking)' : 'No'}
              danger={!!data.is_legacy}
            />
            <Flag
              label="Version"
              value={String(data.kyc_version ?? 0)}
              danger={(data.kyc_version ?? 0) < 2}
            />
          </div>
        )}

        {!allowed && data.reasons?.length > 0 && (
          <div className="rounded-md bg-background/60 border border-border p-3 space-y-1">
            <p className="text-[11px] font-bold uppercase text-muted-foreground tracking-wide flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Blocking reasons
            </p>
            <ul className="text-xs space-y-0.5">
              {data.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-600 mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CapabilityChip({ label, allowed }: { label: string; allowed: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-1 rounded-md border px-2 py-1.5 text-xs font-medium',
        allowed
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-muted bg-muted/40 text-muted-foreground',
      )}
    >
      <span>{label}</span>
      {allowed ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}
    </div>
  );
}

function Flag({
  label,
  value,
  danger,
}: {
  label: string;
  value: string | null | undefined;
  danger?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground uppercase tracking-wide font-semibold">
        {label}
      </span>
      <Badge
        variant="outline"
        className={cn(
          'mt-0.5 justify-start font-mono text-[10px] truncate',
          danger && 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300',
        )}
      >
        {value || '—'}
      </Badge>
    </div>
  );
}
