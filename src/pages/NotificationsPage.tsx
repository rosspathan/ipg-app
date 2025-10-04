import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, Mail, MessageSquare, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export function NotificationsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    push: true,
    email: true,
    trading: true,
    programs: true,
    referrals: true,
    security: true
  });

  const handleBack = () => navigate("/app/profile");

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      toast({ title: "Updated", description: "Notification settings saved" });
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-32" data-testid="page-notify">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">Notifications</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 pt-6 px-4">
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <h3 className="font-heading text-base font-bold text-foreground mb-4">
            Notification Channels
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">In-app alerts</p>
                </div>
              </div>
              <Switch
                checked={settings.push}
                onCheckedChange={() => handleToggle('push')}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Important updates</p>
                </div>
              </div>
              <Switch
                checked={settings.email}
                onCheckedChange={() => handleToggle('email')}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <h3 className="font-heading text-base font-bold text-foreground mb-4">
            Alert Categories
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-success" />
                <p className="text-sm font-medium text-foreground">Trading Alerts</p>
              </div>
              <Switch
                checked={settings.trading}
                onCheckedChange={() => handleToggle('trading')}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-accent" />
                <p className="text-sm font-medium text-foreground">Program Updates</p>
              </div>
              <Switch
                checked={settings.programs}
                onCheckedChange={() => handleToggle('programs')}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}