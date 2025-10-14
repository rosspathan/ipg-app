import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Save, Calculator } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface BSKRateManagerProps {
  currentRate: number;
  onRateUpdate?: () => void;
}

const BSKRateManager = ({ currentRate, onRateUpdate }: BSKRateManagerProps) => {
  const [newRate, setNewRate] = useState(currentRate.toString());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [bskAmount, setBskAmount] = useState("100");
  const { toast } = useToast();

  const handleUpdateRate = async () => {
    const rateValue = parseFloat(newRate);
    
    if (isNaN(rateValue) || rateValue <= 0) {
      toast({
        title: "Invalid Rate",
        description: "Please enter a valid positive number",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Expire old rate
      const { error: expireError } = await supabase
        .from('bsk_rate_history')
        .update({ 
          status: 'expired',
          effective_until: new Date().toISOString()
        })
        .eq('status', 'active');

      if (expireError) throw expireError;

      // Insert new rate
      const { error: insertError } = await supabase
        .from('bsk_rate_history')
        .insert({
          rate_inr_per_bsk: rateValue,
          effective_from: new Date().toISOString(),
          created_by: user.id,
          approved_by: user.id,
          status: 'active',
          notes: notes || `Rate updated from ₹${currentRate} to ₹${rateValue}`,
        });

      if (insertError) throw insertError;

      // Log to supply ledger
      await supabase.rpc('log_admin_action', {
        p_action: 'bsk_rate_update',
        p_resource_type: 'bsk_rate_history',
        p_resource_id: null,
        p_new_values: {
          old_rate: currentRate,
          new_rate: rateValue,
          notes: notes,
        },
      });

      toast({
        title: "Rate Updated",
        description: `BSK rate updated to ₹${rateValue} per BSK`,
      });

      setNotes("");
      if (onRateUpdate) onRateUpdate();
    } catch (error) {
      console.error('Error updating BSK rate:', error);
      toast({
        title: "Error",
        description: "Failed to update BSK rate",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateInr = () => {
    const bsk = parseFloat(bskAmount);
    const rate = parseFloat(newRate);
    if (!isNaN(bsk) && !isNaN(rate)) {
      return (bsk * rate).toFixed(2);
    }
    return "0.00";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            BSK Rate Management
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Current Rate: ₹{currentRate.toLocaleString('en-IN')} per BSK
          </p>
        </div>
        <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Calculator className="w-4 h-4 mr-2" />
              Calculator
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>BSK to INR Calculator</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>BSK Amount</Label>
                <Input
                  type="number"
                  value={bskAmount}
                  onChange={(e) => setBskAmount(e.target.value)}
                  placeholder="Enter BSK amount"
                />
              </div>
              <div>
                <Label>Using Rate</Label>
                <Input
                  type="number"
                  value={newRate}
                  disabled
                  placeholder="Rate per BSK"
                />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">INR Equivalent</div>
                <div className="text-2xl font-bold">₹{calculateInr()}</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="newRate">New Rate (INR per BSK)</Label>
            <Input
              id="newRate"
              type="number"
              step="0.01"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              placeholder="Enter new rate"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Impact: 100 BSK = ₹{(parseFloat(newRate) * 100).toLocaleString('en-IN')}
            </p>
          </div>
          
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for rate change"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            onClick={() => setNewRate(currentRate.toString())}
            variant="outline"
            disabled={saving}
          >
            Reset
          </Button>
          <Button
            onClick={handleUpdateRate}
            disabled={saving || newRate === currentRate.toString()}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Updating..." : "Update Rate"}
          </Button>
        </div>

        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Changing the BSK rate will affect all future transactions and conversions. 
            Existing balances will not be automatically adjusted. Previous rate: ₹{currentRate}/BSK
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BSKRateManager;
