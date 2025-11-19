import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useCreatePurchaseOffer, CreateOfferInput } from '@/hooks/useAdminPurchaseOffers';
import { Plus } from 'lucide-react';

export const OfferCreationDialog = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateOfferInput>({
    campaign_name: '',
    description: '',
    purchase_amount_bsk: 1000,
    withdrawable_bonus_percent: 50,
    holding_bonus_percent: 50,
    start_at: new Date().toISOString().slice(0, 16),
    end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    is_featured: false,
    display_order: 0,
  });

  const createMutation = useCreatePurchaseOffer();

  const handleWithdrawableChange = (value: number[]) => {
    const withdrawable = value[0];
    setFormData(prev => ({
      ...prev,
      withdrawable_bonus_percent: withdrawable,
      holding_bonus_percent: 100 - withdrawable,
    }));
  };

  const handleSubmit = () => {
    createMutation.mutate(formData, {
      onSuccess: () => {
        setOpen(false);
        setFormData({
          campaign_name: '',
          description: '',
          purchase_amount_bsk: 1000,
          withdrawable_bonus_percent: 50,
          holding_bonus_percent: 50,
          start_at: new Date().toISOString().slice(0, 16),
          end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
          is_featured: false,
          display_order: 0,
        });
      },
    });
  };

  const totalBonus = formData.withdrawable_bonus_percent + formData.holding_bonus_percent;
  const totalReceived = (formData.purchase_amount_bsk * totalBonus) / 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Offer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Purchase Offer</DialogTitle>
          <DialogDescription>
            Configure a new one-time purchase offer with bonus rewards
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="campaign_name">Campaign Name *</Label>
            <Input
              id="campaign_name"
              value={formData.campaign_name}
              onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
              placeholder="e.g., New Year Special"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Offer details..."
              rows={2}
            />
          </div>

          {/* Purchase Amount */}
          <div className="space-y-2">
            <Label htmlFor="purchase_amount_bsk">Purchase Amount (BSK) *</Label>
            <Input
              id="purchase_amount_bsk"
              type="number"
              min="1"
              value={formData.purchase_amount_bsk}
              onChange={(e) => setFormData({ ...formData, purchase_amount_bsk: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              ≈ ₹{(formData.purchase_amount_bsk * 85).toLocaleString('en-IN')}
            </p>
          </div>

          {/* Bonus Split */}
          <div className="space-y-4 p-4 bg-accent/10 rounded-lg border">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Bonus Split (must total 100%)</Label>
                <span className={`text-sm font-medium ${totalBonus === 100 ? 'text-success' : 'text-destructive'}`}>
                  Total: {totalBonus}%
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Withdrawable Bonus</span>
                  <span className="font-semibold text-success">{formData.withdrawable_bonus_percent}%</span>
                </div>
                <Slider
                  value={[formData.withdrawable_bonus_percent]}
                  onValueChange={handleWithdrawableChange}
                  max={100}
                  step={5}
                  className="my-4"
                />
                <div className="flex items-center justify-between text-sm">
                  <span>Holding Bonus</span>
                  <span className="font-semibold text-primary">{formData.holding_bonus_percent}%</span>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="pt-3 border-t space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">User pays:</span>
                <span className="font-semibold">{formData.purchase_amount_bsk.toLocaleString()} BSK</span>
              </div>
              <div className="flex justify-between text-success">
                <span>Withdrawable bonus:</span>
                <span className="font-semibold">
                  +{((formData.purchase_amount_bsk * formData.withdrawable_bonus_percent) / 100).toLocaleString()} BSK
                </span>
              </div>
              <div className="flex justify-between text-primary">
                <span>Holding bonus:</span>
                <span className="font-semibold">
                  +{((formData.purchase_amount_bsk * formData.holding_bonus_percent) / 100).toLocaleString()} BSK
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t font-semibold">
                <span>Total bonus:</span>
                <span className="text-accent-foreground">+{totalReceived.toLocaleString()} BSK</span>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_at">Start Date & Time *</Label>
              <Input
                id="start_at"
                type="datetime-local"
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_at">End Date & Time *</Label>
              <Input
                id="end_at"
                type="datetime-local"
                value={formData.end_at}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
              />
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_featured">Featured Offer</Label>
                <p className="text-xs text-muted-foreground">Highlight this offer at the top</p>
              </div>
              <Switch
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                min="0"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || totalBonus !== 100 || !formData.campaign_name}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Offer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
