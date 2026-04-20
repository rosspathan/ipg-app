import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileCheck,
  FileX,
  Clock,
  Users,
  RefreshCw,
  CircleDashed,
  ShieldCheck,
  FileText,
  ScanFace,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OverallKYCStats } from '@/lib/kyc/overallStatus';

interface KYCStatsDashboardProps {
  stats: OverallKYCStats;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function KYCStatsDashboard({ stats, onRefresh, isRefreshing }: KYCStatsDashboardProps) {
  const overall = [
    {
      title: 'Total KYC Users',
      value: stats.total,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-l-primary',
      hint: 'Unique users submitted',
    },
    {
      title: 'Pending KYC',
      value: stats.pending,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-l-amber-500',
      hint: 'No pillar approved yet',
    },
    {
      title: 'Partially Approved',
      value: stats.partial,
      icon: CircleDashed,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-l-blue-500',
      hint: 'Some steps approved',
    },
    {
      title: 'Fully Approved',
      value: stats.fully_approved,
      icon: FileCheck,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-l-emerald-500',
      hint: 'Docs + Face + Mobile',
    },
    {
      title: 'Rejected',
      value: stats.rejected,
      icon: FileX,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-l-red-500',
      hint: 'Final decision rejected',
    },
  ];

  const stepCards = [
    {
      title: 'Pending Docs',
      value: stats.pending_docs,
      icon: FileText,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Pending Face',
      value: stats.pending_face,
      icon: ScanFace,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Pending Mobile',
      value: stats.pending_mobile,
      icon: Smartphone,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Ready for Final',
      value: stats.ready_for_final,
      icon: Sparkles,
      color: 'text-violet-600',
      bgColor: 'bg-violet-500/10',
      hint: 'All 3 pillars approved',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overall status row */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Overall KYC Status</h2>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {overall.map((card) => (
            <Card key={card.title} className={`border-l-4 ${card.borderColor}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`p-1.5 rounded-full ${card.bgColor}`}>
                  <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-[11px] text-muted-foreground mt-1">{card.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Step-level row */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Step-Level Queue
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stepCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`p-1.5 rounded-full ${card.bgColor}`}>
                  <card.icon className={`h-3.5 w-3.5 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{card.value}</div>
                {card.hint && (
                  <p className="text-[11px] text-muted-foreground mt-1">{card.hint}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
