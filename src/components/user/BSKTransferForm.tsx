import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Search, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RecipientProfile {
  user_id: string;
  email: string;
  full_name: string | null;
}

export function BSKTransferForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientProfile, setRecipientProfile] = useState<RecipientProfile | null>(null);
  const [amount, setAmount] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [transferRef, setTransferRef] = useState("");

  // Get sender's BSK balance
  const { data: senderBalance } = useQuery({
    queryKey: ["bsk-balance"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_bsk_balances")
        .select("withdrawable_balance")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data?.withdrawable_balance || 0;
    },
  });

  const searchRecipient = async () => {
    if (!recipientEmail.trim()) {
      toast({ title: "Please enter a recipient email", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Search for user by email via profiles table
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .eq("email", recipientEmail.trim().toLowerCase())
        .single();

      if (error || !profiles) {
        toast({ 
          title: "User not found", 
          description: "No user exists with this email address",
          variant: "destructive" 
        });
        setRecipientProfile(null);
        return;
      }

      if (profiles.user_id === user.id) {
        toast({ 
          title: "Cannot transfer to yourself", 
          description: "Please enter a different user's email",
          variant: "destructive" 
        });
        setRecipientProfile(null);
        return;
      }

      setRecipientProfile(profiles as RecipientProfile);
      toast({ title: "User found!", description: `Ready to transfer to ${profiles.email}` });
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
      setRecipientProfile(null);
    } finally {
      setIsSearching(false);
    }
  };

  const transferMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (!recipientProfile) throw new Error("No recipient selected");

      const transferAmount = parseFloat(amount);
      if (isNaN(transferAmount) || transferAmount <= 0) {
        throw new Error("Invalid amount");
      }

      if (transferAmount > (senderBalance || 0)) {
        throw new Error("Insufficient balance");
      }

      // Get current balances
      const { data: senderBal } = await supabase
        .from("user_bsk_balances")
        .select("withdrawable_balance")
        .eq("user_id", user.id)
        .single();

      const { data: recipientBal } = await supabase
        .from("user_bsk_balances")
        .select("withdrawable_balance")
        .eq("user_id", recipientProfile.user_id)
        .maybeSingle();

      const senderBalanceBefore = senderBal?.withdrawable_balance || 0;
      const recipientBalanceBefore = recipientBal?.withdrawable_balance || 0;

      // Update sender balance
      const { error: senderError } = await supabase
        .from("user_bsk_balances")
        .update({
          withdrawable_balance: senderBalanceBefore - transferAmount,
        })
        .eq("user_id", user.id);

      if (senderError) throw senderError;

      // Update or insert recipient balance
      if (recipientBal) {
        const { error: recipientError } = await supabase
          .from("user_bsk_balances")
          .update({
            withdrawable_balance: recipientBalanceBefore + transferAmount,
            total_earned_withdrawable: (recipientBal.withdrawable_balance || 0) + transferAmount,
          })
          .eq("user_id", recipientProfile.user_id);

        if (recipientError) throw recipientError;
      } else {
        const { error: insertError } = await supabase
          .from("user_bsk_balances")
          .insert({
            user_id: recipientProfile.user_id,
            withdrawable_balance: transferAmount,
            total_earned_withdrawable: transferAmount,
          });

        if (insertError) throw insertError;
      }

      // Create transfer record
      const { data: transfer, error: transferError } = await supabase
        .from("bsk_transfers")
        .insert({
          sender_id: user.id,
          recipient_id: recipientProfile.user_id,
          amount_bsk: transferAmount,
          sender_balance_before: senderBalanceBefore,
          sender_balance_after: senderBalanceBefore - transferAmount,
          recipient_balance_before: recipientBalanceBefore,
          recipient_balance_after: recipientBalanceBefore + transferAmount,
          status: "completed",
        })
        .select("transaction_ref")
        .single();

      if (transferError) throw transferError;

      return transfer.transaction_ref;
    },
    onSuccess: (ref) => {
      queryClient.invalidateQueries({ queryKey: ["bsk-balance"] });
      queryClient.invalidateQueries({ queryKey: ["bsk-transfers"] });
      setTransferSuccess(true);
      setTransferRef(ref);
      toast({ 
        title: "Transfer successful!", 
        description: `${amount} BSK sent to ${recipientProfile?.email}` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Transfer failed", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleTransfer = () => {
    if (!recipientProfile) {
      toast({ title: "Please search for a recipient first", variant: "destructive" });
      return;
    }

    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    if (transferAmount > (senderBalance || 0)) {
      toast({ 
        title: "Insufficient balance", 
        description: `You only have ${senderBalance?.toLocaleString()} BSK available`,
        variant: "destructive" 
      });
      return;
    }

    transferMutation.mutate();
  };

  const resetForm = () => {
    setRecipientEmail("");
    setRecipientProfile(null);
    setAmount("");
    setTransferSuccess(false);
    setTransferRef("");
  };

  if (transferSuccess) {
    return (
      <div className="space-y-6">
        <Card className="border-success/50 bg-success/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Transfer Successful!</h3>
                <p className="text-muted-foreground">
                  You've sent {parseFloat(amount).toLocaleString()} BSK to {recipientProfile?.email}
                </p>
              </div>

              <div className="bg-background rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono font-medium">{transferRef}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{parseFloat(amount).toLocaleString()} BSK</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recipient</span>
                  <span className="font-medium">{recipientProfile?.email}</span>
                </div>
              </div>

              <Button onClick={resetForm} className="w-full">
                Make Another Transfer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Transfer BSK to Another User</CardTitle>
          <CardDescription>
            Send your withdrawable BSK to any i-smart exchange user
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Available Balance */}
          <Alert>
            <AlertDescription className="flex items-center justify-between">
              <span>Available Balance:</span>
              <span className="font-bold text-lg">{(senderBalance || 0).toLocaleString()} BSK</span>
            </AlertDescription>
          </Alert>

          {/* Recipient Search */}
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Email</Label>
            <div className="flex gap-2">
              <Input
                id="recipient"
                type="email"
                placeholder="user@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && searchRecipient()}
              />
              <Button
                onClick={searchRecipient}
                disabled={isSearching || !recipientEmail.trim()}
                variant="outline"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Recipient Info */}
          {recipientProfile && (
            <Alert className="border-primary/50 bg-primary/5">
              <User className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-semibold">{recipientProfile.full_name || "User"}</div>
                  <div className="text-sm text-muted-foreground">{recipientProfile.email}</div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Amount Input */}
          {recipientProfile && (
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (BSK)</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <Button
                  variant="outline"
                  onClick={() => setAmount(senderBalance?.toString() || "0")}
                >
                  Max
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the amount of BSK you want to transfer
              </p>
            </div>
          )}

          {/* Transfer Button */}
          {recipientProfile && (
            <Button
              onClick={handleTransfer}
              disabled={!amount || transferMutation.isPending}
              className="w-full"
              size="lg"
            >
              {transferMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Transfer {amount || "0"} BSK
                </>
              )}
            </Button>
          )}

          {/* Warning */}
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> Transfers are instant and cannot be reversed. Please verify the recipient email before proceeding.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}