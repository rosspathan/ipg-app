import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRightLeft, CheckCircle2, Loader2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function BSKTransferForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [verifiedRecipient, setVerifiedRecipient] = useState<{ id: string; email: string; full_name?: string } | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  // Get user's BSK balance
  const { data: userBalance } = useQuery({
    queryKey: ["user-bsk-balance"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_bsk_balances")
        .select("withdrawable_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.withdrawable_balance || 0;
    },
  });

  const verifyRecipientMutation = useMutation({
    mutationFn: async (email: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if trying to send to self
      if (email === user.email) {
        throw new Error("Cannot transfer to yourself");
      }

      // Find user by email
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .eq("email", email)
        .maybeSingle();

      if (error) throw error;
      if (!profile) throw new Error("User not found");

      return { id: profile.user_id, email: profile.email, full_name: profile.full_name };
    },
    onSuccess: (data) => {
      setVerifiedRecipient(data);
      toast({ title: "Recipient verified", description: `Found user: ${data.full_name || data.email}` });
    },
    onError: (error: Error) => {
      setVerifiedRecipient(null);
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!verifiedRecipient) throw new Error("Please verify recipient first");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const amountBSK = parseFloat(amount);
      if (isNaN(amountBSK) || amountBSK <= 0) {
        throw new Error("Invalid amount");
      }

      if (!userBalance || amountBSK > userBalance) {
        throw new Error("Insufficient balance");
      }

      // Get sender balance
      const { data: senderBalance, error: senderError } = await supabase
        .from("user_bsk_balances")
        .select("withdrawable_balance")
        .eq("user_id", user.id)
        .single();

      if (senderError) throw senderError;

      // Get recipient balance
      const { data: recipientBalance, error: recipientError } = await supabase
        .from("user_bsk_balances")
        .select("withdrawable_balance, total_earned_withdrawable")
        .eq("user_id", verifiedRecipient.id)
        .maybeSingle();

      if (recipientError) throw recipientError;

      const senderBefore = senderBalance.withdrawable_balance;
      const recipientBefore = recipientBalance?.withdrawable_balance || 0;

      // Deduct from sender
      const { error: deductError } = await supabase
        .from("user_bsk_balances")
        .update({ 
          withdrawable_balance: senderBefore - amountBSK 
        })
        .eq("user_id", user.id);

      if (deductError) throw deductError;

      // Add to recipient
      const { error: addError } = await supabase
        .from("user_bsk_balances")
        .upsert({
          user_id: verifiedRecipient.id,
          withdrawable_balance: recipientBefore + amountBSK,
          total_earned_withdrawable: (recipientBalance?.total_earned_withdrawable || 0) + amountBSK,
        });

      if (addError) {
        // Rollback sender deduction
        await supabase
          .from("user_bsk_balances")
          .update({ withdrawable_balance: senderBefore })
          .eq("user_id", user.id);
        throw addError;
      }

      // Record transfer
      const { data: transfer, error: transferError } = await supabase
        .from("bsk_transfers")
        .insert({
          sender_id: user.id,
          recipient_id: verifiedRecipient.id,
          amount_bsk: amountBSK,
          sender_balance_before: senderBefore,
          sender_balance_after: senderBefore - amountBSK,
          recipient_balance_before: recipientBefore,
          recipient_balance_after: recipientBefore + amountBSK,
          status: "completed",
        })
        .select("transaction_ref")
        .single();

      if (transferError) throw transferError;

      return transfer.transaction_ref;
    },
    onSuccess: (transactionRef) => {
      queryClient.invalidateQueries({ queryKey: ["user-bsk-balance"] });
      setTransferSuccess(transactionRef);
      toast({
        title: "Transfer successful",
        description: `${amount} BSK transferred to ${verifiedRecipient?.full_name || verifiedRecipient?.email}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Transfer failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVerify = () => {
    if (!recipientEmail) {
      toast({ title: "Email required", description: "Please enter recipient email", variant: "destructive" });
      return;
    }
    verifyRecipientMutation.mutate(recipientEmail);
  };

  const handleTransfer = () => {
    transferMutation.mutate();
  };

  const handleReset = () => {
    setRecipientEmail("");
    setAmount("");
    setVerifiedRecipient(null);
    setTransferSuccess(null);
  };

  if (transferSuccess) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
          </div>
          <CardTitle className="text-2xl">Transfer Complete!</CardTitle>
          <CardDescription>Your BSK has been sent successfully</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{amount} BSK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient</span>
                <span className="font-semibold">{verifiedRecipient?.full_name || verifiedRecipient?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-mono text-xs">{transferSuccess}</span>
              </div>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={handleReset}>
              New Transfer
            </Button>
            <Button onClick={() => navigate("/app/wallet/history")}>
              View History
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Balance</CardTitle>
          <CardDescription>BSK Withdrawable Balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-success">
            {userBalance?.toLocaleString() || "0.00"} BSK
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipient Details</CardTitle>
          <CardDescription>Enter the email address of the i-smart user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Recipient Email</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={recipientEmail}
                onChange={(e) => {
                  setRecipientEmail(e.target.value);
                  setVerifiedRecipient(null);
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleVerify}
                disabled={!recipientEmail || verifyRecipientMutation.isPending}
              >
                {verifyRecipientMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
          </div>

          {verifiedRecipient && (
            <Alert className="bg-success/10 border-success">
              <User className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold">{verifiedRecipient.full_name || "User"}</div>
                <div className="text-sm text-muted-foreground">{verifiedRecipient.email}</div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {verifiedRecipient && (
        <Card>
          <CardHeader>
            <CardTitle>Transfer Amount</CardTitle>
            <CardDescription>How much BSK do you want to transfer?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  type="button"
                  variant="outline"
                  onClick={() => setAmount(userBalance?.toString() || "0")}
                >
                  Max
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Available: {userBalance?.toLocaleString() || "0.00"} BSK
              </p>
            </div>

            <Alert>
              <AlertDescription className="space-y-2">
                <div className="flex justify-between">
                  <span>Transfer Amount</span>
                  <span className="font-semibold">{amount || "0.00"} BSK</span>
                </div>
                <div className="flex justify-between">
                  <span>Transfer Fee</span>
                  <span className="font-semibold text-success">Free</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">{amount || "0.00"} BSK</span>
                </div>
              </AlertDescription>
            </Alert>

            <Button
              className="w-full"
              onClick={handleTransfer}
              disabled={!amount || parseFloat(amount) <= 0 || transferMutation.isPending}
            >
              {transferMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transfer BSK
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}