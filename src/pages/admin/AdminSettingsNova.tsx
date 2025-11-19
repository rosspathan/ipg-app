import * as React from "react";
import { useState } from "react";
import { CardLane } from "@/components/admin/nova/CardLane";
import { KPIStat } from "@/components/admin/nova/KPIStat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Database, Shield, Mail, Bell, Palette, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAdminTransferControl } from "@/hooks/useAdminTransferControl";

export default function AdminSettingsNova() {
  const { transfersEnabled, isLoading: transferLoading, toggleTransfers, isToggling } = useAdminTransferControl();
  
  const [settings, setSettings] = useState({
    siteName: "I-SMART Platform",
    siteUrl: "https://ismart.app",
    maintenanceMode: false,
    registrationOpen: true,
    emailNotifications: true,
    pushNotifications: true,
    twoFactorRequired: false,
    maxWithdrawalDaily: "50000",
    minDepositAmount: "100",
    tradingFeePercent: "0.1",
  });

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <div data-testid="page-admin-settings" className="space-y-4 pb-6">
      {/* Summary KPIs */}
      <CardLane title="System Status">
        <KPIStat
          label="System Status"
          value="Healthy"
          icon={<Database className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Uptime"
          value="99.9%"
          icon={<Shield className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Active Users"
          value="12,847"
          icon={<Settings className="w-4 h-4" />}
        />
      </CardLane>

      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-heading font-bold text-foreground">
            System Settings
          </h1>
          <Button
            size="sm"
            className="gap-2"
            onClick={handleSave}
          >
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>

        {/* General Settings */}
        <div
          className={cn(
            "p-6 rounded-2xl border space-y-4",
            "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
            "border-[hsl(225_24%_22%/0.16)]"
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-heading font-semibold text-foreground">
              General
            </h2>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Site Name
              </label>
              <Input
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="bg-background/50"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Site URL
              </label>
              <Input
                value={settings.siteUrl}
                onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
                className="bg-background/50"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">Disable access for non-admin users</p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Registration Open</p>
                <p className="text-xs text-muted-foreground">Allow new user registrations</p>
              </div>
              <Switch
                checked={settings.registrationOpen}
                onCheckedChange={(checked) => setSettings({ ...settings, registrationOpen: checked })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">BSK Transfers</p>
                <p className="text-xs text-muted-foreground">Enable user-to-user BSK transfers</p>
              </div>
              <Switch
                checked={transfersEnabled ?? true}
                disabled={transferLoading || isToggling}
                onCheckedChange={(checked) => toggleTransfers(checked)}
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div
          className={cn(
            "p-6 rounded-2xl border space-y-4",
            "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
            "border-[hsl(225_24%_22%/0.16)]"
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-heading font-semibold text-foreground">
              Security
            </h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Require 2FA</p>
                <p className="text-xs text-muted-foreground">Force two-factor authentication for all users</p>
              </div>
              <Switch
                checked={settings.twoFactorRequired}
                onCheckedChange={(checked) => setSettings({ ...settings, twoFactorRequired: checked })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Max Daily Withdrawal (INR)
              </label>
              <Input
                type="number"
                value={settings.maxWithdrawalDaily}
                onChange={(e) => setSettings({ ...settings, maxWithdrawalDaily: e.target.value })}
                className="bg-background/50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Min Deposit Amount (INR)
              </label>
              <Input
                type="number"
                value={settings.minDepositAmount}
                onChange={(e) => setSettings({ ...settings, minDepositAmount: e.target.value })}
                className="bg-background/50"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div
          className={cn(
            "p-6 rounded-2xl border space-y-4",
            "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
            "border-[hsl(225_24%_22%/0.16)]"
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-heading font-semibold text-foreground">
              Notifications
            </h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Send system emails to users</p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Push Notifications</p>
                <p className="text-xs text-muted-foreground">Enable push notifications</p>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => setSettings({ ...settings, pushNotifications: checked })}
              />
            </div>
          </div>
        </div>

        {/* Trading Settings */}
        <div
          className={cn(
            "p-6 rounded-2xl border space-y-4",
            "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
            "border-[hsl(225_24%_22%/0.16)]"
          )}
        >
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-heading font-semibold text-foreground">
              Trading
            </h2>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Trading Fee (%)
              </label>
              <Input
                type="number"
                step="0.01"
                value={settings.tradingFeePercent}
                onChange={(e) => setSettings({ ...settings, tradingFeePercent: e.target.value })}
                className="bg-background/50"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
