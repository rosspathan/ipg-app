import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Gift } from "lucide-react";
import { useMemo } from "react";

const bskPromotionsSchema = z.object({
  name: z.string().min(1, "Campaign name required"),
  min_purchase_inr: z.number().min(100, "Min purchase must be ≥ 100 INR"),
  max_purchase_inr: z.number().min(100, "Max purchase must be ≥ 100 INR"),
  bonus_percent: z.number().min(0, "Bonus % must be ≥ 0").max(200, "Bonus % must be ≤ 200"),
  per_user_limit: z.enum(["once", "once_per_campaign", "unlimited"]),
  destination: z.enum(["withdrawable", "holding"]),
  vesting_enabled: z.boolean(),
  vesting_duration_days: z.number().int().min(0, "Vesting days must be ≥ 0"),
  global_budget_bsk: z.number().min(0, "Budget must be ≥ 0").nullable(),
  eligible_channels: z.array(z.string()),
}).refine(data => data.max_purchase_inr >= data.min_purchase_inr, {
  message: "Max purchase must be ≥ Min purchase",
  path: ["max_purchase_inr"],
});

type BSKPromotionsFormData = z.infer<typeof bskPromotionsSchema>;

interface BSKPromotionsFormProps {
  initialData?: Partial<BSKPromotionsFormData>;
  onSubmit: (data: BSKPromotionsFormData) => void;
  isSubmitting: boolean;
}

