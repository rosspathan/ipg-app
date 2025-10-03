import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ManualBSKPurchaseForm() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: "",
    purchase_amount: "",
    bscscan_link: "",
    transaction_hash: "",
  });

  const calculateFee = () => {
    if (!settings || !formData.purchase_amount) return 0;
    const amount = parseFloat(formData.purchase_amount);
    const percentFee = (amount * (settings.fee_percent || 0)) / 100;
    const totalFee = percentFee + (settings.fee_fixed || 0);
    return totalFee;
  };

  const calculateTotal = () => {
    if (!formData.purchase_amount) return 0;
    const amount = parseFloat(formData.purchase_amount);
    return amount + calculateFee();
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("bsk_purchase_settings")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load purchase settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const uploadScreenshot = async (userId: string) => {
    if (!screenshot) return null;

    const fileExt = screenshot.name.split(".").pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("purchase-proofs")
      .upload(fileName, screenshot);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("purchase-proofs")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in",
          variant: "destructive",
        });
        return;
      }

      // Upload screenshot
      const screenshotUrl = await uploadScreenshot(user.id);

      // Create purchase request
      const { error } = await supabase
        .from("bsk_manual_purchase_requests")
        .insert({
          user_id: user.id,
          email: formData.email,
          purchase_amount: parseFloat(formData.purchase_amount),
          bscscan_link: formData.bscscan_link,
          transaction_hash: formData.transaction_hash,
          screenshot_url: screenshotUrl,
          admin_bep20_address: settings.admin_bep20_address,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your purchase request has been submitted for review",
      });

      // Reset form
      setFormData({
        email: "",
        purchase_amount: "",
        bscscan_link: "",
        transaction_hash: "",
      });
      setScreenshot(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(settings.admin_bep20_address);
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    });
  };

  if (loading) {
    return <div className="text-center p-8">Loading...</div>;
  }

  if (!settings) {
    return (
      <Alert>
        <AlertDescription>
          Manual BSK purchases are currently not available. Please check back later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Purchase BSK Manually</CardTitle>
        <CardDescription>
          Send payment to our BEP20 address and submit proof for verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Payment Address */}
        <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
              1
            </div>
            <h3 className="font-semibold text-lg">Send Payment</h3>
          </div>
          <div className="space-y-2 pl-10">
            <Label>Admin BEP20 Address (BNB Smart Chain)</Label>
            <div className="flex gap-2">
              <Input
                value={settings.admin_bep20_address}
                readOnly
                className="font-mono text-sm"
              />
              <Button size="icon" variant="outline" onClick={copyAddress}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Purchase Range: {settings.min_purchase_amount.toLocaleString()} - {settings.max_purchase_amount.toLocaleString()} BSK
            </p>
            {settings.instructions && (
              <p className="text-sm text-muted-foreground mt-2">
                {settings.instructions}
              </p>
            )}
          </div>
        </div>

        {/* Step 2: Submit Proof */}
        <div className="space-y-3 p-4 bg-accent/5 rounded-lg border border-accent/20">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent font-bold">
              2
            </div>
            <h3 className="font-semibold text-lg">Submit Proof</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 pl-10">
            <div className="space-y-2">
              <Label htmlFor="email">Your Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Purchase Amount (BSK) *</Label>
              <Input
                id="amount"
                type="number"
                min={settings.min_purchase_amount}
                max={settings.max_purchase_amount}
                value={formData.purchase_amount}
                onChange={(e) => setFormData({ ...formData, purchase_amount: e.target.value })}
                placeholder="10000"
                required
              />
              {formData.purchase_amount && (
                <div className="p-3 bg-muted/50 rounded-md space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Purchase Amount:</span>
                    <span className="font-mono">{parseFloat(formData.purchase_amount).toLocaleString()} BSK</span>
                  </div>
                  {(settings.fee_percent > 0 || settings.fee_fixed > 0) && (
                    <>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Fee:</span>
                        <span className="font-mono">
                          {calculateFee().toFixed(2)} BSK
                          {settings.fee_percent > 0 && ` (${settings.fee_percent}%`}
                          {settings.fee_percent > 0 && settings.fee_fixed > 0 && " + "}
                          {settings.fee_fixed > 0 && `${settings.fee_fixed} BSK`}
                          {(settings.fee_percent > 0 || settings.fee_fixed > 0) && ")"}
                        </span>
                      </div>
                      <div className="flex justify-between font-semibold pt-1 border-t">
                        <span>Total to Send:</span>
                        <span className="font-mono text-primary">{calculateTotal().toFixed(2)} BSK</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx_hash">Transaction Hash *</Label>
              <Input
                id="tx_hash"
                value={formData.transaction_hash}
                onChange={(e) => setFormData({ ...formData, transaction_hash: e.target.value })}
                placeholder="0x..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bscscan">BSCScan Link *</Label>
              <Input
                id="bscscan"
                type="url"
                value={formData.bscscan_link}
                onChange={(e) => setFormData({ ...formData, bscscan_link: e.target.value })}
                placeholder="https://bscscan.com/tx/0x..."
                required
              />
              {formData.bscscan_link && (
                <a
                  href={formData.bscscan_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View on BSCScan <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="screenshot">Screenshot Proof *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                  className="flex-1"
                />
                {screenshot && (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a screenshot of your transaction
              </p>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Submitting..." : "Submit Purchase Request"}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
