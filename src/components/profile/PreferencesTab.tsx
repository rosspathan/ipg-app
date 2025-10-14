import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Globe, Palette, Clock, DollarSign } from "lucide-react";
import { usePreferences } from "@/hooks/usePreferences";
import { useTheme } from "next-themes";

export const PreferencesTab = () => {
  const { settings, loading, updateSettings } = usePreferences();
  const { theme, setTheme } = useTheme();
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
            Additional Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <p>More preference options will be available soon, including:</p>
            <ul className="mt-2 space-y-1">
              <li>• Language selection</li>
              <li>• Dark/Light theme</li>
              <li>• Auto-lock settings</li>
              <li>• Regional formats</li>
            </ul>
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