import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const luckyDrawSchema = z.object({
  pool_size: z.number().min(10, "Pool size must be at least 10").max(1000, "Pool size cannot exceed 1000"),
  ticket_price: z.number().min(1, "Ticket price must be at least 1 BSK").max(10000, "Ticket price cannot exceed 10,000 BSK"),
  first_place_prize: z.number().min(0, "Prize cannot be negative"),
  second_place_prize: z.number().min(0, "Prize cannot be negative"),
  third_place_prize: z.number().min(0, "Prize cannot be negative"),
  admin_fee_percent: z.number().min(0, "Fee cannot be negative").max(20, "Fee cannot exceed 20%"),
  auto_execute: z.boolean(),
  min_participants: z.number().min(1, "Minimum participants must be at least 1").optional(),
});

type LuckyDrawFormData = z.infer<typeof luckyDrawSchema>;

interface LuckyDrawFormProps {
  initialData: Partial<LuckyDrawFormData>;
  onSubmit: (data: LuckyDrawFormData) => Promise<void>;
  hasParticipations: boolean;
  isSubmitting?: boolean;
}

export function LuckyDrawForm({ initialData, onSubmit, hasParticipations, isSubmitting }: LuckyDrawFormProps) {
  const form = useForm<LuckyDrawFormData>({
    resolver: zodResolver(luckyDrawSchema),
    defaultValues: {
      pool_size: initialData.pool_size || 100,
      ticket_price: initialData.ticket_price || 100,
      first_place_prize: initialData.first_place_prize || 5000,
      second_place_prize: initialData.second_place_prize || 3000,
      third_place_prize: initialData.third_place_prize || 2000,
      admin_fee_percent: initialData.admin_fee_percent || 10,
      auto_execute: initialData.auto_execute ?? true,
      min_participants: initialData.min_participants || 50,
    },
  });

  const watchedValues = form.watch();

  // Real-time calculations
  const calculations = useMemo(() => {
    const maxRevenue = watchedValues.pool_size * watchedValues.ticket_price;
    const totalPrizes = watchedValues.first_place_prize + watchedValues.second_place_prize + watchedValues.third_place_prize;
    const adminRevenue = maxRevenue - totalPrizes;
    const profitMargin = maxRevenue > 0 ? (adminRevenue / maxRevenue) * 100 : 0;
    const isHealthy = adminRevenue >= 0 && profitMargin >= 5;
    
    return {
      maxRevenue,
      totalPrizes,
      adminRevenue,
      profitMargin,
      isHealthy,
    };
  }, [watchedValues]);

  const handleSubmit = form.handleSubmit(async (data) => {
    // Validate prizes don't exceed revenue
    if (calculations.adminRevenue < 0) {
      form.setError("root", {
        message: "Total prizes cannot exceed max revenue. Please adjust prize amounts or ticket price.",
      });
      return;
    }
    
    await onSubmit(data);
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Pool Settings Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Pool Economics</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pool_size">
              Pool Size (Tickets)
              {hasParticipations && (
                <span className="ml-2 text-xs text-muted-foreground">(Locked)</span>
              )}
            </Label>
            <Input
              id="pool_size"
              type="number"
              disabled={hasParticipations}
              {...form.register("pool_size", { valueAsNumber: true })}
            />
            {form.formState.errors.pool_size && (
              <p className="text-sm text-destructive">{form.formState.errors.pool_size.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket_price">Ticket Price (BSK)</Label>
            <Input
              id="ticket_price"
              type="number"
              {...form.register("ticket_price", { valueAsNumber: true })}
            />
            {form.formState.errors.ticket_price && (
              <p className="text-sm text-destructive">{form.formState.errors.ticket_price.message}</p>
            )}
          </div>
        </div>

        {/* Real-time Stats */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm text-muted-foreground">Max Revenue</p>
            <p className="text-2xl font-bold">{calculations.maxRevenue.toLocaleString()} BSK</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Profit Margin</p>
            <p className={`text-2xl font-bold ${calculations.isHealthy ? 'text-green-600' : 'text-destructive'}`}>
              {calculations.isHealthy ? '🟢' : '🔴'} {calculations.profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Prize Distribution Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Prize Distribution</h3>
        
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="first_place_prize">1st Place Prize (BSK)</Label>
            <Input
              id="first_place_prize"
              type="number"
              {...form.register("first_place_prize", { valueAsNumber: true })}
            />
            {form.formState.errors.first_place_prize && (
              <p className="text-sm text-destructive">{form.formState.errors.first_place_prize.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="second_place_prize">2nd Place Prize (BSK)</Label>
            <Input
              id="second_place_prize"
              type="number"
              {...form.register("second_place_prize", { valueAsNumber: true })}
            />
            {form.formState.errors.second_place_prize && (
              <p className="text-sm text-destructive">{form.formState.errors.second_place_prize.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="third_place_prize">3rd Place Prize (BSK)</Label>
            <Input
              id="third_place_prize"
              type="number"
              {...form.register("third_place_prize", { valueAsNumber: true })}
            />
            {form.formState.errors.third_place_prize && (
              <p className="text-sm text-destructive">{form.formState.errors.third_place_prize.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm text-muted-foreground">Total Prize Pool</p>
            <p className="text-xl font-bold">{calculations.totalPrizes.toLocaleString()} BSK</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Admin Revenue</p>
            <p className={`text-xl font-bold ${calculations.adminRevenue >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {calculations.adminRevenue.toLocaleString()} BSK
            </p>
          </div>
        </div>
      </div>

      {/* Admin Controls Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Admin Controls</h3>
        
        <div className="space-y-2">
          <Label htmlFor="admin_fee_percent">Admin Fee Percentage</Label>
          <div className="flex items-center gap-4">
            <Slider
              id="admin_fee_percent"
              min={0}
              max={20}
              step={0.5}
              value={[watchedValues.admin_fee_percent]}
              onValueChange={([value]) => form.setValue("admin_fee_percent", value)}
              className="flex-1"
            />
            <span className="w-16 text-right font-medium">{watchedValues.admin_fee_percent}%</span>
          </div>
          {form.formState.errors.admin_fee_percent && (
            <p className="text-sm text-destructive">{form.formState.errors.admin_fee_percent.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div className="space-y-1">
            <Label htmlFor="auto_execute">Auto-execute Draw</Label>
            <p className="text-sm text-muted-foreground">Automatically execute when pool is full</p>
          </div>
          <Switch
            id="auto_execute"
            checked={watchedValues.auto_execute}
            onCheckedChange={(checked) => form.setValue("auto_execute", checked)}
          />
        </div>

        {watchedValues.auto_execute && (
          <div className="space-y-2">
            <Label htmlFor="min_participants">Minimum Participants (Fallback)</Label>
            <Input
              id="min_participants"
              type="number"
              {...form.register("min_participants", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              <Info className="inline w-3 h-3 mr-1" />
              If pool doesn't fill, execute when this threshold is reached
            </p>
          </div>
        )}
      </div>

      {/* Validation Alerts */}
      {!calculations.isHealthy && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {calculations.adminRevenue < 0 
              ? "Total prizes exceed max revenue! Reduce prizes or increase ticket price."
              : "Profit margin is below 5%. Consider adjusting prize distribution."}
          </AlertDescription>
        </Alert>
      )}

      {form.formState.errors.root && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" disabled={isSubmitting || !calculations.isHealthy}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
