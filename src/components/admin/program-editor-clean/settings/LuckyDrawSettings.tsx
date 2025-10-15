import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { Plus, Trash2 } from "lucide-react";

interface Prize {
  rank: number;
  amount: number;
  currency: string;
}

interface LuckyDrawConfig {
  pool: {
    poolSize: number;
    ticketPrice: number;
    currency: string;
  };
  prizes: Prize[];
  fees: {
    adminFeePercent: number;
  };
  rules: {
    maxTicketsPerUser: number;
    autoExecuteWhenFull: boolean;
  };
}

interface LuckyDrawSettingsProps {
  config: LuckyDrawConfig;
  onChange: (config: LuckyDrawConfig) => void;
}

export function LuckyDrawSettings({ config, onChange }: LuckyDrawSettingsProps) {
  const updateConfig = (path: string[], value: any) => {
    const newConfig = JSON.parse(JSON.stringify(config));
    let current = newConfig;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    onChange(newConfig);
  };

  const addPrize = () => {
    const newPrizes = [...config.prizes, { rank: config.prizes.length + 1, amount: 100, currency: "BSK" }];
    updateConfig(['prizes'], newPrizes);
  };

  const removePrize = (index: number) => {
    const newPrizes = config.prizes.filter((_, i) => i !== index);
    updateConfig(['prizes'], newPrizes);
  };

  const updatePrize = (index: number, field: string, value: any) => {
    const newPrizes = [...config.prizes];
    newPrizes[index] = { ...newPrizes[index], [field]: value };
    updateConfig(['prizes'], newPrizes);
  };

  return (
    <div className="space-y-6">
      {/* Pool Settings */}
      <CleanCard padding="lg">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Pool Configuration</h3>

          <div>
            <Label>Pool Size</Label>
            <Input
              type="number"
              value={config.pool.poolSize}
              onChange={(e) => updateConfig(['pool', 'poolSize'], Number(e.target.value))}
              placeholder="100"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum number of participants
            </p>
          </div>

          <div>
            <Label>Ticket Price</Label>
            <Input
              type="number"
              value={config.pool.ticketPrice}
              onChange={(e) => updateConfig(['pool', 'ticketPrice'], Number(e.target.value))}
              placeholder="50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Cost per ticket in {config.pool.currency}
            </p>
          </div>

          <div>
            <Label>Currency</Label>
            <Input
              value={config.pool.currency}
              onChange={(e) => updateConfig(['pool', 'currency'], e.target.value)}
              placeholder="BSK"
            />
          </div>
        </div>
      </CleanCard>

      {/* Prize Configuration */}
      <CleanCard padding="lg">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Prize Configuration</h3>
            <Button onClick={addPrize} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Prize
            </Button>
          </div>

          {config.prizes.map((prize, index) => (
            <div key={index} className="flex items-end gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <Label>Rank {prize.rank}</Label>
                <Input
                  type="number"
                  value={prize.amount}
                  onChange={(e) => updatePrize(index, 'amount', Number(e.target.value))}
                  placeholder="Amount"
                />
              </div>
              <div className="w-24">
                <Label>Currency</Label>
                <Input
                  value={prize.currency}
                  onChange={(e) => updatePrize(index, 'currency', e.target.value)}
                  placeholder="BSK"
                />
              </div>
              <Button
                onClick={() => removePrize(index)}
                size="icon"
                variant="ghost"
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </CleanCard>

      {/* Fees & Rules */}
      <CleanCard padding="lg">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4">Fees & Rules</h3>

          <div>
            <Label>Admin Fee (%)</Label>
            <Input
              type="number"
              value={config.fees.adminFeePercent}
              onChange={(e) => updateConfig(['fees', 'adminFeePercent'], Number(e.target.value))}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Platform fee percentage from prize pool
            </p>
          </div>

          <div>
            <Label>Max Tickets Per User</Label>
            <Input
              type="number"
              value={config.rules.maxTicketsPerUser}
              onChange={(e) => updateConfig(['rules', 'maxTicketsPerUser'], Number(e.target.value))}
              placeholder="10"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum tickets one user can purchase
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Auto Execute When Full</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically run draw when pool is full
              </p>
            </div>
            <Switch
              checked={config.rules.autoExecuteWhenFull}
              onCheckedChange={(checked) => updateConfig(['rules', 'autoExecuteWhenFull'], checked)}
            />
          </div>
        </div>
      </CleanCard>
    </div>
  );
}
