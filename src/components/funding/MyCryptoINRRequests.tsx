import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function MyCryptoINRRequests() {
  const { data: requests, isLoading } = useQuery({
    queryKey: ['my-crypto-inr-requests'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('crypto_to_inr_requests')
        .select(`
          *,
          assets:crypto_asset_id(symbol, name, logo_url)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'verifying':
        return <AlertCircle className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'verifying':
        return 'default';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'destructive';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!requests || requests.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No crypto-to-INR requests yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              {request.assets?.logo_url && (
                <img
                  src={request.assets.logo_url}
                  alt={request.assets.symbol}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">
                    {request.crypto_amount} {request.assets?.symbol}
                  </h3>
                  <Badge variant={getStatusColor(request.status) as any}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(request.status)}
                      {request.status}
                    </span>
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>INR Equivalent: ₹{request.inr_equivalent?.toFixed(2)}</p>
                  <p>Net Credit: ₹{request.net_inr_credit?.toFixed(2)}</p>
                  <p>
                    Submitted {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </p>
                  {request.decided_at && (
                    <p>
                      Decided {formatDistanceToNow(new Date(request.decided_at), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right space-y-2">
              {request.tx_hash && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const url = request.network === 'Bitcoin'
                      ? `https://blockchair.com/bitcoin/transaction/${request.tx_hash}`
                      : `https://bscscan.com/tx/${request.tx_hash}`;
                    window.open(url, '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  View TX
                </Button>
              )}
            </div>
          </div>

          {request.admin_notes && (
            <div className="mt-3 p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium mb-1">Admin Notes:</p>
              <p className="text-sm">{request.admin_notes}</p>
            </div>
          )}

          {request.user_notes && (
            <div className="mt-2 text-sm text-muted-foreground">
              <p className="font-medium">Your notes:</p>
              <p>{request.user_notes}</p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
