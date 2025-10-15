import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AdMiningConfig {
  rewards: {
    rewardPerAd: number;
    bonusMultiplier: number;
    maxDailyEarnings: number;
  };
  limits: {
    adsPerDay: number;
    minViewTime: number;
    cooldownMinutes: number;
  };
  targeting: {
    allowedRegions: string[];
    minLevel: number;
    requireKYC: boolean;
  };
}

interface AdMiningSettingsProps {
  config: AdMiningConfig;
  onChange: (config: AdMiningConfig) => void;
}

export function AdMiningSettings({ config, onChange }: AdMiningSettingsProps) {
  const updateConfig = (path: string[], value: any) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    let current = newConfig;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    onChange(newConfig);
  };

  return (
    <div className="space-y-6">
      {/* Rewards Settings */}
      <CleanCard padding="lg">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold">Reward Settings</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configure how much BSK users earn per ad</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div>
            <Label>Reward Per Ad (BSK)</Label>
            <Input
              type="number"
              value={config.rewards.rewardPerAd}
              onChange={(e) => updateConfig(['rewards', 'rewardPerAd'], Number(e.target.value))}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Base BSK reward for watching one ad
            </p>
          </div>

          <div>
            <Label>Bonus Multiplier</Label>
            <Input
              type="number"
              step="0.1"
              value={config.rewards.bonusMultiplier}
              onChange={(e) => updateConfig(['rewards', 'bonusMultiplier'], Number(e.target.value))}
              placeholder="1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Multiplier for premium users (e.g., 1.5 = 50% bonus)
            </p>
          </div>

          <div>
            <Label>Max Daily Earnings (BSK)</Label>
            <Input
              type="number"
              value={config.rewards.maxDailyEarnings}
              onChange={(e) => updateConfig(['rewards', 'maxDailyEarnings'], Number(e.target.value))}
              placeholder="500"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum BSK a user can earn per day
            </p>
          </div>
        </div>
      </CleanCard>

      {/* Limits Settings */}
      <CleanCard padding="lg">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Usage Limits</h3>

          <div>
            <Label>Ads Per Day</Label>
            <Input
              type="number"
              value={config.limits.adsPerDay}
              onChange={(e) => updateConfig(['limits', 'adsPerDay'], Number(e.target.value))}
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum number of ads a user can watch per day
            </p>
          </div>

          <div>
            <Label>Minimum View Time (seconds)</Label>
            <Input
              type="number"
              value={config.limits.minViewTime}
              onChange={(e) => updateConfig(['limits', 'minViewTime'], Number(e.target.value))}
              placeholder="30"
            />
            <p className="text-xs text-muted-foreground mt-1">
              How long users must watch before earning reward
            </p>
          </div>

          <div>
            <Label>Cooldown (minutes)</Label>
            <Input
              type="number"
              value={config.limits.cooldownMinutes}
              onChange={(e) => updateConfig(['limits', 'cooldownMinutes'], Number(e.target.value))}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Time between ad views
            </p>
          </div>
        </div>
      </CleanCard>

      {/* Targeting Settings */}
      <CleanCard padding="lg">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Access Control</h3>

          <div>
            <Label>Minimum Level</Label>
            <Input
              type="number"
              value={config.targeting.minLevel}
              onChange={(e) => updateConfig(['targeting', 'minLevel'], Number(e.target.value))}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum user level required to access
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Require KYC</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Users must complete KYC verification
              </p>
            </div>
            <Switch
              checked={config.targeting.requireKYC}
              onCheckedChange={(checked) => updateConfig(['targeting', 'requireKYC'], checked)}
            />
          </div>
        </div>
      </CleanCard>
    </div>
  );
}
