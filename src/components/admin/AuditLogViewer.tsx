import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileText, User, DollarSign, Shield, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export function AuditLogViewer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string | null>(null);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', searchQuery, eventTypeFilter],
    queryFn: async () => {
      let query = supabase
        .from('insurance_bsk_ledger')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (eventTypeFilter) {
        query = query.eq('type', eventTypeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const eventTypes = [
    { value: 'insurance_claim', label: 'Insurance Claims', icon: Shield },
    { value: 'ad_subscription', label: 'Ad Subscriptions', icon: FileText },
    { value: 'referral_commission', label: 'Referrals', icon: User },
    { value: 'admin_adjustment', label: 'Admin Actions', icon: DollarSign },
  ];

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'insurance_claim': return 'bg-blue-500/10 text-blue-500';
      case 'ad_subscription': return 'bg-green-500/10 text-green-500';
      case 'referral_commission': return 'bg-purple-500/10 text-purple-500';
      case 'admin_adjustment': return 'bg-orange-500/10 text-orange-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredLogs = logs?.filter(log => {
      if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.plan_type?.toLowerCase().includes(search) ||
      log.type?.toLowerCase().includes(search) ||
      log.id?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-sm text-muted-foreground">
            View all BSK transactions and system events
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={eventTypeFilter === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setEventTypeFilter(null)}
              >
                All Events
              </Button>
              {eventTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    variant={eventTypeFilter === type.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEventTypeFilter(type.value)}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {type.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Recent Activity ({filteredLogs?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredLogs && filteredLogs.length > 0 ? (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={getEventTypeColor(log.type)}>
                          {log.type.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{log.plan_type || 'Transaction'}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>ID: {log.id?.substring(0, 8)}...</span>
                        <span className={log.bsk_amount >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {log.bsk_amount >= 0 ? '+' : ''}{log.bsk_amount} BSK
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No audit logs found</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
