import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Users, User, Loader2, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const notificationTypes = {
  system: "System",
  security: "Security",
  funding: "Funding",
  trade: "Trading",
  programs: "Programs",
  marketing: "Marketing",
};

export const AdminNotificationsScreen = () => {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    target_type: "user", // user | all
    target_email: "",
    type: "system",
    title: "",
    body: "",
    link_url: "",
    meta: "",
  });
  
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.body) {
      toast({
        title: "Validation error",
        description: "Title and body are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSending(true);

      let targetUserIds: string[] = [];

      if (formData.target_type === "user") {
        if (!formData.target_email) {
          throw new Error("User email is required");
        }

        // Find user by email
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('email', formData.target_email)
          .single();

        if (profileError || !profileData) {
          throw new Error("User not found with that email");
        }

        targetUserIds = [profileData.user_id];
      } else {
        // Get all user IDs
        const { data: allProfiles, error: allProfilesError } = await supabase
          .from('profiles')
          .select('user_id');

        if (allProfilesError) throw allProfilesError;
        
        targetUserIds = allProfiles?.map(p => p.user_id) || [];
      }

      if (targetUserIds.length === 0) {
        throw new Error("No target users found");
      }

      // Parse meta JSON if provided
      let metaObj = {};
      if (formData.meta.trim()) {
        try {
          metaObj = JSON.parse(formData.meta);
        } catch {
          throw new Error("Invalid JSON in meta field");
        }
      }

      // Create notifications for all target users
      const notifications = targetUserIds.map(userId => ({
        user_id: userId,
        type: formData.type,
        title: formData.title,
        body: formData.body,
        link_url: formData.link_url || null,
        meta: metaObj,
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;

      toast({
        title: "Notifications sent",
        description: `Successfully sent ${notifications.length} notification(s)`,
      });

      // Reset form
      setFormData({
        target_type: "user",
        target_email: "",
        type: "system",
        title: "",
        body: "",
        link_url: "",
        meta: "",
      });

    } catch (error: any) {
      toast({
        title: "Error sending notifications",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Notifications Broadcaster
        </h1>
        <p className="text-muted-foreground">Send notifications to users</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Notification</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Target Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Target Audience</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="target-user"
                  checked={formData.target_type === "user"}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      target_type: checked ? "user" : "all",
                      target_email: checked ? prev.target_email : ""
                    }))
                  }
                />
                <Label htmlFor="target-user" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Specific User
                </Label>
              </div>
              
              {formData.target_type === "user" && (
                <div>
                  <Label htmlFor="target_email">User Email</Label>
                  <Input
                    id="target_email"
                    type="email"
                    value={formData.target_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_email: e.target.value }))}
                    placeholder="user@example.com"
                  />
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="target-all"
                  checked={formData.target_type === "all"}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      target_type: checked ? "all" : "user"
                    }))
                  }
                />
                <Label htmlFor="target-all" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  All Users
                </Label>
              </div>
            </div>

            {/* Notification Type */}
            <div>
              <Label htmlFor="type">Notification Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(notificationTypes).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Notification title"
                required
              />
            </div>

            {/* Body */}
            <div>
              <Label htmlFor="body">Message Body</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Notification message content"
                rows={4}
                required
              />
            </div>

            {/* Link URL */}
            <div>
              <Label htmlFor="link_url">Link URL (optional)</Label>
              <Input
                id="link_url"
                value={formData.link_url}
                onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                placeholder="/app/markets or https://external-link.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Internal links (starting with /) will navigate within the app. External links will open in new tab.
              </p>
            </div>

            {/* Meta JSON */}
            <div>
              <Label htmlFor="meta">Metadata (optional JSON)</Label>
              <Textarea
                id="meta"
                value={formData.meta}
                onChange={(e) => setFormData(prev => ({ ...prev, meta: e.target.value }))}
                placeholder='{"key": "value", "data": 123}'
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Additional data as JSON object (optional)
              </p>
            </div>

            {/* Preview */}
            {formData.title && formData.body && (
              <div className="border rounded-lg p-4 bg-accent/50">
                <Label className="text-sm font-medium">Preview</Label>
                <div className="mt-2 space-y-1">
                  <div className="font-medium text-sm">{formData.title}</div>
                  <div className="text-sm text-muted-foreground">{formData.body}</div>
                  {formData.link_url && (
                    <div className="text-xs text-blue-600">🔗 {formData.link_url}</div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" disabled={sending} className="w-full">
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                  {formData.target_type === "all" && " to All Users"}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};