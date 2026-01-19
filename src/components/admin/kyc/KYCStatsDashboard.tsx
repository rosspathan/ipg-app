import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck, FileX, Clock, Users, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KYCStatsDashboardProps {
  onRefresh?: () => void;
}

export function KYCStatsDashboard({ onRefresh }: KYCStatsDashboardProps) {
  const { data: stats, refetch, isRefetching } = useQuery({
    queryKey: ['kyc-stats-deduplicated'],
    queryFn: async () => {
      // Use the deduplicated view for accurate stats (one row per user)
      const { data, error } = await supabase
        .from('kyc_admin_summary')
        .select('status');

      if (error) throw error;

      const pending = data.filter(s => 
        s.status === 'submitted' || s.status === 'pending' || s.status === 'in_review'
      ).length;
      const approved = data.filter(s => s.status === 'approved').length;
      const rejected = data.filter(s => s.status === 'rejected').length;
      const total = data.length;

      return { pending, approved, rejected, total };
    },
    refetchInterval: 30000,
  });

  const handleRefresh = () => {
    refetch();
    onRefresh?.();
  };

  const cards = [
    {
      title: 'Pending Review',
      value: stats?.pending || 0,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-l-amber-500',
    },
    {
      title: 'Approved',
      value: stats?.approved || 0,
      icon: FileCheck,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-l-emerald-500',
    },
    {
      title: 'Rejected',
      value: stats?.rejected || 0,
      icon: FileX,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-l-red-500',
    },
    {
      title: 'Total Users',
      value: stats?.total || 0,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-l-primary',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">KYC Statistics</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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
              <p className="text-xs text-muted-foreground mt-1">
                {card.title === 'Total Users' ? 'Unique users submitted' : 'submissions'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
