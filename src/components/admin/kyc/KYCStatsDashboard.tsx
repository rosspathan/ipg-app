import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileCheck, FileX, Clock, TrendingUp } from 'lucide-react';

export function KYCStatsDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['kyc-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kyc_profiles_new')
        .select('status');

      if (error) throw error;

      const pending = data.filter(s => s.status === 'submitted' || s.status === 'pending').length;
      const approved = data.filter(s => s.status === 'approved').length;
      const rejected = data.filter(s => s.status === 'rejected').length;
      const total = data.length;

      return { pending, approved, rejected, total };
    },
    refetchInterval: 30000, // Refetch every 30s
  });

  const cards = [
    {
      title: 'Pending Review',
      value: stats?.pending || 0,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Approved',
      value: stats?.approved || 0,
      icon: FileCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Rejected',
      value: stats?.rejected || 0,
      icon: FileX,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Total Submissions',
      value: stats?.total || 0,
      icon: TrendingUp,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
