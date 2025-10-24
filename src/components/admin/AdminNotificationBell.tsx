import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export const AdminNotificationBell = () => {
  const [notificationCount, setNotificationCount] = useState(0);

  const { data: pendingTransactions, refetch } = useQuery({
    queryKey: ['pending-transactions-count'],
    queryFn: async () => {
      const { data: stats } = await supabase.rpc('get_transaction_stats');
      if (!stats) return null;
      
      const total = (stats as any).pending_deposits_count + (stats as any).pending_withdrawals_count;
      setNotificationCount(total);
      
      // Fetch recent pending items for display
      const { data: deposits } = await supabase
        .from('fiat_deposits')
        .select('id, amount, created_at, user_id')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: cryptoToInr } = await supabase
        .from('crypto_to_inr_requests')
        .select('id, net_inr_credit, created_at, user_id')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: withdrawals } = await supabase
        .from('fiat_withdrawals')
        .select('id, amount, created_at, user_id')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        deposits: deposits || [],
        cryptoToInr: cryptoToInr || [],
        withdrawals: withdrawals || [],
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Show desktop notification for new transactions
  useEffect(() => {
    if (notificationCount > 0 && 'Notification' in window && Notification.permission === 'granted') {
      // This would need more sophisticated logic to only notify on NEW transactions
      // For now, it's just a placeholder
    }
  }, [notificationCount]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Pending Approvals</h4>
          
          {notificationCount === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pending transactions
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {/* INR Deposits */}
                {pendingTransactions?.deposits.map((deposit) => (
                  <div 
                    key={`deposit-${deposit.id}`}
                    className="p-3 rounded-lg bg-accent/50 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => window.location.href = '/app/admin/funding#inr-deposits'}
                  >
                    <p className="text-sm font-medium">New INR Deposit</p>
                    <p className="text-xs text-muted-foreground">
                      ₹{deposit.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(deposit.created_at), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                ))}

                {/* Crypto to INR */}
                {pendingTransactions?.cryptoToInr.map((request) => (
                  <div 
                    key={`crypto-inr-${request.id}`}
                    className="p-3 rounded-lg bg-accent/50 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => window.location.href = '/app/admin/funding#crypto-inr'}
                  >
                    <p className="text-sm font-medium">Crypto→INR Deposit</p>
                    <p className="text-xs text-muted-foreground">
                      ₹{request.net_inr_credit.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(request.created_at), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                ))}

                {/* Withdrawals */}
                {pendingTransactions?.withdrawals.map((withdrawal) => (
                  <div 
                    key={`withdrawal-${withdrawal.id}`}
                    className="p-3 rounded-lg bg-accent/50 hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => window.location.href = '/app/admin/funding#inr-withdrawals'}
                  >
                    <p className="text-sm font-medium">INR Withdrawal</p>
                    <p className="text-xs text-muted-foreground">
                      ₹{withdrawal.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(withdrawal.created_at), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
