import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Copy, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { OfferPurchaseClaim } from '@/hooks/useAdminOfferPurchaseHistory';

interface PurchaseClaimDetailModalProps {
  claim: OfferPurchaseClaim;
  open: boolean;
  onClose: () => void;
}

export function PurchaseClaimDetailModal({
  claim,
  open,
  onClose,
}: PurchaseClaimDetailModalProps) {
  const navigate = useNavigate();
  const totalBonus = claim.withdrawable_bonus_bsk + claim.holding_bonus_bsk;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Purchase Claim Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Profile */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              User Profile
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(claim.user_id, 'User ID')}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Name</div>
                <div className="font-medium">{claim.user_full_name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Email</div>
                <div className="font-medium">{claim.user_email || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Phone</div>
                <div className="font-medium">{claim.user_phone || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">User ID</div>
                <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                  {claim.user_id}
                </code>
              </div>
            </div>
          </Card>

          {/* Offer Details */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Offer Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Campaign</div>
                <div className="font-medium">{claim.campaign_name}</div>
              </div>
              {claim.offer_description && (
                <div>
                  <div className="text-xs text-muted-foreground">Description</div>
                  <div className="text-muted-foreground">{claim.offer_description}</div>
                </div>
              )}
              <div className="flex gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Withdrawable Bonus</div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                    {claim.withdrawable_bonus_percent}%
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Holding Bonus</div>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                    {claim.holding_bonus_percent}%
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Transaction Details */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Transaction Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Claimed At</div>
                <div className="font-medium">
                  {format(new Date(claim.claimed_at), 'MMMM d, yyyy - h:mm a')}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Order ID</div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {claim.order_id}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(claim.order_id, 'Order ID')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Financial Breakdown */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <h3 className="font-semibold mb-4">Financial Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Purchase Amount</span>
                <span className="font-mono font-medium">
                  {claim.purchase_amount_bsk.toFixed(2)} BSK
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Promotional Refund</span>
                <span className="font-mono font-medium text-green-600">
                  +{claim.purchase_amount_bsk.toFixed(2)} BSK
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  Withdrawable Bonus ({claim.withdrawable_bonus_percent}%)
                </span>
                <span className="font-mono font-medium text-green-600">
                  +{claim.withdrawable_bonus_bsk.toFixed(2)} BSK
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  Holding Bonus ({claim.holding_bonus_percent}%)
                </span>
                <span className="font-mono font-medium text-blue-600">
                  +{claim.holding_bonus_bsk.toFixed(2)} BSK
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-semibold">Net Result</span>
                <div className="text-right">
                  <div className="font-mono font-bold text-lg text-primary">
                    +{totalBonus.toFixed(2)} BSK
                  </div>
                  <div className="text-xs text-muted-foreground">
                    (Zero cost to user)
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigate(`/admin/users?search=${claim.user_email}`);
                onClose();
              }}
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              View User Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigate(`/admin/one-time-offers`);
                onClose();
              }}
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              View Offer Dashboard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
