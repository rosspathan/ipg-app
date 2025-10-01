import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, Bell, Shield, Database, Globe, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminSettingsNova() {
  const [notifications, setNotifications] = useState(true);
  const [maintenance, setMaintenance] = useState(false);

  const settingSections = [
    {
      id: "general",
      title: "General Settings",
      icon: Settings,
      items: [
        { label: "Platform Name", value: "IPG Admin" },
        { label: "Default Currency", value: "USDT" },
        { label: "Timezone", value: "UTC" },
      ],
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: Bell,
      items: [
        { label: "Email Alerts", value: "Enabled" },
        { label: "SMS Alerts", value: "Disabled" },
        { label: "Push Notifications", value: "Enabled" },
      ],
    },
    {
      id: "security",
      title: "Security",
      icon: Shield,
      items: [
        { label: "2FA Required", value: "Admin Only" },
        { label: "Session Timeout", value: "30 minutes" },
        { label: "IP Whitelist", value: "Enabled" },
      ],
    },
    {
      id: "database",
      title: "Database",
      icon: Database,
      items: [
        { label: "Backup Frequency", value: "Daily" },
        { label: "Retention Period", value: "90 days" },
        { label: "Last Backup", value: "2 hours ago" },
      ],
    },
  ];

  return (
    <div data-testid="page-admin-settings" className="space-y-4 p-4 pb-6">
      <h1 className="text-xl font-heading font-bold text-foreground">
        Settings
      </h1>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className={cn(
            "p-4 rounded-2xl border",
            "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
            "border-[hsl(225_24%_22%/0.16)]"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Notifications</p>
            <Bell className="w-4 h-4 text-muted-foreground" />
          </div>
          <Switch
            checked={notifications}
            onCheckedChange={setNotifications}
          />
        </div>

        <div
          className={cn(
            "p-4 rounded-2xl border",
            "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
            maintenance
              ? "border-warning/20 bg-warning/5"
              : "border-[hsl(225_24%_22%/0.16)]"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Maintenance Mode</p>
            <Shield className="w-4 h-4 text-muted-foreground" />
          </div>
          <Switch
            checked={maintenance}
            onCheckedChange={setMaintenance}
          />
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-3">
        {settingSections.map((section) => (
          <div
            key={section.id}
            className={cn(
              "p-4 rounded-2xl border",
              "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
              "border-[hsl(225_24%_22%/0.16)]"
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <section.icon className="w-4 h-4" />
              </div>
              <h2 className="text-base font-heading font-semibold text-foreground">
                {section.title}
              </h2>
            </div>

            <div className="space-y-3">
              {section.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2"
                >
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <Badge
                    variant="outline"
                    className="bg-accent/10 text-accent border-accent/20"
                  >
                    {item.value}
                  </Badge>
                </div>
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full mt-4 bg-transparent border-[hsl(225_24%_22%/0.16)]"
              onClick={() => console.log("Edit", section.id)}
            >
              Edit {section.title}
            </Button>
          </div>
        ))}
      </div>

      {/* System Info */}
      <div
        className={cn(
          "p-4 rounded-2xl border",
          "bg-[hsl(229_30%_16%/0.5)] backdrop-blur-sm",
          "border-[hsl(225_24%_22%/0.16)]"
        )}
      >
        <h3 className="text-sm font-medium text-foreground mb-3">System Info</h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Version</span>
            <span className="text-foreground">3.2.1</span>
          </div>
          <div className="flex justify-between">
            <span>Environment</span>
            <span className="text-foreground">Production</span>
          </div>
          <div className="flex justify-between">
            <span>Uptime</span>
            <span className="text-foreground">12 days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
