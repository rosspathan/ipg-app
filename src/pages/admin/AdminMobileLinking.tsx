import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Save, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MobileLinkingSettings {
  id?: string;
  host: string;
  ref_base_path: string;
  capture_stage: string;
  lock_policy: string;
  allow_sponsor_change_before_lock: boolean;
  self_referral_block: boolean;
  code_length: number;
  android_package_name_release?: string;
  sha256_fingerprints_release: string[];
  android_package_name_debug?: string;
  sha256_fingerprints_debug: string[];
  custom_scheme: string;
  play_store_fallback_url?: string;
  whatsapp_template: string;
}

export default function AdminMobileLinking() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<MobileLinkingSettings>({
    host: "https://i-smartapp.com",
    ref_base_path: "/r",
    capture_stage: "after_email_verify",
    lock_policy: "email_verified",
    allow_sponsor_change_before_lock: false,
    self_referral_block: true,
    code_length: 8,
    sha256_fingerprints_release: [],
    sha256_fingerprints_debug: [],
    custom_scheme: "ismart",
    whatsapp_template: "Join me on IPG I-SMART! Use my link: {{link}} 🚀"
  });

  // Fingerprints as text (one per line)
  const [releaseFingerprintsText, setReleaseFingerprintsText] = useState("");
  const [debugFingerprintsText, setDebugFingerprintsText] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mobile_linking_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(data as MobileLinkingSettings);
        setReleaseFingerprintsText((data.sha256_fingerprints_release || []).join('\n'));
        setDebugFingerprintsText((data.sha256_fingerprints_debug || []).join('\n'));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load mobile linking settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateFingerprints = (text: string): string[] => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => /^[A-F0-9:]+$/i.test(line));
  };

  const generateAssetLinks = async () => {
    const releaseFp = validateFingerprints(releaseFingerprintsText);
    const debugFp = validateFingerprints(debugFingerprintsText);

    const assetLinks: any[] = [];

    if (settings.android_package_name_release && releaseFp.length > 0) {
      assetLinks.push({
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: settings.android_package_name_release,
          sha256_cert_fingerprints: releaseFp
        }
      });
    }

    if (settings.android_package_name_debug && debugFp.length > 0) {
      assetLinks.push({
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: settings.android_package_name_debug,
          sha256_cert_fingerprints: debugFp
        }
      });
    }

    return assetLinks;
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate fingerprints
      const releaseFp = validateFingerprints(releaseFingerprintsText);
      const debugFp = validateFingerprints(debugFingerprintsText);

      const updatedSettings = {
        ...settings,
        sha256_fingerprints_release: releaseFp,
        sha256_fingerprints_debug: debugFp
      };

      // Upsert settings
      const { error } = await supabase
        .from('mobile_linking_settings')
        .upsert(updatedSettings, { onConflict: 'id' });

      if (error) throw error;

      // Generate and write assetlinks.json
      const assetLinks = await generateAssetLinks();
      const assetLinksContent = JSON.stringify(assetLinks, null, 2);
      
      console.log('Generated assetlinks.json:', assetLinksContent);

      // Log to audit
      await supabase.from('audit_logs').insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'mobile_linking_settings_updated',
        resource_type: 'mobile_linking_settings',
        resource_id: settings.id,
        new_values: updatedSettings
      });

      toast({
        title: "Saved",
        description: "Mobile linking settings updated successfully"
      });

      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32" data-testid="admin-mobile-linking">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">Mobile Linking</span>
          </button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="space-y-6 p-4">
        {/* Universal Link Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Universal Link Settings</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="host">Host URL</Label>
              <Input
                id="host"
                value={settings.host}
                onChange={(e) => setSettings({ ...settings, host: e.target.value })}
                placeholder="https://i-smartapp.com"
              />
            </div>

            <div>
              <Label htmlFor="ref_base_path">Referral Base Path</Label>
              <Input
                id="ref_base_path"
                value={settings.ref_base_path}
                onChange={(e) => setSettings({ ...settings, ref_base_path: e.target.value })}
                placeholder="/r"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Full link: {settings.host}{settings.ref_base_path}/[CODE]
              </p>
            </div>

            <div>
              <Label htmlFor="code_length">Code Length (6-10)</Label>
              <Input
                id="code_length"
                type="number"
                min={6}
                max={10}
                value={settings.code_length}
                onChange={(e) => setSettings({ ...settings, code_length: parseInt(e.target.value) || 8 })}
              />
            </div>
          </div>
        </Card>

        {/* Capture & Lock Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Capture & Lock Settings</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="capture_stage">Capture Stage</Label>
              <Select
                value={settings.capture_stage}
                onValueChange={(value) => setSettings({ ...settings, capture_stage: value })}
              >
                <SelectTrigger id="capture_stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_first_open">On First Open</SelectItem>
                  <SelectItem value="after_email_verify">After Email Verify</SelectItem>
                  <SelectItem value="after_wallet_create">After Wallet Create</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="lock_policy">Lock Policy</Label>
              <Select
                value={settings.lock_policy}
                onValueChange={(value) => setSettings({ ...settings, lock_policy: value })}
              >
                <SelectTrigger id="lock_policy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_verified">Email Verified</SelectItem>
                  <SelectItem value="first_touch_wins">First Touch Wins</SelectItem>
                  <SelectItem value="wallet_created">Wallet Created</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="allow_sponsor_change">Allow Sponsor Change Before Lock</Label>
              <Switch
                id="allow_sponsor_change"
                checked={settings.allow_sponsor_change_before_lock}
                onCheckedChange={(checked) => setSettings({ ...settings, allow_sponsor_change_before_lock: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="self_referral_block">Block Self-Referrals</Label>
              <Switch
                id="self_referral_block"
                checked={settings.self_referral_block}
                onCheckedChange={(checked) => setSettings({ ...settings, self_referral_block: checked })}
              />
            </div>
          </div>
        </Card>

        {/* Android App Links */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Android App Links</h3>
          
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              To obtain SHA-256 fingerprints, run:<br />
              <code className="text-xs bg-muted px-2 py-1 rounded mt-2 block">
                keytool -list -v -alias &lt;alias&gt; -keystore &lt;keystore&gt;.jks | grep 'SHA-256'
              </code>
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <Label htmlFor="android_package_release">Release Package Name</Label>
              <Input
                id="android_package_release"
                value={settings.android_package_name_release || ''}
                onChange={(e) => setSettings({ ...settings, android_package_name_release: e.target.value })}
                placeholder="com.ismart.exchange"
              />
            </div>

            <div>
              <Label htmlFor="release_fingerprints">Release SHA-256 Fingerprints (one per line)</Label>
              <Textarea
                id="release_fingerprints"
                value={releaseFingerprintsText}
                onChange={(e) => setReleaseFingerprintsText(e.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
                rows={3}
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label htmlFor="android_package_debug">Debug Package Name (optional)</Label>
              <Input
                id="android_package_debug"
                value={settings.android_package_name_debug || ''}
                onChange={(e) => setSettings({ ...settings, android_package_name_debug: e.target.value })}
                placeholder="com.ismart.exchange.debug"
              />
            </div>

            <div>
              <Label htmlFor="debug_fingerprints">Debug SHA-256 Fingerprints (one per line)</Label>
              <Textarea
                id="debug_fingerprints"
                value={debugFingerprintsText}
                onChange={(e) => setDebugFingerprintsText(e.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"
                rows={3}
                className="font-mono text-xs"
              />
            </div>
          </div>
        </Card>

        {/* Custom Scheme Fallback */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Custom Scheme Fallback</h3>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="custom_scheme">Custom Scheme</Label>
              <Input
                id="custom_scheme"
                value={settings.custom_scheme}
                onChange={(e) => setSettings({ ...settings, custom_scheme: e.target.value })}
                placeholder="ismart"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Link format: {settings.custom_scheme}://r/[CODE]
              </p>
            </div>

            <div>
              <Label htmlFor="play_store_fallback">Play Store Fallback URL (optional)</Label>
              <Input
                id="play_store_fallback"
                value={settings.play_store_fallback_url || ''}
                onChange={(e) => setSettings({ ...settings, play_store_fallback_url: e.target.value })}
                placeholder="https://play.google.com/store/apps/details?id=com.ismart.exchange"
              />
            </div>
          </div>
        </Card>

        {/* Share Templates */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4">Share Templates</h3>
          
          <div>
            <Label htmlFor="whatsapp_template">WhatsApp Template</Label>
            <Textarea
              id="whatsapp_template"
              value={settings.whatsapp_template}
              onChange={(e) => setSettings({ ...settings, whatsapp_template: e.target.value })}
              placeholder="Join me on IPG I-SMART! Use my link: {{link}} 🚀"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use {'{'}{'{'} link {'}'}{'}'} as placeholder for the referral URL
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
