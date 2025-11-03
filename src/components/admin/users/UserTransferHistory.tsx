import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminBSKTransfers } from "@/hooks/useAdminBSKTransfers";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserTransferHistoryProps {
  userId: string;
}

export function UserTransferHistory({ userId }: UserTransferHistoryProps) {
  const { data, isLoading } = useAdminBSKTransfers({ userId }, 1, 20);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transfer_in':
        return 'bg-success/10 text-success border-success/20';
      case 'transfer_out':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'admin_credit':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'admin_debit':
        return 'bg-danger/10 text-danger border-danger/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'transfer_in':
        return 'Received';
      case 'transfer_out':
        return 'Sent';
      case 'admin_credit':
        return 'Admin Credit';
      case 'admin_debit':
        return 'Admin Debit';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading transfer history...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.transfers.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No transfer history found for this user
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSent = data.transfers
    .filter(t => t.transaction_type === 'transfer_out')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const totalReceived = data.transfers
    .filter(t => t.transaction_type === 'transfer_in' || t.transaction_type === 'admin_credit')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer History</CardTitle>
        <div className="flex gap-4 mt-4">
          <div className="flex-1 p-3 bg-muted/20 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground mb-1">Total Sent</div>
            <div className="text-lg font-semibold text-foreground">
              {totalSent.toLocaleString()} BSK
            </div>
          </div>
          <div className="flex-1 p-3 bg-muted/20 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground mb-1">Total Received</div>
            <div className="text-lg font-semibold text-foreground">
              {totalReceived.toLocaleString()} BSK
            </div>
          </div>
          <div className="flex-1 p-3 bg-muted/20 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground mb-1">Net Transfer</div>
            <div className="text-lg font-semibold text-foreground">
              {(totalReceived - totalSent).toLocaleString()} BSK
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.transfers.map((transfer: any) => (
            <div
              key={transfer.id}
              className="flex items-center justify-between p-3 bg-muted/10 rounded-lg border border-border hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={transfer.sender?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {transfer.sender?.display_name?.[0] || transfer.sender?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {transfer.sender?.display_name || 'Unknown User'}
                    </span>
                    <Badge className={getTypeColor(transfer.transaction_type)}>
                      {getTypeLabel(transfer.transaction_type)}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(transfer.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-foreground">
                  {Number(transfer.amount).toLocaleString()} BSK
                </div>
                <div className="text-xs text-muted-foreground">
                  {transfer.balance_type || 'N/A'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
