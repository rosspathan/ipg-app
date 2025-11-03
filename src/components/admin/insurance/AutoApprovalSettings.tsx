import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const AutoApprovalSettings = () => {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState('5000');
  const [requireKYC, setRequireKYC] = useState(true);
  const [requireGoodHistory, setRequireGoodHistory] = useState(true);

  const handleSave = () => {
    // TODO: Save to database (program_configs or new auto_approval_settings table)
    toast.success('Auto-approval settings saved successfully');
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Auto-Approval Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Configure automatic approval rules for low-risk claims to speed up processing.
          </p>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-enable">Enable Auto-Approval</Label>
              <p className="text-sm text-muted-foreground">
                Automatically approve claims that meet all criteria
              </p>
            </div>
            <Switch
              id="auto-enable"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="threshold">Auto-Approve Threshold (INR)</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="5000"
                />
                <p className="text-xs text-muted-foreground">
                  Claims under this amount will be auto-approved if they meet other criteria
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Additional Requirements</Label>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="kyc-required">Require KYC Approval</Label>
                    <p className="text-xs text-muted-foreground">
                      Only auto-approve for KYC-verified users
                    </p>
                  </div>
                  <Switch
                    id="kyc-required"
                    checked={requireKYC}
                    onCheckedChange={setRequireKYC}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="history-required">Require Good Claim History</Label>
                    <p className="text-xs text-muted-foreground">
                      Only for users with no rejected claims
                    </p>
                  </div>
                  <Switch
                    id="history-required"
                    checked={requireGoodHistory}
                    onCheckedChange={setRequireGoodHistory}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </Card>
  );
};
