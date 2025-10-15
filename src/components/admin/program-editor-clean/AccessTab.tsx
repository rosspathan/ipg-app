import { Shield, Users, TrendingUp, MapPin, Save } from "lucide-react";
import { Label } from "@/components/ui/label";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useProgramVisibilityRules } from "@/hooks/useProgramVisibilityRules";
import { useState, useEffect } from "react";

interface AccessTabProps {
  moduleId?: string;
  onChange: () => void;
}

export function AccessTab({ moduleId, onChange }: AccessTabProps) {
  const { rules, createRule, updateRule } = useProgramVisibilityRules(moduleId);
  const [kycLevel, setKycLevel] = useState('any');
  const [badgeRequired, setBadgeRequired] = useState('any');
  const [minBalance, setMinBalance] = useState([0]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['India']);

  useEffect(() => {
    if (rules && rules.length > 0) {
      const kycRule = rules.find(r => r.rule_type === 'kyc_level');
      const badgeRule = rules.find(r => r.rule_type === 'badge');
      const balanceRule = rules.find(r => r.rule_type === 'balance_threshold');
      const regionRule = rules.find(r => r.rule_type === 'region');

      if (kycRule) setKycLevel(kycRule.rule_config?.level || 'any');
      if (badgeRule) setBadgeRequired(badgeRule.rule_config?.badge || 'any');
      if (balanceRule) setMinBalance([balanceRule.rule_config?.minimum || 0]);
      if (regionRule) setSelectedRegions(regionRule.rule_config?.regions || ['India']);
    }
  }, [rules]);

  const saveRules = () => {
    if (!moduleId) return;

    const kycRule = {
      module_id: moduleId,
      rule_type: 'kyc_level' as const,
      rule_config: { level: kycLevel },
      priority: 1,
      is_active: kycLevel !== 'any'
    };

    const badgeRule = {
      module_id: moduleId,
      rule_type: 'badge' as const,
      rule_config: { badge: badgeRequired },
      priority: 2,
      is_active: badgeRequired !== 'any'
    };

    const balanceRule = {
      module_id: moduleId,
      rule_type: 'balance_threshold' as const,
      rule_config: { minimum: minBalance[0] },
      priority: 3,
      is_active: minBalance[0] > 0
    };

    const regionRule = {
      module_id: moduleId,
      rule_type: 'region' as const,
      rule_config: { regions: selectedRegions },
      priority: 4,
      is_active: true
    };

    // Create or update rules
    [kycRule, badgeRule, balanceRule, regionRule].forEach(rule => {
      const existing = rules?.find(r => r.rule_type === rule.rule_type);
      if (existing) {
        updateRule({ id: existing.id, updates: rule });
      } else {
        createRule(rule);
      }
    });

    onChange();
  };

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev => 
      prev.includes(region) 
        ? prev.filter(r => r !== region)
        : [...prev, region]
    );
  };

  const applyTemplate = (template: string) => {
    switch (template) {
      case 'all':
        setKycLevel('any');
        setBadgeRequired('any');
        setMinBalance([0]);
        setSelectedRegions(['India', 'USA', 'UK', 'Canada', 'Australia']);
        break;
      case 'verified':
        setKycLevel('L1');
        setBadgeRequired('any');
        setMinBalance([0]);
        break;
      case 'vip':
        setKycLevel('L2');
        setBadgeRequired('gold');
        setMinBalance([5000]);
        break;
      case 'high_value':
        setKycLevel('L1');
        setBadgeRequired('silver');
        setMinBalance([10000]);
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Rule Builder */}
      <CleanCard padding="lg">
        <h3 className="text-sm font-semibold mb-4">
          Access Rules
        </h3>

        <div className="space-y-4">
          {/* KYC Level */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              KYC Level Required
            </Label>
            <Select value={kycLevel} onValueChange={setKycLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any KYC Level</SelectItem>
                <SelectItem value="L0">L0 - Basic Info</SelectItem>
                <SelectItem value="L1">L1 - ID Verified</SelectItem>
                <SelectItem value="L2">L2 - Fully Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Badge Level */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Badge Requirement
            </Label>
            <Select value={badgeRequired} onValueChange={setBadgeRequired}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Badge</SelectItem>
                <SelectItem value="bronze">Bronze or Higher</SelectItem>
                <SelectItem value="silver">Silver or Higher</SelectItem>
                <SelectItem value="gold">Gold or Higher</SelectItem>
                <SelectItem value="platinum">Platinum or Higher</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Balance Threshold */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Minimum Balance
            </Label>
            <div className="space-y-2">
              <Slider
                value={minBalance}
                onValueChange={setMinBalance}
                max={10000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 BSK</span>
                <span className="text-foreground font-medium">{minBalance[0].toLocaleString()} BSK</span>
                <span>10,000 BSK</span>
              </div>
            </div>
          </div>

          {/* Region Selection */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Available Regions
            </Label>
            <div className="flex flex-wrap gap-2">
              {['India', 'USA', 'UK', 'Canada', 'Australia'].map((region) => {
                const isSelected = selectedRegions.includes(region);
                return (
                  <button
                    key={region}
                    onClick={() => toggleRegion(region)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {region}
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={saveRules} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save Access Rules
          </Button>
        </div>
      </CleanCard>

      {/* Preview */}
      <CleanCard padding="lg">
        <h3 className="text-sm font-semibold mb-4">
          Access Preview
        </h3>
        <div className="p-4 bg-muted rounded-lg border">
          <p className="text-sm mb-2">
            Estimated Reach: <span className="font-bold">~2,340 users</span>
          </p>
          <p className="text-xs text-muted-foreground">
            18% of total user base
          </p>
        </div>
      </CleanCard>

      {/* Templates */}
      <CleanCard padding="lg">
        <h3 className="text-sm font-semibold mb-4">
          Quick Templates
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => applyTemplate('all')}
            className="p-3 bg-muted rounded-lg border hover:border-primary transition-colors text-left"
          >
            <p className="text-sm font-medium">
              All Users
            </p>
            <p className="text-xs text-muted-foreground">
              No restrictions
            </p>
          </button>
          <button 
            onClick={() => applyTemplate('verified')}
            className="p-3 bg-muted rounded-lg border hover:border-primary transition-colors text-left"
          >
            <p className="text-sm font-medium">
              Verified Only
            </p>
            <p className="text-xs text-muted-foreground">
              KYC L1+
            </p>
          </button>
          <button 
            onClick={() => applyTemplate('vip')}
            className="p-3 bg-muted rounded-lg border hover:border-primary transition-colors text-left"
          >
            <p className="text-sm font-medium">
              VIP Users
            </p>
            <p className="text-xs text-muted-foreground">
              Gold+ badge
            </p>
          </button>
          <button 
            onClick={() => applyTemplate('high_value')}
            className="p-3 bg-muted rounded-lg border hover:border-primary transition-colors text-left"
          >
            <p className="text-sm font-medium">
              High Value
            </p>
            <p className="text-xs text-muted-foreground">
              5000+ BSK
            </p>
          </button>
        </div>
      </CleanCard>
    </div>
  );
}
