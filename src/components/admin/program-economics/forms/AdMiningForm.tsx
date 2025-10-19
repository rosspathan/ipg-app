import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";

const formSchema = z.object({
  reward_per_ad: z.number().min(0.01, "Reward must be > 0"),
  required_view_time_seconds: z.number().int().min(5, "View time must be ≥ 5 seconds"),
  daily_limit_per_user: z.number().int().min(1, "Daily limit must be ≥ 1"),
  daily_bsk_budget_cap: z.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface AdMiningFormProps {
  initialData: any;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
}

export function AdMiningForm({ initialData, onSubmit, isSubmitting }: AdMiningFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reward_per_ad: initialData?.reward_per_ad || 1,
      required_view_time_seconds: initialData?.required_view_time_seconds || 30,
      daily_limit_per_user: initialData?.daily_limit_per_user || 20,
      daily_bsk_budget_cap: initialData?.daily_bsk_budget_cap || undefined,
    },
  });

  const rewardPerAd = watch("reward_per_ad");
  const dailyLimit = watch("daily_limit_per_user");
  const budgetCap = watch("daily_bsk_budget_cap");
  const viewTime = watch("required_view_time_seconds");

  // Real-time calculations
  const estimatedActiveUsers = 1000; // This could be configurable
  const maxDailyCost = dailyLimit * estimatedActiveUsers * rewardPerAd;
  const costPerUser = rewardPerAd * dailyLimit;
  
  // Estimate budget depletion
  const adsPerHour = Math.floor(3600 / viewTime); // Assumes continuous watching
  const costPerUserPerHour = adsPerHour * rewardPerAd;
  const budgetDepletionHours = budgetCap ? budgetCap / (costPerUserPerHour * estimatedActiveUsers) : null;

  const budgetTooLow = budgetCap ? budgetCap < (dailyLimit * rewardPerAd * 100) : false;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Reward Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Reward Settings</h3>
        
        <div className="space-y-2">
          <Label htmlFor="reward_per_ad">Reward Per Ad (BSK)</Label>
          <Input
            id="reward_per_ad"
            type="number"
            step="0.01"
            {...register("reward_per_ad", { valueAsNumber: true })}
          />
          {errors.reward_per_ad && (
            <p className="text-sm text-destructive">{errors.reward_per_ad.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Amount of BSK earned per completed ad view
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="view_time">Required View Time (seconds)</Label>
          <Input
            id="view_time"
            type="number"
            {...register("required_view_time_seconds", { valueAsNumber: true })}
          />
          {errors.required_view_time_seconds && (
            <p className="text-sm text-destructive">{errors.required_view_time_seconds.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Minimum seconds user must watch to earn reward
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="daily_limit">Daily Limit Per User</Label>
          <Input
            id="daily_limit"
            type="number"
            {...register("daily_limit_per_user", { valueAsNumber: true })}
          />
          {errors.daily_limit_per_user && (
            <p className="text-sm text-destructive">{errors.daily_limit_per_user.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Maximum ads a user can watch per day
          </p>
        </div>
      </div>

      {/* Budget Control */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Budget Control (Optional)</h3>
        
        <div className="space-y-2">
          <Label htmlFor="budget_cap">Daily BSK Budget Cap</Label>
          <Input
            id="budget_cap"
            type="number"
            step="0.01"
            placeholder="Leave empty for unlimited"
            {...register("daily_bsk_budget_cap", { 
              valueAsNumber: true,
              setValueAs: (v) => v === "" ? undefined : parseFloat(v)
            })}
          />
          {errors.daily_bsk_budget_cap && (
            <p className="text-sm text-destructive">{errors.daily_bsk_budget_cap.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Maximum BSK to distribute per day across all users
          </p>
        </div>

        {budgetTooLow && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Budget cap too low! Minimum recommended: {(dailyLimit * rewardPerAd * 100).toFixed(2)} BSK
              (100 users × daily limit × reward)
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Real-time Stats */}
      <div className="space-y-3 p-4 rounded-lg bg-muted/50">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Info className="w-4 h-4" />
          Cost Estimates
        </h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Cost Per User (Max)</p>
            <p className="font-mono">{costPerUser.toFixed(2)} BSK</p>
          </div>

          <div>
            <p className="text-muted-foreground">Max Daily Cost</p>
            <p className="font-mono text-yellow-600">
              {maxDailyCost.toLocaleString()} BSK
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">Ads Per Hour (Max)</p>
            <p className="font-mono">{adsPerHour}</p>
          </div>

          <div>
            <p className="text-muted-foreground">Total View Time</p>
            <p className="font-mono">{(dailyLimit * viewTime / 60).toFixed(1)} min</p>
          </div>
        </div>

        {budgetDepletionHours && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Budget will last approximately <strong>{budgetDepletionHours.toFixed(1)} hours</strong> with {estimatedActiveUsers.toLocaleString()} active users
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-2 text-xs text-muted-foreground">
          * Estimates based on {estimatedActiveUsers.toLocaleString()} active users and maximum engagement
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting || budgetTooLow} className="w-full">
        {isSubmitting ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
