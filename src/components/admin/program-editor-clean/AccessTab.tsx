import { Shield, Users, TrendingUp, MapPin } from "lucide-react";
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

interface AccessTabProps {
  moduleId?: string;
  onChange: () => void;
}

export function AccessTab({ moduleId, onChange }: AccessTabProps) {
  return (
    <div className="space-y-6">
      {/* Visual Rule Builder */}
      <CleanCard padding="lg">
        <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-4">
          Access Rules
        </h3>

        <div className="space-y-4">
          {/* KYC Level */}
          <div>
            <Label className="text-xs text-[hsl(220_9%_65%)] mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              KYC Level Required
            </Label>
            <Select defaultValue="any">
              <SelectTrigger className="bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%)]">
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
            <Label className="text-xs text-[hsl(220_9%_65%)] mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Badge Requirement
            </Label>
            <Select defaultValue="any">
              <SelectTrigger className="bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%)]">
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
            <Label className="text-xs text-[hsl(220_9%_65%)] mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Minimum Balance
            </Label>
            <div className="space-y-2">
              <Slider
                defaultValue={[0]}
                max={10000}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[hsl(220_9%_46%)]">
                <span>0 BSK</span>
                <span className="text-[hsl(0_0%_98%)]">0 BSK</span>
                <span>10,000 BSK</span>
              </div>
            </div>
          </div>

          {/* Region Selection */}
          <div>
            <Label className="text-xs text-[hsl(220_9%_65%)] mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Available Regions
            </Label>
            <div className="flex flex-wrap gap-2">
              {['India', 'USA', 'UK', 'Canada', 'Australia'].map((region) => (
                <button
                  key={region}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-[hsl(220_13%_10%)] text-[hsl(220_9%_46%)] border border-[hsl(220_13%_14%)] hover:border-[hsl(262_100%_65%)] transition-colors"
                >
                  {region}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CleanCard>

      {/* Preview */}
      <CleanCard padding="lg">
        <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-4">
          Access Preview
        </h3>
        <div className="p-4 bg-[hsl(220_13%_10%)] rounded-lg border border-[hsl(220_13%_14%)]">
          <p className="text-sm text-[hsl(0_0%_98%)] mb-2">
            Estimated Reach: <span className="font-bold">~2,340 users</span>
          </p>
          <p className="text-xs text-[hsl(220_9%_65%)]">
            18% of total user base
          </p>
        </div>
      </CleanCard>

      {/* Templates */}
      <CleanCard padding="lg">
        <h3 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-4">
          Quick Templates
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="p-3 bg-[hsl(220_13%_10%)] rounded-lg border border-[hsl(220_13%_14%)] hover:border-[hsl(262_100%_65%)] transition-colors text-left">
            <p className="text-sm font-medium text-[hsl(0_0%_98%)]">
              All Users
            </p>
            <p className="text-xs text-[hsl(220_9%_65%)]">
              No restrictions
            </p>
          </button>
          <button className="p-3 bg-[hsl(220_13%_10%)] rounded-lg border border-[hsl(220_13%_14%)] hover:border-[hsl(262_100%_65%)] transition-colors text-left">
            <p className="text-sm font-medium text-[hsl(0_0%_98%)]">
              Verified Only
            </p>
            <p className="text-xs text-[hsl(220_9%_65%)]">
              KYC L1+
            </p>
          </button>
          <button className="p-3 bg-[hsl(220_13%_10%)] rounded-lg border border-[hsl(220_13%_14%)] hover:border-[hsl(262_100%_65%)] transition-colors text-left">
            <p className="text-sm font-medium text-[hsl(0_0%_98%)]">
              VIP Users
            </p>
            <p className="text-xs text-[hsl(220_9%_65%)]">
              Gold+ badge
            </p>
          </button>
          <button className="p-3 bg-[hsl(220_13%_10%)] rounded-lg border border-[hsl(220_13%_14%)] hover:border-[hsl(262_100%_65%)] transition-colors text-left">
            <p className="text-sm font-medium text-[hsl(0_0%_98%)]">
              High Value
            </p>
            <p className="text-xs text-[hsl(220_9%_65%)]">
              5000+ BSK
            </p>
          </button>
        </div>
      </CleanCard>
    </div>
  );
}
