import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Minus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserFinancialOperationsProps {
  userId: string;
}

export function UserFinancialOperations({ userId }: UserFinancialOperationsProps) {
  const [balanceType, setBalanceType] = useState<"bsk" | "inr">("bsk");
  const [operation, setOperation] = useState<"add" | "deduct">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleBalanceAdjustment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for this adjustment",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.debug('[RPC] admin_adjust_user_balance payload', {
        p_target_user_id: userId,
        p_balance_type: balanceType,
        p_subtype: balanceType === 'bsk' ? 'withdrawable' : undefined,
        p_operation: operation,
        p_amount: parseFloat(amount),
        p_reason: reason
      });

      const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_adjust_user_balance', {
        p_target_user_id: userId,
        p_balance_type: balanceType,
        p_subtype: balanceType === 'bsk' ? 'withdrawable' : undefined,
        p_operation: operation,
        p_amount: parseFloat(amount),
        p_reason: reason,
      });

      console.debug('[RPC] admin_adjust_user_balance result', { data: rpcResult, error: rpcError });

      if (rpcError) throw rpcError;

      // Invalidate and refetch cache to refresh UI
      queryClient.invalidateQueries({ 
        queryKey: [balanceType === 'bsk' ? 'user-bsk-balance' : 'user-inr-balance', userId]
      });
      queryClient.refetchQueries({ 
        queryKey: [balanceType === 'bsk' ? 'user-bsk-balance' : 'user-inr-balance', userId]
      });

      toast({
        title: "Balance Adjusted",
        description: `Successfully ${operation === "add" ? "added" : "deducted"} ${amount} ${balanceType.toUpperCase()}`,
      });

      setAmount("");
      setReason("");
    } catch (error: any) {
      console.error("Balance adjustment error:", error);
      toast({
        title: "Operation Failed",
        description: error.message || "Could not adjust balance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Operations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Balance Type</Label>
            <Select value={balanceType} onValueChange={(v: any) => setBalanceType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bsk">BSK Balance</SelectItem>
                <SelectItem value="inr">INR Balance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Operation</Label>
            <Select value={operation} onValueChange={(v: any) => setOperation(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add Balance</SelectItem>
                <SelectItem value="deduct">Deduct Balance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Amount</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Reason</Label>
          <Textarea
            placeholder="Provide a reason for this adjustment..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <Button
          onClick={handleBalanceAdjustment}
          disabled={loading}
          className="w-full"
        >
          {operation === "add" ? (
            <Plus className="h-4 w-4 mr-2" />
          ) : (
            <Minus className="h-4 w-4 mr-2" />
          )}
          {operation === "add" ? "Add" : "Deduct"} Balance
        </Button>
      </CardContent>
    </Card>
  );
}
