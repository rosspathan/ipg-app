import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { jsPDF } from "jspdf";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface TransactionReceiptButtonProps {
  transaction: {
    id: string;
    created_at: string;
    amount: number;
    transaction_type: string;
    balance_type: string;
    description?: string;
    metadata?: any;
  };
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function TransactionReceiptButton({ 
  transaction, 
  variant = "outline", 
  size = "sm" 
}: TransactionReceiptButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('Transaction Receipt', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('BSK Wallet System', pageWidth / 2, 30, { align: 'center' });
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
      let yPos = 55;
      
      // Transaction Details
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Transaction Details', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const details = [
        { label: 'Transaction ID', value: transaction.id },
        { label: 'Date & Time', value: format(new Date(transaction.created_at), 'MMM dd, yyyy hh:mm:ss a') },
        { label: 'Transaction Type', value: transaction.transaction_type.replace(/_/g, ' ').toUpperCase() },
        { label: 'Amount', value: `${transaction.amount >= 0 ? '+' : ''}${transaction.amount.toFixed(2)} BSK` },
        { label: 'Balance Type', value: transaction.balance_type.charAt(0).toUpperCase() + transaction.balance_type.slice(1) },
        { label: 'Status', value: transaction.metadata?.status || 'Completed' },
      ];
      
      if (transaction.description) {
        details.push({ label: 'Description', value: transaction.description });
      }

      // Add transfer-specific details
      if (transaction.transaction_type === 'transfer_in' || transaction.transaction_type === 'transfer_out') {
        if (transaction.metadata?.sender_display_name) {
          details.push({ label: 'Sender', value: transaction.metadata.sender_display_name });
        }
        if (transaction.metadata?.recipient_display_name) {
          details.push({ label: 'Recipient', value: transaction.metadata.recipient_display_name });
        }
        if (transaction.metadata?.memo) {
          details.push({ label: 'Memo', value: transaction.metadata.memo });
        }
        if (transaction.metadata?.transaction_ref) {
          details.push({ label: 'Reference', value: transaction.metadata.transaction_ref });
        }
      }

      // Add withdrawal-specific details
      if (transaction.transaction_type === 'withdrawal') {
        if (transaction.metadata?.bank_name) {
          details.push({ label: 'Bank', value: transaction.metadata.bank_name });
        }
        if (transaction.metadata?.crypto_symbol) {
          details.push({ label: 'Crypto', value: transaction.metadata.crypto_symbol });
        }
      }
      
      details.forEach(detail => {
        doc.setFont('helvetica', 'bold');
        doc.text(detail.label + ':', 20, yPos);
        doc.setFont('helvetica', 'normal');
        
        // Handle long values by wrapping text
        const valueLines = doc.splitTextToSize(detail.value, pageWidth - 90);
        doc.text(valueLines, 90, yPos);
        yPos += valueLines.length * 7;
      });
      
      // Amount Highlight Box
      yPos += 10;
      const amountColor: [number, number, number] = transaction.amount >= 0 ? [34, 197, 94] : [239, 68, 68];
      doc.setFillColor(amountColor[0], amountColor[1], amountColor[2]);
      doc.roundedRect(20, yPos, pageWidth - 40, 25, 3, 3, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Transaction Amount', pageWidth / 2, yPos + 10, { align: 'center' });
      
      doc.setFontSize(18);
      const amountText = `${transaction.amount >= 0 ? '+' : ''}${transaction.amount.toFixed(2)} BSK`;
      doc.text(amountText, pageWidth / 2, yPos + 20, { align: 'center' });
      
      // Footer
      yPos += 40;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text('This is a system-generated receipt. No signature required.', pageWidth / 2, yPos, { align: 'center' });
      doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm:ss')}`, pageWidth / 2, yPos + 5, { align: 'center' });
      
      // Save PDF
      const filename = `receipt_${transaction.id.substring(0, 8)}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
      doc.save(filename);
      
      toast({
        title: "Receipt Generated",
        description: "Transaction receipt has been downloaded successfully.",
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        title: "Error",
        description: "Failed to generate receipt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={generatePDF}
      disabled={isGenerating}
      className="gap-1"
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {size !== "icon" && !isGenerating && <span className="hidden sm:inline">Receipt</span>}
    </Button>
  );
}
