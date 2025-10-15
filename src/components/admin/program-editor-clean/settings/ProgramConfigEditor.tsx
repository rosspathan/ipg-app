import { useState } from "react";
import { ProgramModule } from "@/hooks/useProgramRegistry";
import { AdMiningSettings } from "./AdMiningSettings";
import { LuckyDrawSettings } from "./LuckyDrawSettings";
import { SpinWheelSettings } from "./SpinWheelSettings";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { FileJson, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface ProgramConfigEditorProps {
  module: ProgramModule;
  configJson: any;
  onChange: (configJson: any) => void;
}

const DEFAULT_CONFIGS = {
  advertising: {
    rewards: {
      rewardPerAd: 10,
      bonusMultiplier: 1.5,
      maxDailyEarnings: 500
    },
    limits: {
      adsPerDay: 5,
      minViewTime: 30,
      cooldownMinutes: 10
    },
    targeting: {
      allowedRegions: ["global"],
      minLevel: 0,
      requireKYC: false
    }
  },
  "lucky-draw": {
    pool: {
      poolSize: 100,
      ticketPrice: 50,
      currency: "BSK"
    },
    prizes: [
      { rank: 1, amount: 2000, currency: "BSK" },
      { rank: 2, amount: 1000, currency: "BSK" },
      { rank: 3, amount: 500, currency: "BSK" }
    ],
    fees: {
      adminFeePercent: 10
    },
    rules: {
      maxTicketsPerUser: 10,
      autoExecuteWhenFull: true
    }
  },
  spin: {
    betting: {
      allowedBets: [10, 50, 100, 500],
      minBet: 10,
      maxBet: 1000,
      currency: "BSK"
    },
    limits: {
      freeSpinsPerDay: 3,
      maxSpinsPerDay: 50
    },
    segments: "use_spin_segments_table"
  }
};

export function ProgramConfigEditor({ module, configJson, onChange }: ProgramConfigEditorProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  const [rawJsonValue, setRawJsonValue] = useState(JSON.stringify(configJson || {}, null, 2));

  // Initialize with default config if empty
  const currentConfig = configJson && Object.keys(configJson).length > 0 
    ? configJson 
    : DEFAULT_CONFIGS[module.key as keyof typeof DEFAULT_CONFIGS] || {};

  const handleConfigChange = (newConfig: any) => {
    onChange(newConfig);
    setRawJsonValue(JSON.stringify(newConfig, null, 2));
  };

  const handleRawJsonSave = () => {
    try {
      const parsed = JSON.parse(rawJsonValue);
      onChange(parsed);
      toast.success("Configuration updated from JSON");
      setShowRawJson(false);
    } catch (error) {
      toast.error("Invalid JSON format");
    }
  };

  const renderConfigEditor = () => {
    switch (module.key) {
      case 'advertising':
      case 'ad-mining':
        return (
          <AdMiningSettings 
            config={currentConfig} 
            onChange={handleConfigChange}
          />
        );
      case 'lucky-draw':
        return (
          <LuckyDrawSettings 
            config={currentConfig} 
            onChange={handleConfigChange}
          />
        );
      case 'spin':
      case 'ismart-spin':
        return (
          <SpinWheelSettings 
            config={currentConfig} 
            onChange={handleConfigChange}
          />
        );
      default:
        return (
          <CleanCard padding="lg">
            <div className="text-center py-8">
              <FileJson className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No specific settings UI for this program type.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Use raw JSON editor below to configure.
              </p>
            </div>
          </CleanCard>
        );
    }
  };

  if (showRawJson) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Raw JSON Configuration</Label>
          <Button
            onClick={() => setShowRawJson(false)}
            variant="ghost"
            size="sm"
          >
            <Eye className="w-4 h-4 mr-2" />
            Visual Editor
          </Button>
        </div>
        <Textarea
          value={rawJsonValue}
          onChange={(e) => setRawJsonValue(e.target.value)}
          className="font-mono text-sm min-h-[400px]"
          placeholder='{"key": "value"}'
        />
        <Button onClick={handleRawJsonSave}>
          Save JSON
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Program Settings</Label>
          <p className="text-sm text-muted-foreground">
            Configure how this program works for users
          </p>
        </div>
        <Button
          onClick={() => setShowRawJson(true)}
          variant="ghost"
          size="sm"
        >
          <FileJson className="w-4 h-4 mr-2" />
          Edit JSON
        </Button>
      </div>
      {renderConfigEditor()}
    </div>
  );
}
