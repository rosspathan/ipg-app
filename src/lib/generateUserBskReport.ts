import jsPDF from 'jspdf';
import { format } from 'date-fns';

export interface UserBskData {
  username: string;
  email: string;
  withdrawable_balance: number;
  holding_balance: number;
  total_balance: number;
  total_held?: number;
  total_earned?: number;
  total_deducted?: number;
  fees_paid?: number;
  pending_withdrawals_count?: number;
  pending_withdrawals_amount?: number;
  completed_withdrawals_count?: number;
  completed_withdrawals_amount?: number;
  wallet_status: string;
  wallet_address: string;
  created_at: string;
}

const num = (v: number | undefined) =>
  Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

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
  doc.text('i-SMART — Complete BSK Balance Report (Per User)', 148.5, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${format(new Date(generatedAt), 'PPpp')} | Total Users: ${users.length}`, 148.5, 23, { align: 'center' });

  // Summary
  const sum = (k: keyof UserBskData) => users.reduce((s, u) => s + Number(u[k] || 0), 0);
  const totalWithdrawable = sum('withdrawable_balance');
  const totalHolding = sum('holding_balance');
  const totalHeld = totalWithdrawable + totalHolding;
  const totalPending = sum('pending_withdrawals_amount');
  const totalCompleted = sum('completed_withdrawals_amount');
  const totalFees = sum('fees_paid');
  const walletsCreated = users.filter(u => u.wallet_status === 'Created').length;

  let y = 38;
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 14, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Withdrawable: ${num(totalWithdrawable)}`, 14, y);
  doc.text(`Locked/Holding: ${num(totalHolding)}`, 70, y);
  doc.text(`Total Held: ${num(totalHeld)}`, 130, y);
  doc.text(`Pending W/D: ${num(totalPending)}`, 185, y);
  doc.text(`Completed W/D: ${num(totalCompleted)}`, 235, y);
  y += 5;
  doc.text(`Total Fees/Deductions: ${num(totalFees)}`, 14, y);
  doc.text(`Wallets Created: ${walletsCreated} / ${users.length}`, 130, y);

  // Table
  y += 8;
  const colWidths = [7, 32, 42, 26, 22, 24, 22, 28, 28, 18, 16];
  const colX = [14];
  for (let i = 1; i < colWidths.length; i++) colX.push(colX[i - 1] + colWidths[i - 1]);
  const headers = ['#', 'Username', 'Email', 'Withdrawable', 'Locked', 'Total Held', 'Earned', 'Pending W/D', 'Done W/D', 'Fees', 'Wallet'];

  const drawTableHeader = (yPos: number) => {
    doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.rect(14, yPos - 4, 269, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    headers.forEach((h, i) => doc.text(h, colX[i] + 1, yPos));
    return yPos + 7;
  };

  y = drawTableHeader(y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);

  const pageHeight = 200;

  users.forEach((user, idx) => {
    if (y > pageHeight) {
      doc.addPage();
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 297, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('i-SMART — BSK Balance Report (continued)', 148.5, 8, { align: 'center' });
      y = 20;
      y = drawTableHeader(y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
    }

    if (idx % 2 === 0) {
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y - 3.5, 269, 5, 'F');
    }

    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const totalHeldRow = user.total_held ?? (user.withdrawable_balance + user.holding_balance);
    const row = [
      String(idx + 1),
      (user.username || 'N/A').substring(0, 18),
      (user.email || 'N/A').substring(0, 24),
      num(user.withdrawable_balance),
      num(user.holding_balance),
      num(totalHeldRow),
      num(user.total_earned),
      `${num(user.pending_withdrawals_amount)} (${user.pending_withdrawals_count || 0})`,
      `${num(user.completed_withdrawals_amount)} (${user.completed_withdrawals_count || 0})`,
      num(user.fees_paid),
      user.wallet_status === 'Created' ? 'Y' : 'N',
    ];

    row.forEach((val, i) => doc.text(String(val), colX[i] + 1, y));
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
