import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Save, Ticket, Trophy, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QuickEditLuckyDrawProps {
  moduleKey: string;
  currentConfig?: any;
}

export function QuickEditLuckyDraw({ moduleKey, currentConfig }: QuickEditLuckyDrawProps) {
  const { toast } = useToast();
  const [ticketPrice, setTicketPrice] = useState(currentConfig?.ticketPrice || 100);
  const [firstPrize, setFirstPrize] = useState(currentConfig?.prizes?.[0] || 10000);
  const [maxTicketsPerUser, setMaxTicketsPerUser] = useState(currentConfig?.maxTicketsPerUser || 10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentConfig) {
      setTicketPrice(currentConfig.ticketPrice || 100);
      setFirstPrize(currentConfig.prizes?.[0] || 10000);
      setMaxTicketsPerUser(currentConfig.maxTicketsPerUser || 10);
    }
  }, [currentConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get module ID from key
      const { data: module } = await supabase
        .from('program_modules')
        .select('id')
        .eq('key', moduleKey)
        .maybeSingle();

      if (!module) {
        throw new Error('Program module not found');
      }

      // Create new config version
      const { error } = await supabase
        .from('program_configs')
        .insert({
          module_id: module.id,
          config_json: {
            ...currentConfig,
            ticketPrice,
            maxTicketsPerUser,
            prizes: [firstPrize, Math.floor(firstPrize * 0.3), Math.floor(firstPrize * 0.15)]
          },
          status: 'published',
          is_current: true
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Lucky Draw configuration updated successfully"
      });
    } catch (error) {
      toast({
        title: "Failed to save",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Ticket Price (BSK)</Label>
          <div className="flex items-center gap-1">
            <Ticket className="w-3 h-3 text-primary" />
            <span className="text-sm font-semibold">{ticketPrice}</span>
          </div>
        </div>
        <Slider
          value={[ticketPrice]}
          onValueChange={([val]) => setTicketPrice(val)}
          min={10}
          max={1000}
          step={10}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>10 BSK</span>
          <span>1000 BSK</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">First Prize (BSK)</Label>
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-warning" />
            <span className="text-sm font-semibold">{firstPrize.toLocaleString()}</span>
          </div>
        </div>
        <Input
          type="number"
          value={firstPrize}
          onChange={(e) => setFirstPrize(parseInt(e.target.value) || 0)}
          min={1000}
          max={1000000}
          step={1000}
          className="h-8 text-sm"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Max Tickets Per User</Label>
          <span className="text-sm font-semibold">{maxTicketsPerUser}</span>
        </div>
        <Slider
          value={[maxTicketsPerUser]}
          onValueChange={([val]) => setMaxTicketsPerUser(val)}
          min={1}
          max={50}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 ticket</span>
          <span>50 tickets</span>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        size="sm"
        className="w-full"
      >
        <Save className="w-3.5 h-3.5 mr-1.5" />
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
