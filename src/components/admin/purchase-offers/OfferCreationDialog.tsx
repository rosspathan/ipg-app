import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useCreatePurchaseOffer, CreateOfferInput } from '@/hooks/useAdminPurchaseOffers';
import { Plus } from 'lucide-react';

export const OfferCreationDialog = () => {
  const [open, setOpen] = useState(false);
  const [bonusType, setBonusType] = useState<'withdrawable' | 'holding'>('withdrawable');
  const [bonusPercent, setBonusPercent] = useState(10);
  
  const [formData, setFormData] = useState<CreateOfferInput>({
    campaign_name: '',
    description: '',
    min_purchase_amount_bsk: 500,
    max_purchase_amount_bsk: 10000,
    withdrawable_bonus_percent: 10,
    holding_bonus_percent: 0,
    start_at: new Date().toISOString().slice(0, 16),
    end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    is_featured: false,
  });

  const createMutation = useCreatePurchaseOffer();

  const handleBonusPercentChange = (value: number) => {
    setBonusPercent(value);
    
    if (bonusType === 'withdrawable') {
      setFormData(prev => ({
        ...prev,
        withdrawable_bonus_percent: value,
        holding_bonus_percent: 0,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        withdrawable_bonus_percent: 0,
        holding_bonus_percent: value,
      }));
    }
  };

  const handleBonusTypeChange = (type: 'withdrawable' | 'holding') => {
    setBonusType(type);
    
    if (type === 'withdrawable') {
      setFormData(prev => ({
        ...prev,
        withdrawable_bonus_percent: bonusPercent,
        holding_bonus_percent: 0,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        withdrawable_bonus_percent: 0,
        holding_bonus_percent: bonusPercent,
      }));
    }
  };

  const handleSubmit = () => {
    createMutation.mutate(formData, {
      onSuccess: () => {
        setOpen(false);
        setBonusType('withdrawable');
        setBonusPercent(10);
        setFormData({
          campaign_name: '',
          description: '',
          min_purchase_amount_bsk: 500,
          max_purchase_amount_bsk: 10000,
          withdrawable_bonus_percent: 10,
          holding_bonus_percent: 0,
          start_at: new Date().toISOString().slice(0, 16),
          end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
          is_featured: false,
        });
      },
    });
  };

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
          <div className="space-y-2">
            <Label htmlFor="campaign_name">Campaign Name *</Label>
            <Input
              id="campaign_name"
              value={formData.campaign_name}
              onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
              placeholder="e.g., New Year Special"
            />
          </div>

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

          <div className="space-y-3">
            <Label>Purchase Amount Range (BSK) *</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_amount" className="text-xs text-muted-foreground">Minimum</Label>
                <Input
                  id="min_amount"
                  type="number"
                  min="1"
                  value={formData.min_purchase_amount_bsk}
                  onChange={(e) => setFormData({ ...formData, min_purchase_amount_bsk: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">≈ ₹{formData.min_purchase_amount_bsk.toLocaleString('en-IN')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_amount" className="text-xs text-muted-foreground">Maximum</Label>
                <Input
                  id="max_amount"
                  type="number"
                  min={formData.min_purchase_amount_bsk}
                  value={formData.max_purchase_amount_bsk}
                  onChange={(e) => setFormData({ ...formData, max_purchase_amount_bsk: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">≈ ₹{formData.max_purchase_amount_bsk.toLocaleString('en-IN')}</p>
              </div>
            </div>
            {formData.max_purchase_amount_bsk < formData.min_purchase_amount_bsk && (
              <p className="text-xs text-destructive">Maximum must be ≥ minimum</p>
            )}
          </div>

          <div className="space-y-4 p-4 bg-accent/10 rounded-lg border">
            <Label>Bonus Type *</Label>
            
            <RadioGroup value={bonusType} onValueChange={(value) => handleBonusTypeChange(value as 'withdrawable' | 'holding')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="withdrawable" id="withdrawable" />
                <Label htmlFor="withdrawable" className="cursor-pointer font-normal">
                  Withdrawable Bonus (Users can withdraw immediately)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="holding" id="holding" />
                <Label htmlFor="holding" className="cursor-pointer font-normal">
                  Holding Bonus (Locked for future use)
                </Label>
              </div>
            </RadioGroup>
            
            <div className="space-y-2">
              <Label htmlFor="bonus_percent">Bonus Percentage *</Label>
              <Input
                id="bonus_percent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={bonusPercent}
                onChange={(e) => handleBonusPercentChange(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                {bonusType === 'withdrawable' 
                  ? 'Users receive this % as immediately withdrawable bonus'
                  : 'Users receive this % as locked holding bonus'}
              </p>
            </div>
            
            <div className="p-3 bg-background rounded border">
              <p className="text-sm font-medium mb-2">Bonus Configuration Preview:</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Withdrawable Bonus:</span>
                  <span className="font-semibold">{bonusType === 'withdrawable' ? bonusPercent : 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Holding Bonus:</span>
                  <span className="font-semibold">{bonusType === 'holding' ? bonusPercent : 0}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_at">Start Date & Time *</Label>
              <Input
                id="start_at"
                type="datetime-local"
                className="pointer-events-auto cursor-pointer"
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_at">End Date & Time *</Label>
              <Input
                id="end_at"
                type="datetime-local"
                className="pointer-events-auto cursor-pointer"
                value={formData.end_at}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_featured">Featured Offer</Label>
            <Switch
              id="is_featured"
              checked={formData.is_featured}
              onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            disabled={createMutation.isPending || !formData.campaign_name || formData.max_purchase_amount_bsk < formData.min_purchase_amount_bsk || bonusPercent <= 0 || bonusPercent > 100}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Offer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
