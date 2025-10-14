import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrdersList } from '@/components/trading/OrdersList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';

export default function AdminTradingOrders() {
  const { data: allOrders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const pendingOrders = allOrders?.filter(o => o.status === 'pending') || [];
  const filledOrders = allOrders?.filter(o => o.status === 'filled') || [];
  const cancelledOrders = allOrders?.filter(o => o.status === 'cancelled') || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Trading Orders</h1>
        <p className="text-muted-foreground">Manage all user trading orders</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Filled Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{filledOrders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelled Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{cancelledOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({allOrders?.length || 0})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingOrders.length})</TabsTrigger>
              <TabsTrigger value="filled">Filled ({filledOrders.length})</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled ({cancelledOrders.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <OrdersList orders={allOrders as any} showCancelButton={false} />
            </TabsContent>

            <TabsContent value="pending">
              <OrdersList orders={pendingOrders as any} showCancelButton={false} />
            </TabsContent>

            <TabsContent value="filled">
              <OrdersList orders={filledOrders as any} showCancelButton={false} />
            </TabsContent>

            <TabsContent value="cancelled">
              <OrdersList orders={cancelledOrders as any} showCancelButton={false} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
