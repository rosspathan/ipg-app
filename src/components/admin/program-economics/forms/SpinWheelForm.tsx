import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Info, Plus, Trash2 } from "lucide-react";

const segmentSchema = z.object({
  label: z.string().min(1, "Label required"),
  multiplier: z.number().min(0, "Multiplier must be ≥ 0"),
  weight: z.number().min(0.1, "Weight must be > 0").max(100, "Weight must be ≤ 100"),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
});

const formSchema = z.object({
  min_bet: z.number().min(0.01, "Min bet must be > 0"),
  max_bet: z.number().min(0.01, "Max bet must be > 0"),
  free_spins_per_day: z.number().int().min(0, "Free spins must be ≥ 0"),
  segments: z.array(segmentSchema).min(4, "At least 4 segments required"),
}).refine((data) => data.max_bet >= data.min_bet, {
  message: "Max bet must be ≥ Min bet",
  path: ["max_bet"],
});

type FormData = z.infer<typeof formSchema>;

interface SpinWheelFormProps {
  initialData: any;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
}

export function SpinWheelForm({ initialData, onSubmit, isSubmitting }: SpinWheelFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      min_bet: initialData?.min_bet || 10,
      max_bet: initialData?.max_bet || 1000,
      free_spins_per_day: initialData?.free_spins_per_day || 3,
      segments: initialData?.segments || [
        { label: "0x", multiplier: 0, weight: 50, color_hex: "#EF4444" },
        { label: "1.2x", multiplier: 1.2, weight: 25, color_hex: "#F59E0B" },
        { label: "2x", multiplier: 2, weight: 15, color_hex: "#10B981" },
        { label: "5x", multiplier: 5, weight: 10, color_hex: "#3B82F6" },
      ],
    },
  });

  const segments = watch("segments");
  const minBet = watch("min_bet");
  const maxBet = watch("max_bet");

  // Real-time calculations
  const totalWeight = segments.reduce((sum, seg) => sum + (seg.weight || 0), 0);
  const rtp = segments.reduce((sum, seg) => sum + (seg.multiplier || 0) * (seg.weight || 0), 0) / 100;
  const houseEdge = 100 - rtp * 100;
  const maxPayout = maxBet * Math.max(...segments.map(s => s.multiplier || 0));

  const weightValid = Math.abs(totalWeight - 100) < 0.1;
  const rtpHealthy = rtp >= 0.85 && rtp <= 0.98;

  const addSegment = () => {
    setValue("segments", [
      ...segments,
      { label: "New", multiplier: 1, weight: 10, color_hex: "#6366F1" },
    ]);
  };

  const removeSegment = (index: number) => {
    if (segments.length > 4) {
      setValue("segments", segments.filter((_, i) => i !== index));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Bet Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Bet Settings</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="min_bet">Min Bet (BSK)</Label>
            <Input
              id="min_bet"
              type="number"
              step="0.01"
              {...register("min_bet", { valueAsNumber: true })}
            />
            {errors.min_bet && (
              <p className="text-sm text-destructive">{errors.min_bet.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_bet">Max Bet (BSK)</Label>
            <Input
              id="max_bet"
              type="number"
              step="0.01"
              {...register("max_bet", { valueAsNumber: true })}
            />
            {errors.max_bet && (
              <p className="text-sm text-destructive">{errors.max_bet.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="free_spins">Free Spins Per Day</Label>
          <Input
            id="free_spins"
            type="number"
            {...register("free_spins_per_day", { valueAsNumber: true })}
          />
          {errors.free_spins_per_day && (
            <p className="text-sm text-destructive">{errors.free_spins_per_day.message}</p>
          )}
        </div>
      </div>

      {/* Segments Configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Wheel Segments</h3>
          <Button type="button" size="sm" onClick={addSegment} disabled={isSubmitting}>
            <Plus className="w-4 h-4 mr-1" />
            Add Segment
          </Button>
        </div>

        {!weightValid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Total weight must equal 100% (currently {totalWeight.toFixed(1)}%)
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {segments.map((_, index) => (
            <div key={index} className="grid grid-cols-[1fr,1fr,1fr,80px,40px] gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  placeholder="Label"
                  {...register(`segments.${index}.label`)}
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Multiplier</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="1.5"
                  {...register(`segments.${index}.multiplier`, { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Weight (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="25"
                  {...register(`segments.${index}.weight`, { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Color</Label>
                <Input
                  type="color"
                  {...register(`segments.${index}.color_hex`)}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSegment(index)}
                disabled={segments.length <= 4 || isSubmitting}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {errors.segments && (
          <p className="text-sm text-destructive">{errors.segments.message}</p>
        )}
      </div>

      {/* Real-time Stats */}
      <div className="space-y-3 p-4 rounded-lg bg-muted/50">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Info className="w-4 h-4" />
          Real-time Statistics
        </h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Weight</p>
            <p className={`font-mono ${weightValid ? "text-green-600" : "text-red-600"}`}>
              {totalWeight.toFixed(1)}%
            </p>
          </div>
          
          <div>
            <p className="text-muted-foreground">RTP (Return to Player)</p>
            <p className={`font-mono ${rtpHealthy ? "text-green-600" : "text-yellow-600"}`}>
              {(rtp * 100).toFixed(2)}%
            </p>
          </div>

          <div>
            <p className="text-muted-foreground">House Edge</p>
            <p className="font-mono">{houseEdge.toFixed(2)}%</p>
          </div>

          <div>
            <p className="text-muted-foreground">Max Payout</p>
            <p className="font-mono">{maxPayout.toFixed(2)} BSK</p>
          </div>
        </div>

        {!rtpHealthy && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {rtp < 0.85 ? "RTP too low - players may find game unfair" : "RTP too high - house edge very small"}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting || !weightValid} className="w-full">
        {isSubmitting ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
