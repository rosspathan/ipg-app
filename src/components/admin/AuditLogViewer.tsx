import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileText, User, DollarSign, Shield, RefreshCw, LogIn, ShoppingCart, Send, Key } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export function AuditLogViewer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', searchQuery, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (actionFilter) {
        query = query.eq('action', actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const actionTypes = [
    { value: 'login', label: 'User Logins', icon: LogIn },
    { value: 'purchase', label: 'Purchases', icon: ShoppingCart },
    { value: 'withdrawal', label: 'Withdrawals', icon: Send },
    { value: 'transfer', label: 'Transfers', icon: User },
    { value: 'admin_action', label: 'Admin Actions', icon: Shield },
    { value: 'api_access', label: 'API Access', icon: Key },
  ];

  const getActionColor = (action: string) => {
    if (action.includes('login') || action.includes('auth')) return 'bg-blue-500/10 text-blue-500';
    if (action.includes('purchase') || action.includes('deposit')) return 'bg-green-500/10 text-green-500';
    if (action.includes('withdrawal') || action.includes('withdraw')) return 'bg-orange-500/10 text-orange-500';
    if (action.includes('transfer') || action.includes('send')) return 'bg-purple-500/10 text-purple-500';
    if (action.includes('admin') || action.includes('update')) return 'bg-red-500/10 text-red-500';
    return 'bg-muted text-muted-foreground';
  };

  const filteredLogs = logs?.filter(log => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.action?.toLowerCase().includes(search) ||
      log.resource_type?.toLowerCase().includes(search) ||
      log.resource_id?.toLowerCase().includes(search) ||
      log.user_id?.toLowerCase().includes(search)
    );
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-sm text-muted-foreground">
            View all system activities and user actions
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
                placeholder="Search by action, resource, or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={actionFilter === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActionFilter(null)}
              >
                All Actions
              </Button>
              {actionTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <Button
                    key={type.value}
                    variant={actionFilter === type.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActionFilter(type.value)}
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
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getActionColor(log.action)}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {log.resource_type}: {log.resource_id || 'N/A'}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">User ID:</span>
                            <code 
                              className="bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted/70"
                              onClick={() => copyToClipboard(log.user_id, 'User ID')}
                            >
                              {log.user_id.substring(0, 8)}...
                            </code>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Log ID:</span>
                            <code 
                              className="bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted/70"
                              onClick={() => copyToClipboard(log.id, 'Log ID')}
                            >
                              {log.id.substring(0, 8)}...
                            </code>
                          </div>
                          
                          {log.ip_address && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">IP:</span>
                              <span>{String(log.ip_address)}</span>
                            </div>
                          )}
                          
                          {log.user_agent && (
                            <div className="flex items-center gap-1 col-span-2">
                              <span className="font-medium">User Agent:</span>
                              <span className="truncate">{log.user_agent}</span>
                            </div>
                          )}
                        </div>

                        {/* Show old and new values if available */}
                        {(log.old_values || log.new_values) && (
                          <div className="mt-2 p-2 bg-muted/50 rounded space-y-1">
                            {log.old_values && (
                              <div className="text-xs">
                                <span className="font-medium text-red-600 dark:text-red-400">Old: </span>
                                <code className="text-muted-foreground">{JSON.stringify(log.old_values)}</code>
                              </div>
                            )}
                            {log.new_values && (
                              <div className="text-xs">
                                <span className="font-medium text-green-600 dark:text-green-400">New: </span>
                                <code className="text-muted-foreground">{JSON.stringify(log.new_values)}</code>
                              </div>
                            )}
                          </div>
                        )}
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
