import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Globe, Moon, Sun, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useTheme } from "next-themes";

export function SettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const { theme, setTheme } = useTheme();
  
  const [settings, setSettings] = useState({
    darkMode: theme === 'dark',
    language: 'en',
    currency: 'USD',
    timezone: 'UTC'
  });


  const handleBack = () => navigate("/app/profile");

  const handleUpdate = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Apply theme change
    if (key === 'darkMode') {
      setTheme(value ? 'dark' : 'light');
    }
    
    toast({ title: "Updated", description: "Settings saved" });
  };

  return (
    <div className="min-h-screen bg-background pb-32" data-testid="page-settings">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">App Settings</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4 pt-6 px-4">
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <h3 className="font-heading text-base font-bold text-foreground mb-4">
            Appearance
          </h3>

          <div className="flex items-center justify-between p-3 bg-background rounded-lg">
            <div className="flex items-center gap-3">
              {settings.darkMode ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-warning" />}
              <div>
                <p className="text-sm font-medium text-foreground">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Theme preference</p>
              </div>
            </div>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={(val) => handleUpdate('darkMode', val)}
            />
          </div>
        </Card>

        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <h3 className="font-heading text-base font-bold text-foreground mb-4">
            Localization
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Language</p>
              </div>
              <Select
                value={settings.language}
                onValueChange={(val) => handleUpdate('language', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="hi">हिन्दी</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Currency</p>
              <Select
                value={settings.currency}
                onValueChange={(val) => handleUpdate('currency', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Timezone</p>
              <Select
                value={settings.timezone}
                onValueChange={(val) => handleUpdate('timezone', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="EST">EST</SelectItem>
                  <SelectItem value="PST">PST</SelectItem>
                  <SelectItem value="IST">IST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}