import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface UserBskData {
  username: string;
  email: string;
  withdrawable_balance: number;
  holding_balance: number;
  total_balance: number;
  wallet_status: string;
  wallet_address: string;
  created_at: string;
}

export function generateUserBskReportPDF(users: UserBskData[], generatedAt: string) {
  const doc = new jsPDF({ orientation: 'landscape' });

  const primaryColor: [number, number, number] = [34, 197, 94];
  const textColor: [number, number, number] = [15, 23, 42];
  const grayColor: [number, number, number] = [100, 116, 139];
  const headerBg: [number, number, number] = [30, 41, 59];

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 297, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('i-SMART — All Users BSK Balance Report', 148.5, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${format(new Date(generatedAt), 'PPpp')} | Total Users: ${users.length}`, 148.5, 23, { align: 'center' });

  // Summary
  const totalWithdrawable = users.reduce((s, u) => s + u.withdrawable_balance, 0);
  const totalHolding = users.reduce((s, u) => s + u.holding_balance, 0);
  const totalBsk = totalWithdrawable + totalHolding;
  const walletsCreated = users.filter(u => u.wallet_status === 'Created').length;

  let y = 38;
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Total Withdrawable BSK: ${totalWithdrawable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 14, y);
  doc.text(`Total Holding BSK: ${totalHolding.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 100, y);
  doc.text(`Grand Total BSK: ${totalBsk.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 186, y);
  doc.text(`Wallets Created: ${walletsCreated} / ${users.length}`, 250, y);

  // Table
  y += 10;
  const colWidths = [8, 40, 55, 32, 32, 32, 24, 60];
  const colX = [14];
  for (let i = 1; i < colWidths.length; i++) colX.push(colX[i - 1] + colWidths[i - 1]);
  const headers = ['#', 'Username', 'Email', 'Withdrawable', 'Holding', 'Total', 'Wallet', 'Wallet Address'];

  const drawTableHeader = (yPos: number) => {
    doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.rect(14, yPos - 4, 269, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    headers.forEach((h, i) => doc.text(h, colX[i] + 1, yPos));
    return yPos + 7;
  };

  y = drawTableHeader(y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);

  const pageHeight = 200;

  users.forEach((user, idx) => {
    if (y > pageHeight) {
      doc.addPage();
      // Re-draw header on new page
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 297, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('i-SMART — BSK Balance Report (continued)', 148.5, 8, { align: 'center' });
      y = 20;
      y = drawTableHeader(y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
    }

    // Alternate row bg
    if (idx % 2 === 0) {
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y - 3.5, 269, 5, 'F');
    }

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const row = [
      String(idx + 1),
      (user.username || 'N/A').substring(0, 22),
      (user.email || 'N/A').substring(0, 30),
      user.withdrawable_balance.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      user.holding_balance.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      user.total_balance.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      user.wallet_status === 'Created' ? '✓' : '✗',
      (user.wallet_address || 'N/A').substring(0, 34),
    ];

    row.forEach((val, i) => doc.text(val, colX[i] + 1, y));
    y += 5;
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount} — Confidential — For internal use only`, 148.5, 205, { align: 'center' });
  }

  doc.save(`BSK-User-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
