import { useState, useEffect } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const NotificationPreferences = () => {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    email_enabled: true,
    sms_enabled: false,
    remind_3_days_before: true,
    remind_1_day_before: true,
    remind_on_due_date: true,
    remind_overdue: true,
  });

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("bsk_loan_notification_preferences")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences
        const { error: insertError } = await supabase
          .from("bsk_loan_notification_preferences")
          .insert({
            user_id: user?.id,
            ...preferences,
          });

        if (insertError) throw insertError;
      }
    } catch (error: any) {
      console.error("Error loading preferences:", error);
      toast.error("Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: string, value: boolean) => {
    try {
      const newPreferences = { ...preferences, [key]: value };
      setPreferences(newPreferences);

      const { error } = await supabase
        .from("bsk_loan_notification_preferences")
        .upsert({
          user_id: user?.id,
          ...newPreferences,
        });

      if (error) throw error;

      toast.success("Preferences updated");
    } catch (error: any) {
      console.error("Error updating preference:", error);
      toast.error("Failed to update preferences");
      loadPreferences(); // Revert on error
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Manage how you receive loan payment reminders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Channels */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Notification Channels</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="email" className="cursor-pointer">
                  Email Notifications
                </Label>
              </div>
              <Switch
                id="email"
                checked={preferences.email_enabled}
                onCheckedChange={(checked) => updatePreference("email_enabled", checked)}
              />
            </div>
            <div className="flex items-center justify-between opacity-50">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="sms" className="cursor-pointer">
                  SMS Notifications
                </Label>
              </div>
              <Switch id="sms" checked={false} disabled />
            </div>
            <p className="text-xs text-muted-foreground">
              SMS notifications coming soon
            </p>
          </div>
        </div>

        {/* Reminder Types */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Reminder Schedule</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="remind_3" className="cursor-pointer">
                3 days before due date
              </Label>
              <Switch
                id="remind_3"
                checked={preferences.remind_3_days_before}
                onCheckedChange={(checked) =>
                  updatePreference("remind_3_days_before", checked)
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="remind_1" className="cursor-pointer">
                1 day before due date
              </Label>
              <Switch
                id="remind_1"
                checked={preferences.remind_1_day_before}
                onCheckedChange={(checked) =>
                  updatePreference("remind_1_day_before", checked)
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="remind_due" className="cursor-pointer">
                On due date
              </Label>
              <Switch
                id="remind_due"
                checked={preferences.remind_on_due_date}
                onCheckedChange={(checked) =>
                  updatePreference("remind_on_due_date", checked)
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="remind_overdue" className="cursor-pointer">
                Overdue reminders
              </Label>
              <Switch
                id="remind_overdue"
                checked={preferences.remind_overdue}
                onCheckedChange={(checked) =>
                  updatePreference("remind_overdue", checked)
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
