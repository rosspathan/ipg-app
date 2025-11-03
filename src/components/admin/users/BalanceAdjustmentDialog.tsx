import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Minus, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface BalanceAdjustmentDialogProps {
  userId: string;
  open: boolean;
  onClose: () => void;
  defaultOperation?: "add" | "deduct";
  defaultBalanceType?: "BSK" | "INR";
}

export function BalanceAdjustmentDialog({
  userId,
  open,
  onClose,
  defaultOperation = "add",
  defaultBalanceType = "BSK",
}: BalanceAdjustmentDialogProps) {
  const queryClient = useQueryClient();
  const [balanceType, setBalanceType] = useState<"BSK" | "INR">(defaultBalanceType);
  const [bskSubtype, setBskSubtype] = useState<"withdrawable" | "holding">("withdrawable");
  const [operation, setOperation] = useState<"add" | "deduct">(defaultOperation);
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async () => {
    setError("");

    // Validation
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    if (!reason || reason.trim().length < 10) {
      setError("Please provide a reason (minimum 10 characters)");
      return;
    }

    setLoading(true);

    try {
      const { error: rpcError } = await supabase.rpc("admin_adjust_user_balance", {
        p_target_user_id: userId,
        p_balance_type: balanceType,
        p_subtype: balanceType === "BSK" ? bskSubtype : undefined,
        p_operation: operation,
        p_amount: numAmount,
        p_reason: reason.trim(),
      });

      if (rpcError) throw rpcError;

      toast.success(`Successfully ${operation === "add" ? "added" : "deducted"} ${numAmount.toLocaleString()} ${balanceType}`);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["admin-user-balance", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", userId] });

      // Reset and close
      setAmount("");
      setReason("");
      setError("");
      onClose();
    } catch (err: any) {
      console.error("[BalanceAdjustment] Error:", err);
      setError(err.message || "Failed to adjust balance");
      toast.error("Failed to adjust balance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust User Balance</DialogTitle>
          <DialogDescription>
            Manually adjust the user's balance. This action will be logged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Balance Type</Label>
            <Select value={balanceType} onValueChange={(v) => setBalanceType(v as "BSK" | "INR")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BSK">BSK</SelectItem>
                <SelectItem value="INR">INR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {balanceType === "BSK" && (
            <div className="space-y-2">
              <Label>BSK Subtype</Label>
              <Select value={bskSubtype} onValueChange={(v) => setBskSubtype(v as "withdrawable" | "holding")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="withdrawable">Withdrawable</SelectItem>
                  <SelectItem value="holding">Holding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Operation</Label>
            <Select value={operation} onValueChange={(v) => setOperation(v as "add" | "deduct")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add</SelectItem>
                <SelectItem value="deduct">Deduct</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label>Reason (minimum 10 characters)</Label>
            <Textarea
              placeholder="Enter reason for adjustment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {operation === "add" ? (
                  <Plus className="w-4 h-4 mr-2" />
                ) : (
                  <Minus className="w-4 h-4 mr-2" />
                )}
                Confirm Adjustment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
