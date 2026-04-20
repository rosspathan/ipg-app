import { useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Search,
  ShieldCheck,
  CalendarDays,
  CalendarRange,
  CalendarCheck2,
  User as UserIcon,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useVerifiedKYCUsers, VerifiedKYCUser } from '@/hooks/useVerifiedKYCUsers';
import { KYCAccessDiagnostic } from './KYCAccessDiagnostic';
import { KYCDocumentViewer } from './KYCDocumentViewer';
import { cn } from '@/lib/utils';

export function VerifiedUsersPanel() {
  const { data, isLoading, refetch, isRefetching } = useVerifiedKYCUsers();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<VerifiedKYCUser | null>(null);

  const stats = data?.stats ?? { total: 0, today: 0, this_week: 0, this_month: 0 };

  const filtered = useMemo(() => {
    if (!data?.users) return [];
    if (!search.trim()) return data.users;
    const q = search.toLowerCase();
    return data.users.filter((u) => {
      const haystack = [
        u.full_name_computed,
        u.email_computed,
        u.profile_email,
        u.display_name,
        u.username,
        u.phone_computed,
        u.user_id,
        u.data_json?.full_name,
        u.data_json?.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data?.users, search]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          label="Total Verified"
          value={stats.total}
          icon={ShieldCheck}
          variant="emerald"
        />
        <StatCard label="Today" value={stats.today} icon={CalendarCheck2} variant="blue" />
        <StatCard
          label="This Week"
          value={stats.this_week}
          icon={CalendarRange}
          variant="violet"
        />
        <StatCard
          label="This Month"
          value={stats.this_month}
          icon={CalendarDays}
          variant="amber"
        />
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search verified users by name, email, phone, username, or user id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn('h-4 w-4', isRefetching && 'animate-spin')} />
        </Button>
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              {search ? 'No verified users match your search.' : 'No fully-verified users yet.'}
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((u) => (
                <VerifiedUserRow key={u.id} user={u} onView={() => setSelected(u)} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto p-0"
        >
          {selected && <VerifiedUserDetail user={selected} onClose={() => setSelected(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number;
  icon: any;
  variant: 'emerald' | 'blue' | 'violet' | 'amber';
}) {
  const colours: Record<string, string> = {
    emerald:
      'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300',
    blue: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300',
    violet:
      'border-violet-500/30 bg-violet-500/5 text-violet-700 dark:text-violet-300',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
  };
  return (
    <Card className={cn('border-2', colours[variant])}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] uppercase tracking-wide font-semibold opacity-80">
            {label}
          </span>
          <Icon className="h-4 w-4 opacity-70" />
        </div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function VerifiedUserRow({
  user,
  onView,
}: {
  user: VerifiedKYCUser;
  onView: () => void;
}) {
  const fullName =
    user.full_name_computed ||
    user.display_name ||
    user.data_json?.full_name ||
    'Unknown User';
  const email = user.profile_email || user.email_computed || user.data_json?.email || '';
  const phone = user.phone_computed || user.data_json?.phone || '';
  const selfie = user.data_json?.selfie_url || user.data_json?.documents?.selfie || '';
  const approvedAt = user.final_approved_at;

  return (
    <li className="p-3 sm:p-4 hover:bg-accent/30 transition-colors">
      <div className="flex items-start gap-3">
        <Avatar className="h-11 w-11 border border-border shrink-0">
          <AvatarImage src={selfie} alt={fullName} className="object-cover" />
          <AvatarFallback className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            <UserIcon className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate text-sm">{fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{email || '—'}</p>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[10px]"
            >
              <ShieldCheck className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {phone && <span>📱 {phone}</span>}
            {approvedAt && (
              <span title={format(new Date(approvedAt), 'PPpp')}>
                ✅ {formatDistanceToNow(new Date(approvedAt), { addSuffix: true })}
              </span>
            )}
            <span className="font-mono opacity-70">{user.user_id.slice(0, 8)}…</span>
          </div>

          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={onView}
            >
              <Eye className="h-3 w-3 mr-1" />
              View Full KYC
            </Button>
          </div>
        </div>
      </div>
    </li>
  );
}

function VerifiedUserDetail({
  user,
  onClose,
}: {
  user: VerifiedKYCUser;
  onClose: () => void;
}) {
  const fullName =
    user.full_name_computed ||
    user.display_name ||
    user.data_json?.full_name ||
    'Unknown User';
  const email = user.profile_email || user.email_computed || user.data_json?.email || '';
  const phone = user.phone_computed || user.data_json?.phone || '';

  return (
    <div>
      <SheetHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b p-4">
        <SheetTitle className="text-base sm:text-lg pr-8 truncate">
          {fullName}
        </SheetTitle>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
      </SheetHeader>

      <div className="p-4 space-y-4">
        {/* KYC Access Diagnostic — proves trading is unlocked */}
        <KYCAccessDiagnostic userId={user.user_id} />

        {/* Profile summary */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Profile
            </h3>
            <DetailRow label="Full Name" value={fullName} />
            <DetailRow label="Email" value={email} />
            <DetailRow label="Phone" value={phone} />
            <DetailRow label="Username" value={user.username || '—'} />
            <DetailRow label="User ID" value={user.user_id} mono />
            <DetailRow
              label="Date of Birth"
              value={user.data_json?.date_of_birth || '—'}
            />
            <DetailRow
              label="Nationality"
              value={user.data_json?.nationality || '—'}
            />
            <DetailRow
              label="Address"
              value={
                [
                  user.data_json?.address_line1,
                  user.data_json?.city,
                  user.data_json?.state,
                  user.data_json?.country,
                  user.data_json?.postal_code,
                ]
                  .filter(Boolean)
                  .join(', ') || '—'
              }
            />
          </CardContent>
        </Card>

        {/* Approval summary */}
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              Final Approval
            </h3>
            <DetailRow label="Final Status" value={user.final_status} />
            <DetailRow
              label="Approved At"
              value={
                user.final_approved_at
                  ? format(new Date(user.final_approved_at), 'PPpp')
                  : '—'
              }
            />
            <DetailRow
              label="Approved By"
              value={user.final_approved_by || '—'}
              mono
            />
          </CardContent>
        </Card>

        {/* Documents/face viewer */}
        <KYCDocumentViewer dataJson={user.data_json || {}} />

        <div className="sticky bottom-0 -mx-4 -mb-4 bg-background/95 backdrop-blur-sm border-t p-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <span className="text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </span>
      <span
        className={cn(
          'col-span-2 break-words',
          mono && 'font-mono text-xs',
        )}
      >
        {value}
      </span>
    </div>
  );
}
