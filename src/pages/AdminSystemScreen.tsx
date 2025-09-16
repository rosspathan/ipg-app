import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Mail, Shield, Server, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  updated_at: string;
  created_at: string;
}

const AdminSystemScreen = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [smtpSettings, setSmtpSettings] = useState({
    smtp_host: '',
    smtp_port: '',
    smtp_user: '',
    smtp_password: '',
    smtp_from_email: '',
    smtp_from_name: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('key');

      if (error) throw error;
      
      const settingsData = data || [];
      setSettings(settingsData);
      
      // Set SMTP settings
      const smtpData: any = {};
      settingsData.forEach(setting => {
        if (setting.key.startsWith('smtp_')) {
          smtpData[setting.key] = setting.value;
        }
      });
      setSmtpSettings(prev => ({ ...prev, ...smtpData }));
      
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load system settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() });

      if (error) throw error;
      
      // Update local state
      setSettings(prev => 
        prev.map(setting => 
          setting.key === key 
            ? { ...setting, value, updated_at: new Date().toISOString() }
            : setting
        )
      );
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const handleSaveSMTP = async () => {
    if (!smtpSettings.smtp_host || !smtpSettings.smtp_port) {
      toast({
        title: "Error",
        description: "SMTP host and port are required",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Update all SMTP settings
      const promises = Object.entries(smtpSettings).map(([key, value]) => 
        updateSetting(key, value)
      );
      
      await Promise.all(promises);
      
      toast({
        title: "Success",
        description: "SMTP settings updated successfully"
      });
      
      fetchSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update SMTP settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      // Call edge function to test email
      const { data, error } = await supabase.functions.invoke('send-verification-email', {
        body: {
          email: smtpSettings.smtp_from_email,
          verificationUrl: `${window.location.origin}/email-verified?test=true`
        }
      });

      if (error) throw error;

      toast({
        title: "Test Email Sent",
        description: `Test email sent to ${smtpSettings.smtp_from_email}`
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test email",
        variant: "destructive"
      });
    }
  };

  const createDefaultAdmin = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-default');
      
      if (error) throw error;
      
      toast({
        title: "Admin Created",
        description: `Default admin created: ${data.adminEmail} / ${data.adminPassword}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create admin",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">Configure application settings and integrations</p>
        </div>
      </div>

      <Tabs defaultValue="email" className="space-y-4">
        <TabsList>
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            Email Settings
          </TabsTrigger>
          <TabsTrigger value="admin">
            <Shield className="w-4 h-4 mr-2" />
            Admin Setup
          </TabsTrigger>
          <TabsTrigger value="system">
            <Server className="w-4 h-4 mr-2" />
            System Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>SMTP Configuration</CardTitle>
              <CardDescription>
                Configure email server settings for verification emails and notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SMTP Host</Label>
                  <Input
                    value={smtpSettings.smtp_host}
                    onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtp_host: e.target.value }))}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <Label>SMTP Port</Label>
                  <Input
                    value={smtpSettings.smtp_port}
                    onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtp_port: e.target.value }))}
                    placeholder="587"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Username/Email</Label>
                  <Input
                    value={smtpSettings.smtp_user}
                    onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtp_user: e.target.value }))}
                    placeholder="admin@ipg-app.com"
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={smtpSettings.smtp_password}
                    onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtp_password: e.target.value }))}
                    placeholder="your-app-password"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>From Email</Label>
                  <Input
                    value={smtpSettings.smtp_from_email}
                    onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtp_from_email: e.target.value }))}
                    placeholder="admin@ipg-app.com"
                  />
                </div>
                <div>
                  <Label>From Name</Label>
                  <Input
                    value={smtpSettings.smtp_from_name}
                    onChange={(e) => setSmtpSettings(prev => ({ ...prev, smtp_from_name: e.target.value }))}
                    placeholder="IPG i-SMART"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2 pt-4">
                <Button onClick={handleSaveSMTP} disabled={saving}>
                  {saving ? "Saving..." : "Save SMTP Settings"}
                </Button>
                <Button variant="outline" onClick={handleTestEmail}>
                  Send Test Email
                </Button>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>For Gmail:</strong> Use your Gmail address and an App Password (not your regular password).
                  Generate an App Password at: myaccount.google.com &gt; Security &gt; 2-Step Verification &gt; App passwords
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Default Admin Credentials</CardTitle>
                <CardDescription>
                  Create default admin account for initial setup
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Default Admin:</strong> admin@ipg-app.com / admin123
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Change this password after first login!
                    </p>
                  </div>
                  
                  <Button onClick={createDefaultAdmin}>
                    Create/Reset Default Admin
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Admin Wallet Addresses</CardTitle>
                <CardDescription>
                  Configure Web3 wallet addresses that can access admin panel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Authorized Wallets (one per line)</Label>
                  <Textarea
                    placeholder="0x1234...&#10;0x5678..."
                    className="min-h-[100px]"
                  />
                  <p className="text-sm text-muted-foreground">
                    Add wallet addresses that should have admin access via Web3 signature
                  </p>
                  <Button variant="outline">
                    Update Admin Wallets
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Application Information</CardTitle>
              </CardHeader>   
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">App Name</p>
                    <p className="text-sm text-muted-foreground">IPG i-SMART</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Version</p>
                    <p className="text-sm text-muted-foreground">1.0.0</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Environment</p>
                    <Badge>Production</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Database</p>
                    <Badge variant="outline">Supabase</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All System Settings</CardTitle>
                <CardDescription>
                  Current configuration values
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {settings.map((setting) => (
                    <div key={setting.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">{setting.key}</p>
                        <p className="text-xs text-muted-foreground">{setting.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground max-w-xs truncate">
                          {setting.key.includes('password') ? '••••••••' : setting.value}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(setting.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSystemScreen;