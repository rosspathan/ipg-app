import { Settings, Bell, Shield, Database, Zap } from "lucide-react";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { CleanGrid } from "@/components/admin/clean/CleanGrid";
import { Button } from "@/components/ui/button";

interface SettingSection {
  icon: typeof Settings;
  title: string;
  description: string;
  action: string;
}

const settingSections: SettingSection[] = [
  {
    icon: Bell,
    title: "Notifications",
    description: "Configure email and push notification settings",
    action: "Configure",
  },
  {
    icon: Shield,
    title: "Security",
    description: "Manage security policies and access controls",
    action: "Manage",
  },
  {
    icon: Database,
    title: "Database",
    description: "View database status and perform maintenance",
    action: "View",
  },
  {
    icon: Zap,
    title: "Performance",
    description: "Monitor system performance and optimize",
    action: "Monitor",
  },
];

export default function AdminSettingsClean() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[hsl(0_0%_98%)]">Settings</h1>
        <p className="text-sm text-[hsl(220_9%_65%)] mt-1">
          Configure system settings and preferences
        </p>
      </div>

      {/* Settings Grid */}
      <CleanGrid cols={2} gap="md">
        {settingSections.map((section) => (
          <CleanCard 
            key={section.title} 
            padding="lg"
            className="hover:bg-[hsl(220_13%_12%)] transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-[hsl(262_100%_65%/0.1)] shrink-0">
                <section.icon className="w-6 h-6 text-[hsl(262_100%_65%)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-[hsl(0_0%_98%)] mb-1">
                  {section.title}
                </h3>
                <p className="text-sm text-[hsl(220_9%_65%)] mb-4">
                  {section.description}
                </p>
                <Button 
                  size="sm"
                  className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_70%)] text-white h-8"
                >
                  {section.action}
                </Button>
              </div>
            </div>
          </CleanCard>
        ))}
      </CleanGrid>
    </div>
  );
}
