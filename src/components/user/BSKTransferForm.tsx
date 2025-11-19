import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowRightLeft, CheckCircle2, Loader2, User, Clock, Send as SendIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRecentRecipients } from "@/hooks/useRecentRecipients";
import { useTransferLimits } from "@/hooks/useTransferLimits";
import { TransferReceiptButton } from "./TransferReceiptButton";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { useTransferStatus } from "@/hooks/useTransferStatus";
import { Link } from "react-router-dom";

export function BSKTransferForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [verifiedRecipient, setVerifiedRecipient] = useState<{ id: string; email: string; full_name?: string } | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<any>(null);
  
  const { data: recentRecipients } = useRecentRecipients();
  const { data: limits } = useTransferLimits();
  const { data: transfersEnabled, isLoading: transferStatusLoading } = useTransferStatus();

  // Get user's BSK balance with proper error handling
  const { data: userBalance, isLoading: balanceLoading, error: balanceError, refetch: refetchBalance } = useQuery({
    queryKey: ["user-bsk-balance"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("user_bsk_balances")
        .select("withdrawable_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      // If no record exists, create one with 0 balance
      if (!data && !error) {
        const { data: newBalance, error: createError } = await supabase
          .from("user_bsk_balances")
          .insert({
            user_id: user.id,
            withdrawable_balance: 0,
            holding_balance: 0,
            total_earned_withdrawable: 0,
            total_earned_holding: 0,
          })
          .select("withdrawable_balance")
          .single();
        
        if (createError) throw createError;
        return newBalance?.withdrawable_balance || 0;
      }

      if (error) throw error;
      return data?.withdrawable_balance || 0;
    },
    retry: 2,
    retryDelay: 1000,
  });

  // Real-time balance updates
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.id) return;

      const channel = supabase
        .channel(`bsk-balance-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_bsk_balances',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            refetchBalance();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [refetchBalance]);

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

      const amountBSK = parseFloat(amount);
      
      // Comprehensive validation
      if (isNaN(amountBSK) || amountBSK <= 0) {
        throw new Error("Please enter a valid amount");
      }

      if (amountBSK < 0.01) {
        throw new Error("Minimum transfer amount is 0.01 BSK");
      }

      const availableBalance = userBalance || 0;
      
      if (availableBalance === 0) {
        throw new Error("You have 0 BSK available. Please earn BSK first to transfer.");
      }

      if (amountBSK > availableBalance) {
        throw new Error(`Insufficient balance. You have ${availableBalance.toLocaleString()} BSK available`);
      }

      // No transfer limits enforced

      // Use atomic edge function for secure transfer
      const { data, error } = await supabase.functions.invoke('process-bsk-transfer', {
        body: {
          recipient_id: verifiedRecipient.id,
          amount: amountBSK,
          memo: memo.trim() || undefined,
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Transfer failed');

      return data.transaction_ref;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user-bsk-balance"] });
      queryClient.invalidateQueries({ queryKey: ["transfer-limits"] });
      queryClient.invalidateQueries({ queryKey: ["recent-recipients"] });
      refetchBalance();
      setTransferSuccess({
        ref: data,
        amount: amount,
        recipient: verifiedRecipient,
        memo: memo,
      });
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
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
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
    setMemo("");
    setVerifiedRecipient(null);
    setTransferSuccess(null);
  };

  const handleSelectRecipient = (recipient: any) => {
    setRecipientEmail(recipient.email);
    verifyRecipientMutation.mutate(recipient.email);
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
                <span className="font-mono text-xs">{transferSuccess.ref}</span>
              </div>
              {transferSuccess.memo && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Memo</span>
                  <span className="italic text-sm">"{transferSuccess.memo}"</span>
                </div>
              )}
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

          <TransferReceiptButton
            transaction={{
              reference_id: transferSuccess.ref,
              created_at: new Date().toISOString(),
              amount: parseFloat(transferSuccess.amount),
              transaction_type: 'transfer_out',
              metadata: {
                sender_display_name: 'You',
                recipient_display_name: transferSuccess.recipient?.full_name || transferSuccess.recipient?.email,
                recipient_email: transferSuccess.recipient?.email,
                memo: transferSuccess.memo,
              }
            }}
            variant="outline"
          />
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
          {balanceLoading ? (
            <div className="animate-pulse">
              <div className="h-10 bg-muted rounded w-40"></div>
            </div>
          ) : balanceError ? (
            <div className="space-y-2">
              <p className="text-destructive text-sm">Error loading balance</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetchBalance()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="text-3xl font-bold text-success">
              {userBalance?.toLocaleString() || "0.00"} BSK
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recipient Details</CardTitle>
          <CardDescription>Enter the email address of the i-smart user</CardDescription>
        </CardHeader>

        {!transferStatusLoading && transfersEnabled !== true && (
          <div className="px-6 pb-4">
            <Alert variant="destructive">
              <AlertDescription>
                BSK transfers are currently disabled. Please check back later or visit the one-time offers page.
                <Link to="/app/programs/bsk-bonus" className="underline ml-1">
                  View offers
                </Link>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <CardContent className="space-y-4">
          {/* Recent Recipients */}
          {recentRecipients && recentRecipients.length > 0 && !verifiedRecipient && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Recent Recipients</Label>
              <div className="grid grid-cols-1 gap-2">
                {recentRecipients.map((recipient) => (
                  <Button
                    key={recipient.user_id}
                    variant="outline"
                    className="w-full justify-start h-auto py-3"
                    onClick={() => handleSelectRecipient(recipient)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-sm">{recipient.display_name || recipient.email}</p>
                        <p className="text-xs text-muted-foreground">{recipient.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Last: {recipient.last_amount.toLocaleString()} BSK</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(recipient.last_transfer_date), 'MMM d')}</p>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

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
              <Label htmlFor="memo">Memo (Optional)</Label>
              <Textarea
                id="memo"
                placeholder="e.g., Lunch money, Birthday gift..."
                value={memo}
                onChange={(e) => setMemo(e.target.value.slice(0, 100))}
                maxLength={100}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                {memo.length}/100 characters
              </p>
            </div>

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
                  onClick={() => {
                    if (userBalance && userBalance > 0) {
                      setAmount(userBalance.toString());
                    }
                  }}
                  disabled={!userBalance || userBalance === 0 || balanceLoading}
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

            {userBalance === 0 && !balanceLoading && (
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <AlertDescription className="text-amber-600 dark:text-amber-400">
                  ⚠️ You have 0 BSK available. Please earn BSK through programs before transferring.
                </AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full"
              onClick={handleTransfer}
              disabled={
                !amount || 
                parseFloat(amount) <= 0 || 
                parseFloat(amount) > (userBalance || 0) ||
                transferMutation.isPending ||
                balanceLoading ||
                userBalance === 0 ||
                transfersEnabled !== true
              }
            >
              {transferMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : transferStatusLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking Status...
                </>
              ) : transfersEnabled !== true ? (
                "Transfers Disabled"
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