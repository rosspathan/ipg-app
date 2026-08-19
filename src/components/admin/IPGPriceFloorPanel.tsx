import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2, Ban } from "lucide-react";
import { toast } from "sonner";

/**
 * Admin-only IPG Price Floor Protection.
 * Renders nothing meaningful for non-admins (route is already admin-guarded),
 * and every write is re-validated server-side.
 */
export default function IPGPriceFloorPanel() {
  const [floorPrice, setFloorPrice] = useState<string>("500");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("ipg_price_floor_settings")
      .select("floor_price, is_active")
      .maybeSingle();
    if (!error && data) {
      setFloorPrice(String(data.floor_price));
      setIsActive(!!data.is_active);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    const value = Number(floorPrice);
    if (!isFinite(value) || value < 0) {
      toast.error("Enter a valid floor price");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await (supabase as any)
      .from("ipg_price_floor_settings")
      .update({
        floor_price: value,
        is_active: isActive,
        updated_by: userData?.user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("singleton", true);
    setSaving(false);

    if (error) {
      toast.error("Failed to save floor price", { description: error.message });
      return;
    }
    toast.success(`IPG floor price saved at ${value} USDT`);

    // Activating the floor cancels every open IPG sell order.
    if (isActive) await handleCancelAll(true);
  };

  const handleCancelAll = async (silentEmpty = false) => {
    setCancelling(true);
    const { data, error } = await (supabase as any).rpc("admin_cancel_ipg_sell_orders", {
      p_only_below_floor: false,
    });
    setCancelling(false);

    if (error) {
      toast.error("Cancel failed", { description: error.message });
      return;
    }
    const count = Number(data?.cancelled_count ?? 0);
    const refunded = Number(data?.refunded_ipg ?? 0);
    if (count === 0 && silentEmpty) return;
    toast.success(`${count} IPG sell order${count === 1 ? "" : "s"} cancelled`, {
      description: `${refunded.toFixed(6)} IPG refunded to users' available balances`,
    });
  };

  return (
    <div className="rounded-xl border border-[hsl(225_24%_22%/0.4)] bg-[hsl(230_28%_11%)] p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">IPG Price Floor Protection</h2>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Active" : "Disabled"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="ipg-floor-active" className="text-xs text-muted-foreground">
            Enforce floor
          </Label>
          <Switch id="ipg-floor-active" checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading floor settings…
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_auto_auto] items-end">
            <div className="space-y-1.5">
              <Label htmlFor="ipg-floor-price" className="text-xs">
                IPG Floor Price (USDT)
              </Label>
              <Input
                id="ipg-floor-price"
                type="number"
                min={0}
                step="0.00000001"
                value={floorPrice}
                onChange={(e) => setFloorPrice(e.target.value)}
                className="font-mono tabular-nums"
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save & Activate
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleCancelAll(false)}
              disabled={cancelling}
              className="gap-2"
            >
              {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
              Cancel All IPG Sell Orders
            </Button>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Saving with the floor enabled cancels every open IPG sell order across all users, refunds
            the locked IPG to their available balances, and blocks all IPG buy/sell orders, matches and
            order book levels priced below the floor.
          </p>
        </>
      )}
    </div>
  );
}
