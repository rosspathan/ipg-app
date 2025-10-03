import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Save, TrendingUp } from "lucide-react";

const AdminINRSettings = () => {
  const { toast } = useToast();
  const [bskInrRate, setBskInrRate] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load BSK rate from team_referral_settings
      const { data, error } = await supabase
        .from('team_referral_settings')
        .select('bsk_inr_rate')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setBskInrRate(data.bsk_inr_rate);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update in team_referral_settings
      const { data: existingSettings } = await supabase
        .from('team_referral_settings')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSettings) {
        const { error } = await supabase
          .from('team_referral_settings')
          .update({ bsk_inr_rate: bskInrRate })
          .eq('id', existingSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('team_referral_settings')
          .insert({ bsk_inr_rate: bskInrRate });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "BSK to INR rate updated successfully"
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>BSK Rate Configuration</CardTitle>
              <CardDescription>
                Set the BSK to INR conversion rate used throughout the application
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bsk_rate">BSK to INR Rate</Label>
            <Input
              id="bsk_rate"
              type="number"
              step="0.01"
              min="0.01"
              value={bskInrRate}
              onChange={(e) => setBskInrRate(parseFloat(e.target.value))}
              placeholder="1.00"
            />
            <p className="text-sm text-muted-foreground">
              Current BSK to INR conversion rate. This rate is used for:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
              <li>Badge subscription pricing</li>
              <li>Referral commission calculations</li>
              <li>VIP milestone rewards</li>
              <li>All BSK to INR conversions</li>
            </ul>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Example Conversion</h4>
            <p className="text-sm text-muted-foreground">
              1 BSK = ₹{bskInrRate.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              100 BSK = ₹{(bskInrRate * 100).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              1000 BSK = ₹{(bskInrRate * 1000).toFixed(2)}
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving || bskInrRate <= 0}
            className="w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save BSK Rate"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              • This rate affects all BSK-related calculations across the application
            </p>
            <p>
              • Changing this rate will apply to all new transactions immediately
            </p>
            <p>
              • Existing transactions maintain their historical rates
            </p>
            <p>
              • Make sure to communicate rate changes to users in advance
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminINRSettings;
