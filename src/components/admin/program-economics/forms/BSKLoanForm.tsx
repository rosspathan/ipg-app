import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";
import { useMemo } from "react";

const bskLoanSchema = z.object({
  min_loan_amount: z.number().min(100, "Min loan must be ≥ 100 BSK"),
  max_loan_amount: z.number().min(100, "Max loan must be ≥ 100 BSK"),
  duration_weeks: z.number().int().min(1, "Duration must be ≥ 1 week"),
  interest_rate_percent: z.number().min(0, "Interest rate must be ≥ 0%").max(100, "Interest rate must be ≤ 100%"),
  processing_fee_percent: z.number().min(0, "Processing fee must be ≥ 0%"),
  late_payment_fee: z.number().min(0, "Late fee must be ≥ 0 BSK"),
  is_enabled: z.boolean(),
}).refine(data => data.max_loan_amount >= data.min_loan_amount, {
  message: "Max loan must be ≥ Min loan",
  path: ["max_loan_amount"],
});

type BSKLoanFormData = z.infer<typeof bskLoanSchema>;

interface BSKLoanFormProps {
  initialData?: Partial<BSKLoanFormData>;
  onSubmit: (data: BSKLoanFormData) => void;
  isSubmitting: boolean;
}

export function BSKLoanForm({ initialData, onSubmit, isSubmitting }: BSKLoanFormProps) {
  const { register, watch, handleSubmit, setValue, formState: { errors } } = useForm<BSKLoanFormData>({
    resolver: zodResolver(bskLoanSchema),
    defaultValues: {
      min_loan_amount: initialData?.min_loan_amount || 1000,
      max_loan_amount: initialData?.max_loan_amount || 50000,
      duration_weeks: initialData?.duration_weeks || 12,
      interest_rate_percent: initialData?.interest_rate_percent || 0,
      processing_fee_percent: initialData?.processing_fee_percent || 2,
      late_payment_fee: initialData?.late_payment_fee || 50,
      is_enabled: initialData?.is_enabled ?? true,
    },
  });

  const watchedValues = watch();

  const calculations = useMemo(() => {
    const minLoan = watchedValues.min_loan_amount || 0;
    const maxLoan = watchedValues.max_loan_amount || 0;
    const durationWeeks = watchedValues.duration_weeks || 1;
    const interestRate = watchedValues.interest_rate_percent || 0;
    const processingFee = watchedValues.processing_fee_percent || 0;
    
    // Example loan: average of min and max
    const exampleLoan = (minLoan + maxLoan) / 2;
    
    // Calculate total repayment with interest
    const interestAmount = exampleLoan * (interestRate / 100);
    const processingFeeAmount = exampleLoan * (processingFee / 100);
    const totalRepayment = exampleLoan + interestAmount + processingFeeAmount;
    
    // Weekly installment
    const weeklyInstallment = totalRepayment / durationWeeks;
    
    // Calculate effective APR
    const effectiveAPR = ((totalRepayment - exampleLoan) / exampleLoan) * (52 / durationWeeks) * 100;
    
    // Revenue per loan
    const revenuePerLoan = interestAmount + processingFeeAmount;
    const revenuePercent = exampleLoan > 0 ? (revenuePerLoan / exampleLoan * 100) : 0;
    
    // Health check
    const isHealthy = effectiveAPR <= 36 && processingFee <= 5;
    
    return {
      exampleLoan,
      totalRepayment,
      weeklyInstallment,
      effectiveAPR: effectiveAPR.toFixed(1),
      revenuePerLoan,
      revenuePercent: revenuePercent.toFixed(1),
      isHealthy,
    };
  }, [watchedValues]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Loan Limits */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Loan Amount Limits</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Minimum Loan (BSK)</Label>
            <Input type="number" step="1" {...register("min_loan_amount", { valueAsNumber: true })} />
            {errors.min_loan_amount && <p className="text-xs text-destructive mt-1">{errors.min_loan_amount.message}</p>}
          </div>

          <div>
            <Label>Maximum Loan (BSK)</Label>
            <Input type="number" step="1" {...register("max_loan_amount", { valueAsNumber: true })} />
            {errors.max_loan_amount && <p className="text-xs text-destructive mt-1">{errors.max_loan_amount.message}</p>}
          </div>
        </div>
      </div>

      {/* Terms & Interest */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Terms & Interest</h3>
        
        <div>
          <Label>Loan Duration (Weeks)</Label>
          <Input type="number" {...register("duration_weeks", { valueAsNumber: true })} />
          <p className="text-xs text-muted-foreground mt-1">
            {watchedValues.duration_weeks} weeks = {(watchedValues.duration_weeks / 4).toFixed(1)} months
          </p>
          {errors.duration_weeks && <p className="text-xs text-destructive mt-1">{errors.duration_weeks.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Interest Rate (%)</Label>
            <Input 
              type="number" 
              step="0.1" 
              {...register("interest_rate_percent", { valueAsNumber: true })} 
            />
            {errors.interest_rate_percent && <p className="text-xs text-destructive mt-1">{errors.interest_rate_percent.message}</p>}
          </div>

          <div>
            <Label>Processing Fee (%)</Label>
            <Input 
              type="number" 
              step="0.1" 
              {...register("processing_fee_percent", { valueAsNumber: true })} 
            />
            {errors.processing_fee_percent && <p className="text-xs text-destructive mt-1">{errors.processing_fee_percent.message}</p>}
          </div>
        </div>

        <div>
          <Label>Late Payment Fee (BSK)</Label>
          <Input type="number" step="1" {...register("late_payment_fee", { valueAsNumber: true })} />
          <p className="text-xs text-muted-foreground mt-1">Charged per overdue week</p>
          {errors.late_payment_fee && <p className="text-xs text-destructive mt-1">{errors.late_payment_fee.message}</p>}
        </div>
      </div>

      {/* System Control */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label>Enable Loan Program</Label>
          <p className="text-xs text-muted-foreground">Allow users to apply for loans</p>
        </div>
        <Switch 
          checked={watchedValues.is_enabled} 
          onCheckedChange={(checked) => setValue("is_enabled", checked)}
        />
      </div>

      {/* Real-time Calculations */}
      <div className="bg-muted/50 p-4 rounded-lg space-y-3">
        <h4 className="text-sm font-semibold">Example Loan Calculation</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Loan Amount:</span>
            <span className="font-semibold">{calculations.exampleLoan.toFixed(0)} BSK</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Repayment:</span>
            <span className="font-semibold">{calculations.totalRepayment.toFixed(0)} BSK</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Weekly Installment:</span>
            <span className="font-semibold">{calculations.weeklyInstallment.toFixed(0)} BSK</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Effective APR:</span>
            <span className="font-semibold">{calculations.effectiveAPR}%</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Revenue Per Loan:</span>
            <span className="font-semibold text-primary">
              {calculations.revenuePerLoan.toFixed(0)} BSK ({calculations.revenuePercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Validation Alerts */}
      {parseFloat(calculations.effectiveAPR) > 36 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ Effective APR exceeds 36% - may be considered predatory lending. 
            Consider reducing interest rate or fees.
          </AlertDescription>
        </Alert>
      )}

      {!calculations.isHealthy && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Processing fee is high. Consider keeping it under 5% for better user experience.
          </AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving..." : "Save Loan Configuration"}
      </Button>
    </form>
  );
}
