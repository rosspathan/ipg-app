import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { useMemo } from "react";

const stakingSchema = z.object({
  name: z.string().min(1, "Pool name required"),
  apy: z.number().min(0, "APY must be ≥ 0%").max(1000, "APY must be ≤ 1000%"),
  lock_period_days: z.number().int().min(0, "Lock period must be ≥ 0 days"),
  has_lock_period: z.boolean(),
  min_stake_amount: z.number().min(0, "Min stake must be ≥ 0"),
  max_stake_amount: z.number().min(0, "Max stake must be ≥ 0").nullable(),
  capacity: z.number().min(0, "Capacity must be ≥ 0").nullable(),
  active: z.boolean(),
}).refine(data => !data.max_stake_amount || data.max_stake_amount >= data.min_stake_amount, {
  message: "Max stake must be ≥ Min stake",
  path: ["max_stake_amount"],
});

type StakingFormData = z.infer<typeof stakingSchema>;

interface StakingFormProps {
  initialData?: Partial<StakingFormData>;
  onSubmit: (data: StakingFormData) => void;
  isSubmitting: boolean;
}

export function StakingForm({ initialData, onSubmit, isSubmitting }: StakingFormProps) {
  const { register, watch, handleSubmit, setValue, formState: { errors } } = useForm<StakingFormData>({
    resolver: zodResolver(stakingSchema),
    defaultValues: {
      name: initialData?.name || "",
      apy: initialData?.apy || 12,
      lock_period_days: initialData?.lock_period_days || 30,
      has_lock_period: initialData?.has_lock_period ?? true,
      min_stake_amount: initialData?.min_stake_amount || 100,
      max_stake_amount: initialData?.max_stake_amount || 10000,
      capacity: initialData?.capacity || 1000000,
      active: initialData?.active ?? true,
    },
  });

  const watchedValues = watch();

  const calculations = useMemo(() => {
    const apy = watchedValues.apy || 0;
    const lockPeriodDays = watchedValues.has_lock_period ? (watchedValues.lock_period_days || 0) : 0;
    const minStake = watchedValues.min_stake_amount || 0;
    const maxStake = watchedValues.max_stake_amount || 0;
    const capacity = watchedValues.capacity || 0;
    
    // Calculate daily rate
    const dailyRate = apy / 365 / 100;
    
    // Example stake (average)
    const exampleStake = maxStake > 0 ? (minStake + maxStake) / 2 : minStake * 10;
    
    // Calculate rewards for lock period
    const rewardsForPeriod = lockPeriodDays > 0 
      ? exampleStake * dailyRate * lockPeriodDays
      : exampleStake * dailyRate * 30; // 30 days if flexible
    
    // Annual rewards
    const annualRewards = exampleStake * (apy / 100);
    
    // Calculate max pool cost (if capacity is set and pool fills)
    const maxPoolCost = capacity > 0 ? capacity * (apy / 100) : 0;
    
    // Estimate required reward pool for 30 days
    const monthlyRewardPool = capacity > 0 ? (capacity * (apy / 100) / 12) : 0;
    
    // Health check (APY not too high)
    const isHealthy = apy <= 100;
    
    return {
      dailyRate: (dailyRate * 100).toFixed(4),
      exampleStake,
      rewardsForPeriod,
      annualRewards,
      maxPoolCost,
      monthlyRewardPool,
      isHealthy,
    };
  }, [watchedValues]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Pool Identity */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Pool Configuration</h3>
        
        <div>
          <Label>Pool Name</Label>
          <Input {...register("name")} placeholder="e.g., BSK Flexible Staking" />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <Label>APY (%)</Label>
          <Input 
            type="number" 
            step="0.1" 
            {...register("apy", { valueAsNumber: true })} 
            placeholder="e.g., 12 for 12% annual"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Daily rate: {calculations.dailyRate}%
          </p>
          {errors.apy && <p className="text-xs text-destructive mt-1">{errors.apy.message}</p>}
        </div>
      </div>

      {/* Lock Period */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Lock Period Settings</h3>
        
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label>Has Lock Period</Label>
            <p className="text-xs text-muted-foreground">Require minimum staking duration</p>
          </div>
          <Switch 
            checked={watchedValues.has_lock_period} 
            onCheckedChange={(checked) => setValue("has_lock_period", checked)}
          />
        </div>

        {watchedValues.has_lock_period && (
          <div>
            <Label>Lock Period (Days)</Label>
            <Input 
              type="number" 
              {...register("lock_period_days", { valueAsNumber: true })} 
            />
            <p className="text-xs text-muted-foreground mt-1">
              {watchedValues.lock_period_days} days ≈ {(watchedValues.lock_period_days / 30).toFixed(1)} months
            </p>
            {errors.lock_period_days && <p className="text-xs text-destructive mt-1">{errors.lock_period_days.message}</p>}
          </div>
        )}
      </div>

      {/* Stake Limits */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Stake Amount Limits</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Minimum Stake (BSK)</Label>
            <Input type="number" step="1" {...register("min_stake_amount", { valueAsNumber: true })} />
            {errors.min_stake_amount && <p className="text-xs text-destructive mt-1">{errors.min_stake_amount.message}</p>}
          </div>

          <div>
            <Label>Maximum Stake (BSK)</Label>
            <Input type="number" step="1" {...register("max_stake_amount", { valueAsNumber: true })} />
            <p className="text-xs text-muted-foreground mt-1">Leave 0 for unlimited</p>
            {errors.max_stake_amount && <p className="text-xs text-destructive mt-1">{errors.max_stake_amount.message}</p>}
          </div>
        </div>

        <div>
          <Label>Pool Capacity (BSK)</Label>
          <Input type="number" step="1" {...register("capacity", { valueAsNumber: true })} />
          <p className="text-xs text-muted-foreground mt-1">Maximum total stake for this pool (0 for unlimited)</p>
          {errors.capacity && <p className="text-xs text-destructive mt-1">{errors.capacity.message}</p>}
        </div>
      </div>

      {/* Pool Status */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label>Pool Active</Label>
          <p className="text-xs text-muted-foreground">Allow new stakes</p>
        </div>
        <Switch 
          checked={watchedValues.active} 
          onCheckedChange={(checked) => setValue("active", checked)}
        />
      </div>

      {/* Real-time Calculations */}
      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">Reward Projections</h4>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Example Stake:</span>
            <span className="font-semibold">{calculations.exampleStake.toFixed(0)} BSK</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Rewards for {watchedValues.has_lock_period ? watchedValues.lock_period_days : 30} days:
            </span>
            <span className="font-semibold">{calculations.rewardsForPeriod.toFixed(2)} BSK</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Annual Rewards:</span>
            <span className="font-semibold">{calculations.annualRewards.toFixed(2)} BSK</span>
          </div>
          {calculations.monthlyRewardPool > 0 && (
            <>
              <div className="border-t pt-2 mt-2" />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Reward Pool Needed:</span>
                <span className="font-semibold text-warning">{calculations.monthlyRewardPool.toFixed(0)} BSK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Annual Cost (if full):</span>
                <span className="font-semibold text-destructive">{calculations.maxPoolCost.toFixed(0)} BSK</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Validation Alerts */}
      {!calculations.isHealthy && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ APY exceeds 100% - This is extremely high and may be unsustainable. 
            Consider lowering the APY to a more realistic rate.
          </AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button type="submit" disabled={isSubmitting || !calculations.isHealthy} className="w-full">
        {isSubmitting ? "Saving..." : "Save Staking Pool"}
      </Button>
    </form>
  );
}
