import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, Users, Trophy, TrendingUp, ShoppingCart, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { TrustWalletTransaction } from './TrustWalletHistoryItem';

interface TransactionDetailSheetProps {
  transaction: TrustWalletTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getTransactionIcon = (subtype: string | undefined, isCredit: boolean) => {
  if (subtype?.includes('_commission')) return Users;
  if (subtype === 'vip_milestone_reward' || subtype === 'team_building_bonus') return Trophy;
  if (subtype === 'ad_watch_reward' || subtype === 'subscription_daily_mining') return TrendingUp;
  if (subtype === 'purchase_bonus' || subtype === 'badge_purchase') return ShoppingCart;
  if (subtype === 'transfer_out') return ArrowUpRight;
  if (subtype === 'transfer_in') return ArrowDownLeft;
  return isCredit ? ArrowDownLeft : ArrowUpRight;
};

const renderContextSpecificDetails = (transaction: TrustWalletTransaction) => {
  const metadata = transaction.metadata || {};
  const subtype = transaction.transaction_subtype;

  // Referral Commission Details
  if (subtype?.includes('_commission')) {
    const level = subtype.match(/l(\d+)_commission/)?.[1];
    return (
      <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" />
          Referral Commission Details
        </h3>
        {level && <DetailRow label="Commission Level" value={`Level ${level}`} />}
        {metadata.referee_name && <DetailRow label="From Referee" value={metadata.referee_name} />}
        {metadata.referee_badge && <DetailRow label="Referee Badge" value={metadata.referee_badge} />}
        {metadata.qualifying_purchase && (
          <DetailRow label="Qualifying Purchase" value={`${metadata.qualifying_purchase} BSK`} />
        )}
        {metadata.commission_rate && (
          <DetailRow label="Commission Rate" value={`${metadata.commission_rate}%`} />
        )}
      </div>
    );
  }

  // VIP Milestone Details
  if (subtype === 'vip_milestone_reward') {
    return (
      <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
        <h3 className="font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          VIP Milestone Reward
        </h3>
        {metadata.milestone_level && <DetailRow label="Milestone Level" value={metadata.milestone_level} />}
        {metadata.team_size && <DetailRow label="Team Size" value={metadata.team_size} />}
        {metadata.reward_type && <DetailRow label="Reward Type" value={metadata.reward_type} />}
      </div>
    );
  }

  // Ad Mining Details
  if (subtype === 'ad_watch_reward' || subtype === 'subscription_daily_mining') {
    return (
      <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
        <h3 className="font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Mining Details
        </h3>
        {subtype === 'ad_watch_reward' && metadata.ad_id && (
          <DetailRow label="Ad Campaign" value={metadata.ad_id} />
        )}
        {subtype === 'subscription_daily_mining' && metadata.subscription_tier && (
          <DetailRow label="Subscription Tier" value={metadata.subscription_tier} />
        )}
        {metadata.mining_date && (
          <DetailRow label="Mining Date" value={format(new Date(metadata.mining_date), 'PPP')} />
        )}
      </div>
    );
  }

  // Transfer Details
  if (subtype === 'transfer_out' || subtype === 'transfer_in') {
    return (
      <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
        <h3 className="font-semibold flex items-center gap-2">
          {subtype === 'transfer_out' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
          Transfer Details
        </h3>
        {metadata.transfer_id && <DetailRow label="Transfer ID" value={metadata.transfer_id} />}
        {metadata.recipient_name && <DetailRow label="Recipient" value={metadata.recipient_name} />}
        {metadata.sender_name && <DetailRow label="Sender" value={metadata.sender_name} />}
        {transaction.notes && <DetailRow label="Transfer Note" value={transaction.notes} />}
      </div>
    );
  }

  // Purchase Details
  if (subtype === 'purchase_bonus' || subtype === 'badge_purchase') {
    return (
      <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
        <h3 className="font-semibold flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Purchase Details
        </h3>
        {metadata.purchase_amount && (
          <DetailRow label="Purchase Amount" value={`₹${metadata.purchase_amount}`} />
        )}
        {metadata.bonus_percent && (
          <DetailRow label="Bonus Rate" value={`${metadata.bonus_percent}%`} />
        )}
        {metadata.badge_name && <DetailRow label="Badge" value={metadata.badge_name} />}
        {metadata.campaign_name && <DetailRow label="Campaign" value={metadata.campaign_name} />}
      </div>
    );
  }

  return null;
};

export function TransactionDetailSheet({ transaction, open, onOpenChange }: TransactionDetailSheetProps) {
  if (!transaction) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const Icon = getTransactionIcon(transaction.transaction_subtype, transaction.is_credit);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${transaction.is_credit ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <Icon className={`h-5 w-5 ${transaction.is_credit ? 'text-success' : 'text-destructive'}`} />
            </div>
            Transaction Details
          </SheetTitle>
          <SheetDescription>
            {transaction.description}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Amount Section */}
          <div className="text-center py-8 border rounded-lg bg-gradient-to-br from-background to-muted/20">
            <p className="text-sm text-muted-foreground mb-2">Amount</p>
            <p className={`text-5xl font-bold ${transaction.is_credit ? 'text-success' : 'text-destructive'}`}>
              {transaction.is_credit ? '+' : '-'}{Math.abs(transaction.amount).toFixed(2)}
            </p>
            <p className="text-muted-foreground text-sm mt-1">BSK</p>
            
            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge variant={transaction.balance_type === 'withdrawable' ? 'default' : 'secondary'}>
                {transaction.balance_type === 'withdrawable' ? 'Withdrawable' : 'Holding'}
              </Badge>
              <Badge variant="outline">
                {transaction.is_credit ? 'Credit' : 'Debit'}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Context-Specific Details */}
          {renderContextSpecificDetails(transaction)}

          {/* General Transaction Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Transaction Information
            </h3>
            
            {transaction.sender_recipient && (
              <DetailRow
                label={transaction.is_credit ? 'From' : 'To'}
                value={transaction.sender_recipient}
              />
            )}

            <DetailRow
              label="Date & Time"
              value={format(new Date(transaction.created_at), 'PPpp')}
            />

            <DetailRow
              label="Balance After"
              value={`${transaction.balance_after.toFixed(2)} BSK`}
            />

            {transaction.transaction_subtype && (
              <DetailRow
                label="Transaction Subtype"
                value={transaction.transaction_subtype}
              />
            )}

            {transaction.notes && (
              <DetailRow
                label="Notes"
                value={transaction.notes}
              />
            )}

            <DetailRow
              label="Transaction ID"
              value={
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs truncate max-w-[180px]">
                    {transaction.transaction_id || transaction.id}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(transaction.transaction_id || transaction.id)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              }
            />
          </div>

          {/* Additional Metadata */}
          {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                  Additional Details
                </h3>
                <div className="space-y-2">
                  {Object.entries(transaction.metadata)
                    .filter(([key]) => ![
                      'user_id', 'created_at', 'updated_at', 'from_user_id', 'to_user_id',
                      'referee_name', 'referrer_name', 'transaction_id', 'reference_id'
                    ].includes(key))
                    .map(([key, value]) => (
                      <DetailRow
                        key={key}
                        label={key.split('_').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                        value={typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      />
                    ))}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => copyToClipboard(transaction.transaction_id || transaction.id)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy ID
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                toast.info('Receipt download coming soon');
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Receipt
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}
