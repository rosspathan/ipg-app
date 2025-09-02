import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Bell, Mail, Smartphone } from "lucide-react";
import { usePreferences } from "@/hooks/usePreferences";

export const NotificationsTab = () => {
  const { notifications, loading, updateNotifications } = usePreferences();
  const [saving, setSaving] = useState(false);

  const handleToggle = async (field: keyof typeof notifications, value: boolean) => {
    if (!notifications) return;
    
    try {
      setSaving(true);
      await updateNotifications({ [field]: value });
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
            <Smartphone className="h-5 w-5" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Transaction Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about deposits, withdrawals, and trades
              </p>
            </div>
            <Switch
              checked={notifications?.tx_push || false}
              onCheckedChange={(value) => handleToggle('tx_push', value)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Marketing & Updates</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates about new features and promotions
              </p>
            </div>
            <Switch
              checked={notifications?.marketing_push || false}
              onCheckedChange={(value) => handleToggle('marketing_push', value)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Transaction Confirmations</Label>
              <p className="text-sm text-muted-foreground">
                Email confirmations for all transactions
              </p>
            </div>
            <Switch
              checked={notifications?.email_tx || false}
              onCheckedChange={(value) => handleToggle('email_tx', value)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">
                Newsletter and promotional emails
              </p>
            </div>
            <Switch
              checked={notifications?.email_marketing || false}
              onCheckedChange={(value) => handleToggle('email_marketing', value)}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Notification Categories</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Security alerts (always enabled)</li>
                <li>• Account status changes</li>
                <li>• Trading price alerts</li>
                <li>• System maintenance notices</li>
              </ul>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Note:</strong> Critical security notifications cannot be disabled and will always be sent via email and push notifications.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {saving && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Updating notification preferences...</span>
        </div>
      )}
    </div>
  );
};