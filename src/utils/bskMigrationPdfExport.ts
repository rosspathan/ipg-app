import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

export interface BSKUserExportData {
  row_number: number;
  user_id: string;
  username: string | null;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  wallet_address: string | null;
  withdrawable_balance: number;
  holding_balance: number;
  kyc_status: string | null;
  account_status: string | null;
  sponsor_username: string | null;
  sponsor_email: string | null;
  created_at: string;
}

export interface BSKMigrationReportStats {
  total_users: number;
  total_bsk: number;
  users_with_wallet: number;
  users_without_wallet: number;
  bsk_with_wallet: number;
  bsk_without_wallet: number;
  kyc_approved: number;
  kyc_pending: number;
  balance_distribution: {
    range: string;
    count: number;
    total_bsk: number;
  }[];
}

// Format number with commas
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

// Truncate text with ellipsis
const truncate = (text: string | null, maxLength: number): string => {
  if (!text) return '-';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

// Calculate balance distribution from user data
export function calculateStats(users: BSKUserExportData[]): BSKMigrationReportStats {
  const ranges = [
    { min: 100, max: 500, label: '100 - 500' },
    { min: 500, max: 1000, label: '500 - 1,000' },
    { min: 1000, max: 5000, label: '1,000 - 5,000' },
    { min: 5000, max: 10000, label: '5,000 - 10,000' },
    { min: 10000, max: 50000, label: '10,000 - 50,000' },
    { min: 50000, max: 100000, label: '50,000 - 100,000' },
    { min: 100000, max: Infinity, label: '100,000+' },
  ];

  const distribution = ranges.map(r => ({
    range: r.label,
    count: users.filter(u => u.withdrawable_balance >= r.min && u.withdrawable_balance < r.max).length,
    total_bsk: users
      .filter(u => u.withdrawable_balance >= r.min && u.withdrawable_balance < r.max)
      .reduce((sum, u) => sum + u.withdrawable_balance, 0)
  })).filter(d => d.count > 0);

  const usersWithWallet = users.filter(u => u.wallet_address);
  const usersWithoutWallet = users.filter(u => !u.wallet_address);

  return {
    total_users: users.length,
    total_bsk: users.reduce((sum, u) => sum + u.withdrawable_balance, 0),
    users_with_wallet: usersWithWallet.length,
    users_without_wallet: usersWithoutWallet.length,
    bsk_with_wallet: usersWithWallet.reduce((sum, u) => sum + u.withdrawable_balance, 0),
    bsk_without_wallet: usersWithoutWallet.reduce((sum, u) => sum + u.withdrawable_balance, 0),
    kyc_approved: users.filter(u => u.kyc_status === 'approved').length,
    kyc_pending: users.filter(u => u.kyc_status !== 'approved').length,
    balance_distribution: distribution,
  };
}

export function generateBSKMigrationPDF(
  users: BSKUserExportData[],
  stats: BSKMigrationReportStats
): void {
  // Create PDF in portrait for summary page
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  
  // Colors
  const primaryColor: [number, number, number] = [34, 197, 94]; // green
  const textColor: [number, number, number] = [15, 23, 42]; // dark
  const grayColor: [number, number, number] = [100, 116, 139]; // gray
  const lightGray: [number, number, number] = [241, 245, 249]; // light bg

  // ============ PAGE 1: SUMMARY ============
  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('i-SMART BSK Migration Report', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${format(new Date(), 'PPP p')}`, pageWidth / 2, 28, { align: 'center' });

  let yPos = 50;

  // Executive Summary Box
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('EXECUTIVE SUMMARY', margin, yPos);
  
  yPos += 8;
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, margin + 60, yPos);

  yPos += 12;

  // Summary stats in a box
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(margin, yPos, contentWidth, 35, 3, 3, 'F');

  yPos += 12;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('Total Eligible Users:', margin + 5, yPos);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(formatNumber(stats.total_users), margin + 55, yPos);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('Total BSK to Migrate:', margin + 95, yPos);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(formatNumber(stats.total_bsk) + ' BSK', margin + 140, yPos);

  yPos += 15;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('Minimum Balance:', margin + 5, yPos);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('100 BSK', margin + 45, yPos);

  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('Report Type:', margin + 95, yPos);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text('All Users (100+ BSK)', margin + 130, yPos);

  yPos += 25;

  // Wallet Status Section
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('WALLET STATUS', margin, yPos);
  
  yPos += 10;
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(margin, yPos, contentWidth / 2 - 5, 40, 3, 3, 'F');
  doc.roundedRect(margin + contentWidth / 2 + 5, yPos, contentWidth / 2 - 5, 40, 3, 3, 'F');

  // With Wallet
  yPos += 12;
  doc.setFontSize(10);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('With Wallet', margin + 5, yPos);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(formatNumber(stats.users_with_wallet), margin + 5, yPos + 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatNumber(stats.bsk_with_wallet)} BSK`, margin + 5, yPos + 22);
  doc.text(`(${((stats.users_with_wallet / stats.total_users) * 100).toFixed(1)}%)`, margin + 50, yPos + 12);

  // Without Wallet
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('Without Wallet', margin + contentWidth / 2 + 10, yPos);
  doc.setTextColor(255, 152, 0);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(formatNumber(stats.users_without_wallet), margin + contentWidth / 2 + 10, yPos + 12);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatNumber(stats.bsk_without_wallet)} BSK`, margin + contentWidth / 2 + 10, yPos + 22);
  doc.text(`(${((stats.users_without_wallet / stats.total_users) * 100).toFixed(1)}%)`, margin + contentWidth / 2 + 55, yPos + 12);

  yPos += 45;

  // KYC Status Section
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('KYC STATUS', margin, yPos);
  
  yPos += 10;
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(margin, yPos, contentWidth / 2 - 5, 30, 3, 3, 'F');
  doc.roundedRect(margin + contentWidth / 2 + 5, yPos, contentWidth / 2 - 5, 30, 3, 3, 'F');

  yPos += 12;
  doc.setFontSize(10);
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.text('KYC Approved', margin + 5, yPos);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatNumber(stats.kyc_approved)} users`, margin + 5, yPos + 12);
  doc.setFontSize(10);
  doc.text(`(${((stats.kyc_approved / stats.total_users) * 100).toFixed(1)}%)`, margin + 50, yPos + 12);

  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.setFont('helvetica', 'normal');
  doc.text('KYC Pending', margin + contentWidth / 2 + 10, yPos);
  doc.setTextColor(255, 152, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatNumber(stats.kyc_pending)} users`, margin + contentWidth / 2 + 10, yPos + 12);
  doc.setFontSize(10);
  doc.text(`(${((stats.kyc_pending / stats.total_users) * 100).toFixed(1)}%)`, margin + contentWidth / 2 + 60, yPos + 12);

  yPos += 40;

  // Balance Distribution Section
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BALANCE DISTRIBUTION', margin, yPos);
  
  yPos += 10;

  // Table header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, yPos, contentWidth, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BSK Range', margin + 5, yPos + 5.5);
  doc.text('Users', margin + 70, yPos + 5.5);
  doc.text('Total BSK', margin + 110, yPos + 5.5);
  doc.text('% of Total', margin + 155, yPos + 5.5);

  yPos += 8;

  // Table rows
  stats.balance_distribution.forEach((dist, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      doc.rect(margin, yPos, contentWidth, 7, 'F');
    }
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(dist.range, margin + 5, yPos + 5);
    doc.text(formatNumber(dist.count), margin + 70, yPos + 5);
    doc.text(formatNumber(dist.total_bsk), margin + 110, yPos + 5);
    const percentage = ((dist.total_bsk / stats.total_bsk) * 100).toFixed(1);
    doc.text(`${percentage}%`, margin + 155, yPos + 5);
    yPos += 7;
  });

  // Footer for page 1
  doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
  doc.setFontSize(8);
  doc.text('CONFIDENTIAL - For internal use only', pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text('Page 1', pageWidth - margin, pageHeight - 10, { align: 'right' });

  // ============ PAGES 2+: USER DATA (Landscape) ============
  const usersPerPage = 35;
  const totalPages = Math.ceil(users.length / usersPerPage);
  
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    // Add landscape page
    doc.addPage('a4', 'landscape');
    const lPageWidth = doc.internal.pageSize.getWidth();
    const lPageHeight = doc.internal.pageSize.getHeight();
    const lMargin = 10;

    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, lPageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('i-SMART BSK Migration Report - User Details', lMargin, 10);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${pageNum + 2} of ${totalPages + 1}`, lPageWidth - lMargin, 10, { align: 'right' });

    // Table headers
    let tY = 22;
    doc.setFillColor(50, 50, 50);
    doc.rect(lMargin, tY, lPageWidth - lMargin * 2, 7, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    
    // Column positions (adjusted for landscape A4)
    const cols = {
      num: lMargin + 2,
      username: lMargin + 12,
      email: lMargin + 42,
      fullName: lMargin + 82,
      phone: lMargin + 115,
      wallet: lMargin + 145,
      bskW: lMargin + 180,
      bskH: lMargin + 200,
      kyc: lMargin + 218,
      sponsor: lMargin + 235,
      date: lMargin + 262,
    };

    doc.text('#', cols.num, tY + 5);
    doc.text('Username', cols.username, tY + 5);
    doc.text('Email', cols.email, tY + 5);
    doc.text('Full Name', cols.fullName, tY + 5);
    doc.text('Phone', cols.phone, tY + 5);
    doc.text('Wallet Address', cols.wallet, tY + 5);
    doc.text('BSK (W)', cols.bskW, tY + 5);
    doc.text('BSK (H)', cols.bskH, tY + 5);
    doc.text('KYC', cols.kyc, tY + 5);
    doc.text('Sponsor', cols.sponsor, tY + 5);
    doc.text('Registered', cols.date, tY + 5);

    tY += 7;

    // User rows
    const startIndex = pageNum * usersPerPage;
    const endIndex = Math.min(startIndex + usersPerPage, users.length);
    const pageUsers = users.slice(startIndex, endIndex);

    pageUsers.forEach((user, index) => {
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(lMargin, tY, lPageWidth - lMargin * 2, 5, 'F');
      }

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');

      doc.text(String(user.row_number), cols.num, tY + 3.5);
      doc.text(truncate(user.username, 18), cols.username, tY + 3.5);
      doc.text(truncate(user.email, 25), cols.email, tY + 3.5);
      doc.text(truncate(user.full_name, 20), cols.fullName, tY + 3.5);
      doc.text(truncate(user.phone, 14), cols.phone, tY + 3.5);
      doc.text(user.wallet_address ? truncate(user.wallet_address, 18) : '-', cols.wallet, tY + 3.5);
      doc.text(formatNumber(user.withdrawable_balance), cols.bskW, tY + 3.5);
      doc.text(formatNumber(user.holding_balance), cols.bskH, tY + 3.5);
      
      // KYC status with color
      const kycStatus = user.kyc_status || 'pending';
      if (kycStatus === 'approved') {
        doc.setTextColor(34, 197, 94);
      } else {
        doc.setTextColor(255, 152, 0);
      }
      doc.text(kycStatus, cols.kyc, tY + 3.5);
      
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(truncate(user.sponsor_username, 15), cols.sponsor, tY + 3.5);
      
      const regDate = user.created_at ? format(new Date(user.created_at), 'yyyy-MM-dd') : '-';
      doc.text(regDate, cols.date, tY + 3.5);

      tY += 5;
    });

    // Footer
    doc.setTextColor(grayColor[0], grayColor[1], grayColor[2]);
    doc.setFontSize(7);
    doc.text('CONFIDENTIAL - For internal use only', lPageWidth / 2, lPageHeight - 5, { align: 'center' });
    doc.text(`BSK (W) = Withdrawable, BSK (H) = Holding`, lMargin, lPageHeight - 5);
  }

  // Save the PDF
  const filename = `BSK_Migration_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
}

export function generateBSKMigrationCSV(users: BSKUserExportData[]): void {
  const headers = [
    'Row',
    'User ID',
    'Username',
    'Email',
    'Full Name',
    'Phone',
    'Wallet Address',
    'BSK Withdrawable',
    'BSK Holding',
    'KYC Status',
    'Account Status',
    'Sponsor Username',
    'Sponsor Email',
    'Registration Date'
  ];

  const rows = users.map(user => [
    user.row_number,
    user.user_id,
    user.username || '',
    user.email || '',
    user.full_name || '',
    user.phone || '',
    user.wallet_address || '',
    user.withdrawable_balance.toFixed(2),
    user.holding_balance.toFixed(2),
    user.kyc_status || 'pending',
    user.account_status || 'active',
    user.sponsor_username || '',
    user.sponsor_email || '',
    user.created_at ? format(new Date(user.created_at), 'yyyy-MM-dd') : ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(cell => {
        const str = String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `BSK_Migration_Users_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
}
