import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HealthCheck {
  name: string;
  status: 'ok' | 'error' | 'warning';
  message: string;
  lastChecked?: Date;
}

export default function AdminSystemHealth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState<HealthCheck[]>([]);

  useEffect(() => {
    runHealthChecks();
  }, []);

  const runHealthChecks = async () => {
    setLoading(true);
    const results: HealthCheck[] = [];

    // 1. Database connectivity
    try {
      const { error } = await supabase.from('profiles').select('count').limit(1);
      results.push({
        name: 'Database (RPC)',
        status: error ? 'error' : 'ok',
        message: error ? error.message : 'Database connection OK',
        lastChecked: new Date()
      });
    } catch (error: any) {
      results.push({
        name: 'Database (RPC)',
        status: 'error',
        message: error.message || 'Connection failed',
        lastChecked: new Date()
      });
    }

    // 2. Storage bucket
    try {
      const { data, error } = await supabase.storage.listBuckets();
      results.push({
        name: 'Storage',
        status: error ? 'error' : 'ok',
        message: error ? error.message : `${data?.length || 0} buckets available`,
        lastChecked: new Date()
      });
    } catch (error: any) {
      results.push({
        name: 'Storage',
        status: 'error',
        message: error.message || 'Storage check failed',
        lastChecked: new Date()
      });
    }

    // 3. SMTP (check if email function exists)
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: { 
          test: true, 
          dryRun: true,
          email: 'test@example.com'
        }
      });
      
      if (error) throw error;
      
      results.push({
        name: 'SMTP (Email)',
        status: 'ok',
        message: 'Email function reachable',
        lastChecked: new Date()
      });
    } catch (error: any) {
      results.push({
        name: 'SMTP (Email)',
        status: 'warning',
        message: 'Email function check failed (may still work)',
        lastChecked: new Date()
      });
    }

    // 4. Auth service
    try {
      const { data, error } = await supabase.auth.getSession();
      results.push({
        name: 'Auth Service',
        status: error ? 'error' : 'ok',
        message: error ? error.message : 'Auth service operational',
        lastChecked: new Date()
      });
    } catch (error: any) {
      results.push({
        name: 'Auth Service',
        status: 'error',
        message: error.message || 'Auth check failed',
        lastChecked: new Date()
      });
    }

    // 5. KYC admin config
    try {
      const { data, error } = await supabase
        .from('kyc_admin_config')
        .select('id')
        .limit(1);
      results.push({
        name: 'KYC Config',
        status: error ? 'error' : 'ok',
        message: error ? error.message : 'KYC config accessible',
        lastChecked: new Date()
      });
    } catch (error: any) {
      results.push({
        name: 'KYC Config',
        status: 'error',
        message: error.message || 'KYC config check failed',
        lastChecked: new Date()
      });
    }

    // 6. System settings
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('count')
        .limit(1);
      results.push({
        name: 'System Settings',
        status: error ? 'error' : 'ok',
        message: error ? error.message : 'System settings accessible',
        lastChecked: new Date()
      });
    } catch (error: any) {
      results.push({
        name: 'System Settings',
        status: 'error',
        message: error.message || 'Settings check failed',
        lastChecked: new Date()
      });
    }

    setChecks(results);
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-success/20 text-success border-success/30">Healthy</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'warning':
        return <Badge variant="secondary">Warning</Badge>;
      default:
        return null;
    }
  };

  const allHealthy = checks.every(c => c.status === 'ok');

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">System Health</span>
          </button>
          <Button onClick={runHealthChecks} disabled={loading} size="sm" variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 pt-6 px-4">
        {/* Overall Status */}
        <Card className={`p-6 border-2 ${
          allHealthy 
            ? 'bg-success/5 border-success/30' 
            : 'bg-destructive/5 border-destructive/30'
        }`}>
          <div className="flex items-center gap-3">
            {allHealthy ? (
              <CheckCircle className="h-8 w-8 text-success" />
            ) : (
              <AlertCircle className="h-8 w-8 text-destructive" />
            )}
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {allHealthy ? 'All Systems Operational' : 'System Issues Detected'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {checks.filter(c => c.status === 'ok').length} / {checks.length} checks passed
              </p>
            </div>
          </div>
        </Card>

        {/* Health Checks */}
        <div className="space-y-3">
          {checks.map((check, idx) => (
            <Card key={idx} className="p-4 bg-card/60 backdrop-blur-xl border-border/40">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(check.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{check.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{check.message}</p>
                    {check.lastChecked && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last checked: {check.lastChecked.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
                {getStatusBadge(check.status)}
              </div>
            </Card>
          ))}
        </div>

        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Running health checks...</p>
          </div>
        )}
      </div>
    </div>
  );
}
