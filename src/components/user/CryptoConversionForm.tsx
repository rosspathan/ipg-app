import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CryptoSetting {
  id: string;
  crypto_symbol: string;
  crypto_name: string;
  admin_wallet_address: string;
  network: string;
  conversion_rate_bsk: number;
  min_amount: number;
  max_amount: number;
  fee_percent: number;
  fee_fixed: number;
  instructions: string;
}

export function CryptoConversionForm() {
  const [cryptoOptions, setCryptoOptions] = useState<CryptoSetting[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: "",
    crypto_amount: "",
    blockchain_explorer_link: "",
    transaction_hash: "",
  });

  const calculateBSK = () => {
    if (!selectedCrypto || !formData.crypto_amount) return 0;
    const amount = parseFloat(formData.crypto_amount);
    return amount * selectedCrypto.conversion_rate_bsk;
  };

  const calculateFee = () => {
    if (!selectedCrypto || !formData.crypto_amount) return 0;
    const bskAmount = calculateBSK();
    const percentFee = (bskAmount * (selectedCrypto.fee_percent || 0)) / 100;
    const totalFee = percentFee + (selectedCrypto.fee_fixed || 0);
    return totalFee;
  };

  const calculateNetBSK = () => {
    return calculateBSK() - calculateFee();
  };

  useEffect(() => {
    loadCryptoOptions();
  }, []);

  const loadCryptoOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("crypto_conversion_settings")
        .select("*")
        .eq("is_active", true)
        .order("crypto_name");

      if (error) throw error;
      setCryptoOptions(data || []);
      if (data && data.length > 0) {
        setSelectedCrypto(data[0]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load cryptocurrency options",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoChange = (cryptoId: string) => {
    const crypto = cryptoOptions.find((c) => c.id === cryptoId);
    setSelectedCrypto(crypto || null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const uploadScreenshot = async (userId: string) => {
    if (!screenshot) return null;

    const fileExt = screenshot.name.split(".").pop();
    const fileName = `${userId}/crypto-${Date.now()}.${fileExt}`;

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

    if (!selectedCrypto) {
      toast({
        title: "Error",
        description: "Please select a cryptocurrency",
        variant: "destructive",
      });
      return;
    }

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

      // Create conversion request
      const { error } = await supabase
        .from("crypto_conversion_requests")
        .insert({
          user_id: user.id,
          email: formData.email,
          crypto_symbol: selectedCrypto.crypto_symbol,
          crypto_amount: parseFloat(formData.crypto_amount),
          bsk_amount: calculateNetBSK(),
          transaction_hash: formData.transaction_hash,
          blockchain_explorer_link: formData.blockchain_explorer_link,
          screenshot_url: screenshotUrl,
          admin_wallet_address: selectedCrypto.admin_wallet_address,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your conversion request has been submitted for review",
      });

      // Reset form
      setFormData({
        email: "",
        crypto_amount: "",
        blockchain_explorer_link: "",
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
    if (selectedCrypto) {
      navigator.clipboard.writeText(selectedCrypto.admin_wallet_address);
      toast({
        title: "Copied",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  if (loading) {
    return <div className="text-center p-8">Loading...</div>;
  }

  if (cryptoOptions.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          Crypto-to-BSK conversion is currently not available. Please check back later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Convert Crypto to BSK</CardTitle>
        <CardDescription>
          Send cryptocurrency to our wallet and submit proof for conversion to BSK tokens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Crypto Selection */}
        <div className="space-y-2">
          <Label>Select Cryptocurrency</Label>
          <Select onValueChange={handleCryptoChange} defaultValue={selectedCrypto?.id}>
            <SelectTrigger>
              <SelectValue placeholder="Choose crypto" />
            </SelectTrigger>
            <SelectContent>
              {cryptoOptions.map((crypto) => (
                <SelectItem key={crypto.id} value={crypto.id}>
                  {crypto.crypto_name} ({crypto.crypto_symbol}) - {crypto.network}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCrypto && (
          <>
            {/* Step 1: Payment Address */}
            <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                  1
                </div>
                <h3 className="font-semibold text-lg">Send {selectedCrypto.crypto_symbol}</h3>
              </div>
              <div className="space-y-2 pl-10">
                <Label>Admin Wallet Address ({selectedCrypto.network})</Label>
                <div className="flex gap-2">
                  <Input
                    value={selectedCrypto.admin_wallet_address}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button size="icon" variant="outline" onClick={copyAddress}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Amount Range: {selectedCrypto.min_amount} - {selectedCrypto.max_amount} {selectedCrypto.crypto_symbol}
                </p>
                <p className="text-sm text-muted-foreground">
                  Conversion Rate: 1 {selectedCrypto.crypto_symbol} = {selectedCrypto.conversion_rate_bsk} BSK
                </p>
                {selectedCrypto.instructions && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {selectedCrypto.instructions}
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
                  <Label htmlFor="amount">{selectedCrypto.crypto_symbol} Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.00000001"
                    min={selectedCrypto.min_amount}
                    max={selectedCrypto.max_amount}
                    value={formData.crypto_amount}
                    onChange={(e) => setFormData({ ...formData, crypto_amount: e.target.value })}
                    placeholder="0.001"
                    required
                  />
                  {formData.crypto_amount && (
                    <div className="p-3 bg-muted/50 rounded-md space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Crypto Amount:</span>
                        <span className="font-mono">{parseFloat(formData.crypto_amount)} {selectedCrypto.crypto_symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>BSK Equivalent:</span>
                        <span className="font-mono">{calculateBSK().toFixed(2)} BSK</span>
                      </div>
                      {(selectedCrypto.fee_percent > 0 || selectedCrypto.fee_fixed > 0) && (
                        <>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Fee:</span>
                            <span className="font-mono">
                              {calculateFee().toFixed(2)} BSK
                              {selectedCrypto.fee_percent > 0 && ` (${selectedCrypto.fee_percent}%`}
                              {selectedCrypto.fee_percent > 0 && selectedCrypto.fee_fixed > 0 && " + "}
                              {selectedCrypto.fee_fixed > 0 && `${selectedCrypto.fee_fixed} BSK`}
                              {(selectedCrypto.fee_percent > 0 || selectedCrypto.fee_fixed > 0) && ")"}
                            </span>
                          </div>
                          <div className="flex justify-between font-semibold pt-1 border-t">
                            <span>You Will Receive:</span>
                            <span className="font-mono text-primary">{calculateNetBSK().toFixed(2)} BSK</span>
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
                    placeholder="0x... or transaction ID"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="explorer">Blockchain Explorer Link</Label>
                  <Input
                    id="explorer"
                    type="url"
                    value={formData.blockchain_explorer_link}
                    onChange={(e) => setFormData({ ...formData, blockchain_explorer_link: e.target.value })}
                    placeholder="https://..."
                  />
                  {formData.blockchain_explorer_link && (
                    <a
                      href={formData.blockchain_explorer_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      View on Explorer <ExternalLink className="h-3 w-3" />
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
                  {submitting ? "Submitting..." : "Submit Conversion Request"}
                </Button>
              </form>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
