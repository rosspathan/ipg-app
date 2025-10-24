import { format } from 'date-fns';
import type { CommissionRecord } from '@/hooks/useAdminCommissions';

export function exportCommissionsToCSV(commissions: CommissionRecord[], filename?: string) {
  // Define CSV headers
  const headers = [
    'Date',
    'Earner Username',
    'Earner Name',
    'Payer Username',
    'Payer Name',
    'Commission Type',
    'Level',
    'Amount (BSK)',
    'Destination',
    'Status',
    'Payer Badge',
  ];

  // Convert data to CSV rows
  const rows = commissions.map(commission => [
    format(new Date(commission.created_at), 'yyyy-MM-dd HH:mm:ss'),
    commission.earner_username,
    commission.earner_full_name,
    commission.payer_username,
    commission.payer_full_name,
    commission.commission_type,
    commission.level?.toString() || '-',
    commission.bsk_amount.toFixed(2),
    commission.destination,
    commission.status,
    commission.payer_badge,
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename || `commission-history-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getCommissionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    direct: '💰 Direct Commission (10%)',
    team_income: '🌳 Team Income',
    vip_milestone: '🎁 VIP Milestone',
  };
  return labels[type] || type;
}

export function getCommissionTypeColor(type: string): string {
  const colors: Record<string, string> = {
    direct: 'text-green-600 dark:text-green-400',
    team_income: 'text-blue-600 dark:text-blue-400',
    vip_milestone: 'text-purple-600 dark:text-purple-400',
  };
  return colors[type] || 'text-muted-foreground';
}

export function formatBSKAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
