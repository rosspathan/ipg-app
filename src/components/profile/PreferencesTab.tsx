import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Globe, Palette, Clock, DollarSign } from "lucide-react";
import { usePreferences } from "@/hooks/usePreferences";

export const PreferencesTab = () => {
  const { settings, loading, updateSettings } = usePreferences();
  const [saving, setSaving] = useState(false);

  const handleCurrencyChange = async (currency: string) => {
    try {
      setSaving(true);
      await updateSettings({ display_currency: currency });
    } catch (error) {
      // Error handled in hook
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = async (language: string) => {
    try {
      setSaving(true);
      await updateSettings({ language });
    } catch (error) {
      // Error handled in hook
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = async (theme: string) => {
    try {
      setSaving(true);
      await updateSettings({ theme });
    } catch (error) {
      // Error handled in hook
    } finally {
      setSaving(false);
    }
  };

  const handleSessionLockChange = async (minutes: string) => {
    try {
      setSaving(true);
      await updateSettings({ session_lock_minutes: parseInt(minutes) });
    } catch (error) {
      // Error handled in hook
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Display Currency
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Primary Display Currency</Label>
            <p className="text-sm text-muted-foreground">
              All prices and balances will be shown in this currency
            </p>
            <Select 
              value={settings?.display_currency || 'USD'} 
              onValueChange={handleCurrencyChange}
              disabled={saving}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD - US Dollar</SelectItem>
                <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - British Pound</SelectItem>
                <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                <SelectItem value="BTC">BTC - Bitcoin</SelectItem>
                <SelectItem value="ETH">ETH - Ethereum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language & Region
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Interface Language</Label>
            <Select 
              value={settings?.language || 'en'} 
              onValueChange={handleLanguageChange}
              disabled={saving}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                <SelectItem value="es">Español (Spanish)</SelectItem>
                <SelectItem value="fr">Français (French)</SelectItem>
                <SelectItem value="de">Deutsch (German)</SelectItem>
                <SelectItem value="zh">中文 (Chinese)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Theme</Label>
            <p className="text-sm text-muted-foreground">
              Choose your preferred color scheme
            </p>
            <Select 
              value={settings?.theme || 'system'} 
              onValueChange={handleThemeChange}
              disabled={saving}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System (Auto)</SelectItem>
                <SelectItem value="light">Light Mode</SelectItem>
                <SelectItem value="dark">Dark Mode</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Auto-Lock Timeout</Label>
            <p className="text-sm text-muted-foreground">
              Automatically lock the app after inactivity
            </p>
            <Select 
              value={settings?.session_lock_minutes?.toString() || '5'} 
              onValueChange={handleSessionLockChange}
              disabled={saving}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 minute</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="0">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {saving && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Saving preferences...</span>
        </div>
      )}
    </div>
  );
};