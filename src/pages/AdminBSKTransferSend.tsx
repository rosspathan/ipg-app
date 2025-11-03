import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Send, Loader2, CheckCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AdminBSKTransferSend() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientUserId, setRecipientUserId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [balanceType, setBalanceType] = useState<'withdrawable' | 'holding'>('withdrawable');
  const [reason, setReason] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [transferResult, setTransferResult] = useState<any>(null);

  const searchUser = async () => {
    if (!recipientEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive'
      });
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .eq('email', recipientEmail.trim())
        .single();

      if (error || !data) {
        toast({
          title: 'User Not Found',
          description: 'No user found with that email address',
          variant: 'destructive'
        });
        setRecipientUserId('');
        setRecipientName('');
        return;
      }

      setRecipientUserId(data.user_id);
      setRecipientName(data.display_name || 'Unknown User');
      toast({
        title: 'User Found',
        description: `Found: ${data.display_name || data.email}`,
      });
    } catch (error: any) {
      toast({
        title: 'Search Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendTransfer = async () => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-send-bsk-to-user', {
        body: {
          recipient_user_id: recipientUserId,
          amount: parseFloat(amount),
          balance_type: balanceType,
          reason: reason
        }
      });

      if (error) throw error;

      setTransferResult(data);
      setTransferSuccess(true);
      toast({
        title: 'Transfer Successful',
        description: `${amount} BSK (${balanceType}) sent to ${recipientName}`,
      });

      // Reset form
      setTimeout(() => {
        setRecipientEmail('');
        setRecipientUserId('');
        setRecipientName('');
        setAmount('');
        setReason('');
        setTransferSuccess(false);
        setTransferResult(null);
      }, 3000);

    } catch (error: any) {
      toast({
        title: 'Transfer Failed',
        description: error.message || 'Failed to send BSK',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
      setShowConfirmDialog(false);
    }
  };

  const canProceed = recipientUserId && amount && parseFloat(amount) > 0 && reason.trim();

  if (transferSuccess) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <CardTitle className="text-green-500">Transfer Successful</CardTitle>
                <CardDescription>BSK has been credited to the user</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Recipient</p>
                <p className="font-medium">{recipientName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-medium">{transferResult?.amount} BSK</p>
              </div>
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium capitalize">{transferResult?.balance_type}</p>
              </div>
              <div>
                <p className="text-muted-foreground">New Balance</p>
                <p className="font-medium">{transferResult?.new_balance} BSK</p>
              </div>
            </div>
            <Button onClick={() => navigate('/admin/bsk-management')} variant="outline" className="w-full">
              Back to BSK Management
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/admin/bsk-management')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Send BSK to User</CardTitle>
          <CardDescription>Credit BSK directly to a user's account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User Search */}
          <div className="space-y-2">
            <Label htmlFor="email">Recipient Email</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUser()}
              />
              <Button onClick={searchUser} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
            </div>
            {recipientUserId && (
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ Found: {recipientName}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (BSK)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!recipientUserId}
            />
          </div>

          {/* Balance Type */}
          <div className="space-y-2">
            <Label htmlFor="balanceType">Balance Type</Label>
            <Select value={balanceType} onValueChange={(v: any) => setBalanceType(v)} disabled={!recipientUserId}>
              <SelectTrigger id="balanceType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="withdrawable">Withdrawable</SelectItem>
                <SelectItem value="holding">Holding</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {balanceType === 'withdrawable' 
                ? 'User can withdraw immediately' 
                : 'User cannot withdraw, suitable for bonuses'}
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Required)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Compensation for bug, Bonus reward, Customer support resolution..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={!recipientUserId}
            />
          </div>

          {/* Submit */}
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={!canProceed || isSending}
            className="w-full"
            size="lg"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send {amount || '0'} BSK
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm BSK Transfer</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to send:</p>
              <div className="bg-muted p-4 rounded-lg space-y-1 text-sm">
                <p><strong>Amount:</strong> {amount} BSK</p>
                <p><strong>Type:</strong> {balanceType}</p>
                <p><strong>To:</strong> {recipientName} ({recipientEmail})</p>
                <p><strong>Reason:</strong> {reason}</p>
              </div>
              <p className="text-destructive font-medium">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendTransfer}>
              Confirm & Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
