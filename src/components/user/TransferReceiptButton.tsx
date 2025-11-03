import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { generateTransferReceipt, ReceiptData } from '@/lib/generateTransferReceipt';
import { useToast } from '@/hooks/use-toast';

interface TransferReceiptButtonProps {
  transaction: {
    reference_id: string;
    created_at: string;
    amount: number;
    transaction_type: string;
    metadata?: any;
  };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function TransferReceiptButton({ 
  transaction, 
  variant = 'outline',
  size = 'sm' 
}: TransferReceiptButtonProps) {
  const { toast } = useToast();

  const handleDownload = () => {
    try {
      const isSent = transaction.transaction_type === 'transfer_out';
      
      const receiptData: ReceiptData = {
        transactionId: transaction.reference_id,
        date: transaction.created_at,
        fromName: isSent 
          ? transaction.metadata?.sender_display_name || 'You'
          : transaction.metadata?.sender_display_name || 'Unknown',
        fromEmail: isSent
          ? transaction.metadata?.sender_email || ''
          : transaction.metadata?.sender_email || '',
        toName: isSent
          ? transaction.metadata?.recipient_display_name || 'Unknown'
          : transaction.metadata?.recipient_display_name || 'You',
        toEmail: isSent
          ? transaction.metadata?.recipient_email || ''
          : transaction.metadata?.recipient_email || '',
        amount: Math.abs(transaction.amount),
        status: 'Completed',
        type: isSent ? 'sent' : 'received',
      };

      generateTransferReceipt(receiptData);
      
      toast({
        title: 'Receipt downloaded',
        description: 'Your transfer receipt has been downloaded',
      });
    } catch (error) {
      toast({
        title: 'Download failed',
        description: 'Unable to generate receipt',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
    >
      <Download className="h-4 w-4 mr-2" />
      Receipt
    </Button>
  );
}
