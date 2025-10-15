import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SpinWheelConfig {
  betting: {
    allowedBets: number[];
    minBet: number;
    maxBet: number;
    currency: string;
  };
  limits: {
    freeSpinsPerDay: number;
    maxSpinsPerDay: number;
  };
  segments: string; // "use_spin_segments_table"
}

interface SpinWheelSettingsProps {
  config: SpinWheelConfig;
  onChange: (config: SpinWheelConfig) => void;
}

export function SpinWheelSettings({ config, onChange }: SpinWheelSettingsProps) {
  const updateConfig = (path: string[], value: any) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    let current = newConfig;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    onChange(newConfig);
  };

  const updateAllowedBets = (value: string) => {
    const bets = value.split(',').map(v => Number(v.trim())).filter(v => !isNaN(v));
    updateConfig(['betting', 'allowedBets'], bets);
  };

  return (
    <div className="space-y-6">
      {/* Betting Settings */}
      <CleanCard padding="lg">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold">Betting Configuration</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configure betting amounts and limits</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div>
            <Label>Allowed Bet Amounts</Label>
            <Input
              value={config.betting.allowedBets.join(', ')}
              onChange={(e) => updateAllowedBets(e.target.value)}
              placeholder="10, 50, 100, 500"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Comma-separated bet amounts users can choose from
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {config.betting.allowedBets.map((bet, i) => (
                <Badge key={i} variant="secondary">
                  {bet} {config.betting.currency}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Min Bet</Label>
              <Input
                type="number"
                value={config.betting.minBet}
                onChange={(e) => updateConfig(['betting', 'minBet'], Number(e.target.value))}
                placeholder="10"
              />
            </div>
            <div>
              <Label>Max Bet</Label>
              <Input
                type="number"
                value={config.betting.maxBet}
                onChange={(e) => updateConfig(['betting', 'maxBet'], Number(e.target.value))}
                placeholder="1000"
              />
            </div>
          </div>

          <div>
            <Label>Currency</Label>
            <Input
              value={config.betting.currency}
              onChange={(e) => updateConfig(['betting', 'currency'], e.target.value)}
              placeholder="BSK"
            />
          </div>
        </div>
      </CleanCard>

      {/* Limits Settings */}
      <CleanCard padding="lg">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Daily Limits</h3>

          <div>
            <Label>Free Spins Per Day</Label>
            <Input
              type="number"
              value={config.limits.freeSpinsPerDay}
              onChange={(e) => updateConfig(['limits', 'freeSpinsPerDay'], Number(e.target.value))}
              placeholder="3"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Number of free spins users get daily
            </p>
          </div>

          <div>
            <Label>Max Spins Per Day</Label>
            <Input
              type="number"
              value={config.limits.maxSpinsPerDay}
              onChange={(e) => updateConfig(['limits', 'maxSpinsPerDay'], Number(e.target.value))}
              placeholder="50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Total maximum spins per day (including paid)
            </p>
          </div>
        </div>
      </CleanCard>

      {/* Segments Info */}
      <CleanCard padding="lg">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Wheel Segments</h3>
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Wheel segments are managed in the <code className="bg-muted px-2 py-1 rounded">spin_segments</code> table.
              Navigate to the Spin Wheel admin section to configure multipliers, weights, and colors.
            </p>
          </div>
        </div>
      </CleanCard>
    </div>
  );
}