export function BSKPromotionsForm({ initialData, onSubmit, isSubmitting }: BSKPromotionsFormProps) {
  const { register, watch, handleSubmit, setValue, formState: { errors } } = useForm<BSKPromotionsFormData>({
    resolver: zodResolver(bskPromotionsSchema),
    defaultValues: {
      name: initialData?.name || "",
      min_purchase_inr: initialData?.min_purchase_inr || 1000,
      max_purchase_inr: initialData?.max_purchase_inr || 100000,
      bonus_percent: initialData?.bonus_percent || 20,
      per_user_limit: initialData?.per_user_limit || "once",
      destination: initialData?.destination || "withdrawable",
      vesting_enabled: initialData?.vesting_enabled ?? false,
      vesting_duration_days: initialData?.vesting_duration_days || 30,
      global_budget_bsk: initialData?.global_budget_bsk || 100000,
      eligible_channels: initialData?.eligible_channels || ["app", "web"],
    },
  });

  const watchedValues = watch();

  const calculations = useMemo(() => {
    const minPurchase = watchedValues.min_purchase_inr || 0;
    const maxPurchase = watchedValues.max_purchase_inr || 0;
    const bonusPercent = watchedValues.bonus_percent || 0;
    const globalBudget = watchedValues.global_budget_bsk || 0;
    
    // Assume BSK rate: 1 BSK = 1 INR for calculation
    const avgPurchase = (minPurchase + maxPurchase) / 2;
    const avgBSKPurchase = avgPurchase; // 1:1 for demo
    
    // Bonus amount for average purchase
    const bonusAmount = avgBSKPurchase * (bonusPercent / 100);
    
    // Estimate how many users can claim
    const estimatedUsers = globalBudget > 0 ? Math.floor(globalBudget / bonusAmount) : Infinity;
    
    // Cost per user
    const costPerUser = bonusAmount;
    
    // Budget utilization rate
    const budgetUtilizationRate = globalBudget > 0 ? (bonusAmount / globalBudget * 100) : 0;
    
    // Health check
    const isHealthy = bonusPercent <= 50 && budgetUtilizationRate > 0;
    
    return {
      avgPurchase,
      bonusAmount: bonusAmount.toFixed(2),
      estimatedUsers: isFinite(estimatedUsers) ? estimatedUsers : "Unlimited",
      costPerUser: costPerUser.toFixed(2),
      budgetUtilizationRate: budgetUtilizationRate.toFixed(2),
      isHealthy,
    };
  }, [watchedValues]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Campaign Identity */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Campaign Configuration</h3>
        
        <div>
          <Label>Campaign Name</Label>
          <Input {...register("name")} placeholder="e.g., New Year Bonus 2025" />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>
      </div>

      {/* Purchase Limits */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Purchase Range (INR)</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Minimum Purchase (INR)</Label>
            <Input type="number" step="1" {...register("min_purchase_inr", { valueAsNumber: true })} />
            {errors.min_purchase_inr && <p className="text-xs text-destructive mt-1">{errors.min_purchase_inr.message}</p>}
          </div>

          <div>
            <Label>Maximum Purchase (INR)</Label>
            <Input type="number" step="1" {...register("max_purchase_inr", { valueAsNumber: true })} />
            {errors.max_purchase_inr && <p className="text-xs text-destructive mt-1">{errors.max_purchase_inr.message}</p>}
          </div>
        </div>

        <div>
          <Label>Bonus Percentage (%)</Label>
          <Input 
            type="number" 
            step="1" 
            {...register("bonus_percent", { valueAsNumber: true })} 
            placeholder="e.g., 20 for 20% bonus"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Example: ₹10,000 purchase → {(10000 * (watchedValues.bonus_percent || 0) / 100).toFixed(0)} BSK bonus
          </p>
          {errors.bonus_percent && <p className="text-xs text-destructive mt-1">{errors.bonus_percent.message}</p>}
        </div>
      </div>

      {/* User Limits */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">User Limits & Destination</h3>
        
        <div>
          <Label>Per User Limit</Label>
          <Select 
            value={watchedValues.per_user_limit} 
            onValueChange={(value: any) => setValue("per_user_limit", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="once">Once (One-time bonus)</SelectItem>
              <SelectItem value="once_per_campaign">Once per campaign</SelectItem>
              <SelectItem value="unlimited">Unlimited</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Bonus Destination</Label>
          <Select 
            value={watchedValues.destination} 
            onValueChange={(value: any) => setValue("destination", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="withdrawable">Withdrawable (Immediate)</SelectItem>
              <SelectItem value="holding">Holding (Vested)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {watchedValues.destination === "withdrawable" 
              ? "User can withdraw bonus immediately" 
              : "Bonus is held and released over time"}
          </p>
        </div>
      </div>

      {/* Vesting Settings */}
      {watchedValues.destination === "holding" && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Vesting Schedule</h3>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label>Enable Vesting</Label>
              <p className="text-xs text-muted-foreground">Release bonus gradually over time</p>
            </div>
            <Switch 
              checked={watchedValues.vesting_enabled} 
              onCheckedChange={(checked) => setValue("vesting_enabled", checked)}
            />
          </div>

          {watchedValues.vesting_enabled && (
            <div>
              <Label>Vesting Duration (Days)</Label>
              <Input 
                type="number" 
                {...register("vesting_duration_days", { valueAsNumber: true })} 
              />
              <p className="text-xs text-muted-foreground mt-1">
                Bonus released daily over {watchedValues.vesting_duration_days} days
              </p>
              {errors.vesting_duration_days && <p className="text-xs text-destructive mt-1">{errors.vesting_duration_days.message}</p>}
            </div>
          )}
        </div>
      )}

      {/* Budget Control */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Budget Control</h3>
        
        <div>
          <Label>Global Budget (BSK)</Label>
          <Input type="number" step="1" {...register("global_budget_bsk", { valueAsNumber: true })} />
          <p className="text-xs text-muted-foreground mt-1">
            Maximum total bonus BSK available for this campaign (0 for unlimited)
          </p>
          {errors.global_budget_bsk && <p className="text-xs text-destructive mt-1">{errors.global_budget_bsk.message}</p>}
        </div>
      </div>

      {/* Real-time Calculations */}
      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Campaign Economics</h4>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Purchase:</span>
            <span className="font-semibold">₹{calculations.avgPurchase.toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Bonus Per User:</span>
            <span className="font-semibold">{calculations.bonusAmount} BSK</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated Users (Budget):</span>
            <span className="font-semibold">{calculations.estimatedUsers}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Cost Per User:</span>
            <span className="font-semibold text-warning">{calculations.costPerUser} BSK</span>
          </div>
        </div>
      </div>

      {/* Validation Alerts */}
      {watchedValues.bonus_percent > 50 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ Bonus percentage exceeds 50% - This is very generous. 
            Consider if this is sustainable for your budget.
          </AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button type="submit" disabled={isSubmitting || !calculations.isHealthy} className="w-full">
        {isSubmitting ? "Saving..." : "Save Campaign Configuration"}
      </Button>
    </form>
  );
}
