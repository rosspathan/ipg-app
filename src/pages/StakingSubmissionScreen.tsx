import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Upload, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StakingSubmissionScreen() {
  const { poolId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pool, setPool] = useState<any>(null);
  const [bep20Address, setBep20Address] = useState("");
  const [copied, setCopied] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    amount: "",
    currency: "",
  });
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadPoolData();
    loadBep20Address();
  }, [poolId]);

  const loadPoolData = async () => {
    if (!poolId) return;
    
    try {
      const { data, error } = await supabase
        .from("staking_pools")
        .select("*")
        .eq("id", poolId)
        .single();

      if (error) throw error;
      setPool(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      navigate("/staking");
    }
  };

  const loadBep20Address = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "staking_admin_bep20_address")
        .single();

      if (error) throw error;
      setBep20Address(data?.value || "");
    } catch (error: any) {
      console.error("Error loading BEP20 address:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(bep20Address);
    setCopied(true);
    toast({ title: "Address copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Validate
      if (!formData.email || !formData.amount || !formData.currency || !screenshot) {
        toast({
          title: "Error",
          description: "Please fill all fields and upload a screenshot",
          variant: "destructive",
        });
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to submit",
          variant: "destructive",
        });
        return;
      }

      // Upload screenshot
      const fileExt = screenshot.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("staking-proofs")
        .upload(fileName, screenshot);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("staking-proofs")
        .getPublicUrl(fileName);

      // Create submission
      const { error: insertError } = await supabase
        .from("user_staking_submissions")
        .insert({
          user_id: user.id,
          pool_id: poolId,
          user_email: formData.email,
          stake_amount: parseFloat(formData.amount),
          currency: formData.currency,
          screenshot_url: publicUrl,
          admin_bep20_address: bep20Address,
          status: "pending",
        });

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Your staking submission has been sent for review",
      });

      navigate("/staking");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!pool) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/staking")}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Staking
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Submit Staking: {pool.name}</span>
            <Badge variant="outline">{pool.apy}% APY</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">Instructions:</h3>
            <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
              <li>Copy the BEP20 address below</li>
              <li>Send your crypto to this address from your wallet</li>
              <li>Take a screenshot of the transaction</li>
              <li>Fill in the form below and upload the screenshot</li>
              <li>Wait for admin approval</li>
            </ol>
          </div>

          {/* BEP20 Address */}
          <div className="space-y-2">
            <Label>Admin BEP20 Wallet Address</Label>
            <div className="flex gap-2">
              <Input
                value={bep20Address}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopyAddress}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Send your crypto to this address on the BEP20 network
            </p>
          </div>

          {/* Pool Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">APY</p>
              <p className="font-semibold">{pool.apy}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Lock Period</p>
              <p className="font-semibold">
                {pool.has_lock_period ? `${pool.lock_period_days} days` : "Flexible"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Min Stake</p>
              <p className="font-semibold">{pool.min_stake_amount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reward Distribution</p>
              <p className="font-semibold capitalize">{pool.reward_distribution}</p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4 pt-4 border-t">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Stake Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.00000001"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  placeholder="e.g., BTC, ETH, USDT"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="screenshot">Transfer Screenshot *</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                {previewUrl ? (
                  <div className="space-y-2">
                    <img
                      src={previewUrl}
                      alt="Screenshot preview"
                      className="max-h-48 mx-auto rounded"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScreenshot(null);
                        setPreviewUrl(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload transaction screenshot
                    </p>
                    <input
                      id="screenshot"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("screenshot")?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Staking Request"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
