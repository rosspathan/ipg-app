import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck, FileX, Clock, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KYCStatsDashboardProps {
  stats: { total: number; pending: number; approved: number; rejected: number };
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function KYCStatsDashboard({ stats, onRefresh, isRefreshing }: KYCStatsDashboardProps) {
  const cards = [
    {
      title: 'Total KYC Requests',
      value: stats.total,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-l-primary',
      hint: 'Unique users submitted',
    },
    {
      title: 'Pending Review',
      value: stats.pending,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-l-amber-500',
      hint: 'Awaiting admin action',
    },
    {
      title: 'Approved',
      value: stats.approved,
      icon: FileCheck,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-l-emerald-500',
      hint: 'Verified users',
    },
    {
      title: 'Rejected',
      value: stats.rejected,
      icon: FileX,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-l-red-500',
      hint: 'Declined / resubmission needed',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">KYC Statistics</h2>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className={`border-l-4 ${card.borderColor}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
