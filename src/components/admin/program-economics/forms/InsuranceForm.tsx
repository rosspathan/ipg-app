import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";

const insuranceSchema = z.object({
  tier_name: z.string().min(1, "Tier name required"),
  monthly_fee: z.number().min(0, "Fee must be ≥ 0"),
  coverage_ratio: z.number().min(0).max(1, "Coverage ratio must be 0-1 (e.g., 0.5 for 50%)"),
  max_claim_per_trade: z.number().min(0, "Max claim must be ≥ 0"),
  max_claims_per_month: z.number().int().min(0, "Max claims must be ≥ 0").nullable(),
  min_loss_threshold: z.number().min(0, "Min loss threshold must be ≥ 0"),
  bonus_rewards: z.number().min(0, "Bonus rewards must be ≥ 0").nullable(),
  is_active: z.boolean(),
});

type InsuranceFormData = z.infer<typeof insuranceSchema>;

interface InsuranceFormProps {
  initialData?: Partial<InsuranceFormData>;
  onSubmit: (data: InsuranceFormData) => void;
  isSubmitting: boolean;
}

export function InsuranceForm({ initialData, onSubmit, isSubmitting }: InsuranceFormProps) {
  const { register, watch, handleSubmit, formState: { errors } } = useForm<InsuranceFormData>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: {
      tier_name: initialData?.tier_name || "",
      monthly_fee: initialData?.monthly_fee || 299,
      coverage_ratio: initialData?.coverage_ratio || 0.5,
      max_claim_per_trade: initialData?.max_claim_per_trade || 500,
      max_claims_per_month: initialData?.max_claims_per_month || 3,
      min_loss_threshold: initialData?.min_loss_threshold || 10,
      bonus_rewards: initialData?.bonus_rewards || 0,
      is_active: initialData?.is_active ?? true,
    },
  });

  const watchedValues = watch();

  const calculations = useMemo(() => {
    const monthlyFee = watchedValues.monthly_fee || 0;
    const coverageRatio = watchedValues.coverage_ratio || 0;
    const maxClaimPerTrade = watchedValues.max_claim_per_trade || 0;
    const maxClaimsPerMonth = watchedValues.max_claims_per_month || 0;
    
    // Calculate max monthly payout if user claims all allowed
    const maxMonthlyPayout = maxClaimPerTrade * maxClaimsPerMonth;
    
    // Calculate break-even trades needed
    const avgLossSize = maxClaimPerTrade / coverageRatio;
    const breakEvenTrades = monthlyFee / (avgLossSize - maxClaimPerTrade);
    
    // Calculate expected loss (assuming avg 2 claims)
    const expectedClaims = Math.min(2, maxClaimsPerMonth);
    const expectedPayout = maxClaimPerTrade * expectedClaims;
    const profitMargin = monthlyFee > 0 ? ((monthlyFee - expectedPayout) / monthlyFee * 100) : 0;
    
    // Health check
    const isHealthy = profitMargin > 20 && maxMonthlyPayout < monthlyFee * 3;
    
    return {
      maxMonthlyPayout,
      breakEvenTrades: breakEvenTrades.toFixed(1),
      expectedPayout,
      profitMargin: profitMargin.toFixed(1),
      isHealthy,
    };
  }, [watchedValues]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Tier Configuration */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Tier Configuration</h3>
        
        <div>
          <Label>Tier Name</Label>
          <Input {...register("tier_name")} placeholder="e.g., Bronze, Silver, Gold" />
          {errors.tier_name && <p className="text-xs text-destructive mt-1">{errors.tier_name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Monthly Fee (BSK)</Label>
            <Input type="number" step="0.01" {...register("monthly_fee", { valueAsNumber: true })} />
            {errors.monthly_fee && <p className="text-xs text-destructive mt-1">{errors.monthly_fee.message}</p>}
          </div>

          <div>
            <Label>Bonus Rewards (BSK)</Label>
            <Input type="number" step="0.01" {...register("bonus_rewards", { valueAsNumber: true })} />
            {errors.bonus_rewards && <p className="text-xs text-destructive mt-1">{errors.bonus_rewards.message}</p>}
          </div>
        </div>
      </div>

      {/* Coverage Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Coverage Settings</h3>
        
        <div>
          <Label>Coverage Ratio (0-1)</Label>
          <Input 
            type="number" 
            step="0.01" 
            min="0" 
            max="1" 
            {...register("coverage_ratio", { valueAsNumber: true })} 
            placeholder="e.g., 0.5 for 50% coverage"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Current: {(watchedValues.coverage_ratio * 100).toFixed(0)}% of losses covered
          </p>
          {errors.coverage_ratio && <p className="text-xs text-destructive mt-1">{errors.coverage_ratio.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Max Claim Per Trade (BSK)</Label>
            <Input type="number" step="0.01" {...register("max_claim_per_trade", { valueAsNumber: true })} />
            {errors.max_claim_per_trade && <p className="text-xs text-destructive mt-1">{errors.max_claim_per_trade.message}</p>}
          </div>

          <div>
            <Label>Max Claims Per Month</Label>
            <Input type="number" {...register("max_claims_per_month", { valueAsNumber: true })} />
            {errors.max_claims_per_month && <p className="text-xs text-destructive mt-1">{errors.max_claims_per_month.message}</p>}
          </div>
        </div>

        <div>
          <Label>Min Loss Threshold (BSK)</Label>
          <Input type="number" step="0.01" {...register("min_loss_threshold", { valueAsNumber: true })} />
          <p className="text-xs text-muted-foreground mt-1">Minimum loss required to file a claim</p>
          {errors.min_loss_threshold && <p className="text-xs text-destructive mt-1">{errors.min_loss_threshold.message}</p>}
        </div>
      </div>

      {/* Real-time Calculations */}
      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <h4 className="text-sm font-semibold">Economic Analysis</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Max Monthly Payout:</span>
            <span className="font-semibold ml-2">{calculations.maxMonthlyPayout.toFixed(0)} BSK</span>
          </div>
          <div>
            <span className="text-muted-foreground">Expected Payout (2 claims):</span>
            <span className="font-semibold ml-2">{calculations.expectedPayout.toFixed(0)} BSK</span>
          </div>
          <div>
            <span className="text-muted-foreground">Profit Margin:</span>
            <span className="font-semibold ml-2">{calculations.profitMargin}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Break-even Trades:</span>
            <span className="font-semibold ml-2">{calculations.breakEvenTrades}</span>
          </div>
        </div>
      </div>

      {/* Validation Alerts */}
      {!calculations.isHealthy && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ Unhealthy economics: Max payout exceeds revenue or profit margin too low. 
            Consider increasing monthly fee or reducing coverage.
          </AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button type="submit" disabled={isSubmitting || !calculations.isHealthy} className="w-full">
        {isSubmitting ? "Saving..." : "Save Insurance Tier"}
      </Button>
    </form>
  );
}
