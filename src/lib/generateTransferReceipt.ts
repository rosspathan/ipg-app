import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface ReceiptData {
  transactionId: string;
  date: string;
  fromName: string;
  fromEmail: string;
  toName: string;
  toEmail: string;
  amount: number;
  status: string;
  type: 'sent' | 'received';
}

export function generateTransferReceipt(data: ReceiptData) {
  const doc = new jsPDF();
  
  // Colors
  const primaryColor: [number, number, number] = [34, 197, 94]; // green-500
  const textColor: [number, number, number] = [15, 23, 42]; // slate-900
  const grayColor: [number, number, number] = [100, 116, 139]; // slate-500

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('i-SMART', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('BSK Transfer Receipt', 105, 30, { align: 'center' });

  // Transaction Status
  let yPos = 55;
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Status: ${data.status.toUpperCase()}`, 105, yPos, { align: 'center' });

  // Divider
  yPos += 10;
  doc.setDrawColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.line(20, yPos, 190, yPos);

  // Transaction Details
  yPos += 15;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  
  const addField = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 20, yPos + 6);
    yPos += 18;
  };

  addField('Transaction ID', data.transactionId);
  addField('Date & Time', format(new Date(data.date), 'PPpp'));
  
  yPos += 5;
  doc.setDrawColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.line(20, yPos, 190, yPos);
  yPos += 15;

  addField('From', `${data.fromName}\n${data.fromEmail}`);
  addField('To', `${data.toName}\n${data.toEmail}`);

  yPos += 5;
  doc.setDrawColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.line(20, yPos, 190, yPos);
  yPos += 15;

  // Amount (Highlighted)
  doc.setFillColor(240, 253, 244); // green-50
  doc.roundedRect(20, yPos - 5, 170, 25, 3, 3, 'F');
  
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Amount', 25, yPos + 5);
  doc.setFontSize(18);
  doc.text(`${data.amount.toLocaleString()} BSK`, 190, yPos + 7, { align: 'right' });

  yPos += 30;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('Transfer Fee', 25, yPos);
  doc.text('Free', 190, yPos, { align: 'right' });

  // Footer
  yPos = 260;
  doc.setDrawColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.line(20, yPos, 190, yPos);
  
  yPos += 10;
  doc.setFontSize(9);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('This is a computer-generated receipt. No signature required.', 105, yPos, { align: 'center' });
  doc.text('For support, contact support@i-smart.com', 105, yPos + 5, { align: 'center' });
  doc.text(`Generated on ${format(new Date(), 'PPpp')}`, 105, yPos + 10, { align: 'center' });

  // Save
  const filename = `BSK-Transfer-${data.transactionId.slice(0, 8)}.pdf`;
  doc.save(filename);
}
