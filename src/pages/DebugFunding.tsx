import { useINRFunding } from '@/hooks/useINRFunding';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw } from 'lucide-react';

const DebugFunding = () => {
  const { status, settings, banks, upis, lastRealtimeEvent, error, refetch } = useINRFunding();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Debug: INR Funding</h1>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Status Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">Current Status:</span>
              <Badge variant={
                status === 'ready' ? 'default' :
                status === 'loading' ? 'secondary' :
                status === 'disabled' ? 'outline' :
                'destructive'
              }>
                {status.toUpperCase()}
              </Badge>
            </div>
            
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                <strong>Error:</strong> {error}
              </div>
            )}
            
            {lastRealtimeEvent && (
              <div className="text-sm text-muted-foreground">
                <strong>Last Realtime Event:</strong> {lastRealtimeEvent}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Settings (fiat_settings_inr)</CardTitle>
          </CardHeader>
          <CardContent>
            {settings ? (
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><strong>ID:</strong> {settings.id}</div>
                  <div><strong>Enabled:</strong> {settings.enabled ? '✅ Yes' : '❌ No'}</div>
                  <div><strong>Min Deposit:</strong> ₹{settings.min_deposit}</div>
                  <div><strong>Fee Percent:</strong> {settings.fee_percent}%</div>
                  <div><strong>Fee Fixed:</strong> ₹{settings.fee_fixed}</div>
                  <div><strong>Updated:</strong> {new Date(settings.updated_at).toLocaleString()}</div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">No settings found</div>
            )}
          </CardContent>
        </Card>

        {/* Bank Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>Bank Accounts ({banks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {banks.length > 0 ? (
              <div className="space-y-4">
                {banks.map((bank) => (
                  <div key={bank.id} className="border rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{bank.label}</span>
                      <div className="flex gap-2">
                        {bank.is_default && <Badge variant="secondary">Default</Badge>}
                        <Badge variant={bank.is_active ? 'default' : 'outline'}>
                          {bank.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                      <div><strong>Bank:</strong> {bank.bank_name}</div>
                      <div><strong>Account:</strong> {bank.account_name}</div>
                      <div><strong>Number:</strong> {bank.account_number}</div>
                      <div><strong>IFSC:</strong> {bank.ifsc}</div>
                      {bank.notes && <div><strong>Notes:</strong> {bank.notes}</div>}
                      <div><strong>Created:</strong> {new Date(bank.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">No bank accounts found</div>
            )}
          </CardContent>
        </Card>

        {/* UPI Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>UPI Accounts ({upis.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {upis.length > 0 ? (
              <div className="space-y-4">
                {upis.map((upi) => (
                  <div key={upi.id} className="border rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{upi.label}</span>
                      <div className="flex gap-2">
                        {upi.is_default && <Badge variant="secondary">Default</Badge>}
                        <Badge variant={upi.is_active ? 'default' : 'outline'}>
                          {upi.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground grid grid-cols-2 gap-2">
                      <div><strong>UPI ID:</strong> {upi.upi_id}</div>
                      <div><strong>Name:</strong> {upi.upi_name}</div>
                      {upi.notes && <div><strong>Notes:</strong> {upi.notes}</div>}
                      <div><strong>Created:</strong> {new Date(upi.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground">No UPI accounts found</div>
            )}
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm font-mono">
            <div><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL || 'https://ocblgldglqhlrmtnynmu.supabase.co'}</div>
            <div><strong>User Agent:</strong> {navigator.userAgent}</div>
            <div><strong>Timestamp:</strong> {new Date().toISOString()}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DebugFunding;