import jsPDF from 'jspdf';
import { format } from 'date-fns';

function fmt(n: number, decimals = 4): string {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: decimals });
}

const PRIMARY: [number, number, number] = [99, 102, 241]; // indigo
const GREEN: [number, number, number] = [34, 197, 94];
const RED: [number, number, number] = [239, 68, 68];
const AMBER: [number, number, number] = [245, 158, 11];
const TEXT: [number, number, number] = [15, 23, 42];
const GRAY: [number, number, number] = [100, 116, 139];
const HDR_BG: [number, number, number] = [30, 41, 59];
const WHITE: [number, number, number] = [255, 255, 255];
const STRIPE: [number, number, number] = [241, 245, 249];

const PW = 297; // landscape A4 width
const PH = 210;
const MARGIN = 14;
const CONTENT_W = PW - MARGIN * 2;

export function generateTradingFullReportPDF(report: any) {
  const doc = new jsPDF({ orientation: 'landscape' });
  let y = 0;

  // ─── helpers ───
  const setColor = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);

  const checkPage = (need: number) => {
    if (y + need > PH - 15) {
      doc.addPage();
      y = 15;
    }
  };

  const sectionHeader = (title: string, emoji: string) => {
    checkPage(20);
    y += 4;
    setFill(HDR_BG);
    doc.rect(MARGIN, y - 5, CONTENT_W, 8, 'F');
    setColor(WHITE);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${emoji}  ${title}`, MARGIN + 2, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    setColor(TEXT);
  };

  const kvLine = (label: string, value: string, valueColor?: [number, number, number]) => {
    checkPage(6);
    doc.setFontSize(8);
    setColor(GRAY);
    doc.text(label, MARGIN + 2, y);
    setColor(valueColor || TEXT);
    doc.setFont('helvetica', 'bold');
    doc.text(value, MARGIN + 80, y);
    doc.setFont('helvetica', 'normal');
    y += 5;
  };

  const tableRow = (cols: string[], xs: number[], bold = false, bg?: [number, number, number], textColors?: ([number, number, number] | null)[]) => {
    checkPage(6);
    if (bg) {
      setFill(bg);
      doc.rect(MARGIN, y - 3.5, CONTENT_W, 5, 'F');
    }
    doc.setFontSize(6.5);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    cols.forEach((c, i) => {
      setColor(textColors?.[i] || TEXT);
      doc.text(c, xs[i], y);
    });
    y += 5;
  };

  // ═══════════════════════════════════════
  // PAGE 1 — Title
  // ═══════════════════════════════════════
  setFill(PRIMARY);
  doc.rect(0, 0, PW, 32, 'F');
  setColor(WHITE);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('i-SMART — Trading Full Reconciliation Report', PW / 2, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${report.generated_at ? format(new Date(report.generated_at), 'PPpp') : 'N/A'}`, PW / 2, 24, { align: 'center' });
  y = 40;

  const hotWallet = report.hot_wallet || {};
  const recovery = report.recovery || {};
  const tradingActivity = report.trading_activity || {};
  const recon = report.reconciliation || [];
  const userSummaries = report.user_summaries || [];

  // ═══════════════════════════════════════
  // SECTION 1: Internal Transfers
  // ═══════════════════════════════════════
  sectionHeader('Trading Balance Transfers (Internal)', '1️⃣');
  kvLine('On-Chain → Trading (Total)', `${fmt(report.internal_transfers?.to_trading?.total_amount)} (${report.internal_transfers?.to_trading?.count || 0} txns)`, GREEN);
  kvLine('Trading → On-Chain (Total)', `${fmt(report.internal_transfers?.to_wallet?.total_amount)} (${report.internal_transfers?.to_wallet?.count || 0} txns)`, RED);
  kvLine('Transfer Fees (Inbound)', fmt(report.internal_transfers?.to_trading?.total_fees), AMBER);
  kvLine('Transfer Fees (Outbound)', fmt(report.internal_transfers?.to_wallet?.total_fees), AMBER);

  // Transfer details table
  const transfers = (report.internal_transfers?.details || []).slice(0, 60);
  if (transfers.length > 0) {
    y += 2;
    const txCols = [MARGIN + 2, MARGIN + 30, MARGIN + 75, MARGIN + 110, MARGIN + 150, MARGIN + 180];
    tableRow(['Date', 'User', 'Direction', 'Amount', 'Fee', 'Ref ID'], txCols, true, HDR_BG, [WHITE, WHITE, WHITE, WHITE, WHITE, WHITE]);
    transfers.forEach((t: any, i: number) => {
      tableRow([
        t.created_at ? format(new Date(t.created_at), 'MM/dd HH:mm') : '-',
        (t.username || 'N/A').substring(0, 20),
        t.direction === 'to_trading' ? '→ Trading' : '→ On-Chain',
        fmt(t.amount),
        fmt(t.fee),
        (t.reference_id || t.id || '').substring(0, 20),
      ], txCols, false, i % 2 === 0 ? STRIPE : undefined);
    });
  }

  // ═══════════════════════════════════════
  // SECTION 2: Hot Wallet
  // ═══════════════════════════════════════
  sectionHeader('Hot Wallet Movement', '2️⃣');
  kvLine('Wallet Address', hotWallet.address || 'N/A');
  kvLine('Total Custodial Deposits', fmt(hotWallet.total_custodial_deposits) + ` (${hotWallet.deposit_count || 0} txns)`, GREEN);
  kvLine('Total Custodial Withdrawals', fmt(hotWallet.total_custodial_withdrawals) + ` (${hotWallet.withdrawal_count || 0} txns)`, RED);
  kvLine('Withdrawal Fees Collected', fmt(hotWallet.total_withdrawal_fees), AMBER);
  kvLine('BNB Gas Balance', `${fmt(hotWallet.bnb_gas, 6)} BNB`, hotWallet.bnb_gas < 0.01 ? RED : GREEN);

  // On-chain balances
  y += 2;
  doc.setFontSize(8);
  setColor(TEXT);
  doc.setFont('helvetica', 'bold');
  doc.text('Current On-Chain Balances:', MARGIN + 2, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  Object.entries(hotWallet.on_chain_balances || {}).forEach(([token, balance]: [string, any]) => {
    kvLine(`  ${token}`, fmt(balance, 6));
  });

  // Reconciliation proof
  y += 2;
  checkPage(25);
  setFill([240, 240, 255]);
  doc.rect(MARGIN, y - 3, CONTENT_W, 22, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setColor(PRIMARY);
  doc.text('Hot Wallet Reconciliation Proof', MARGIN + 2, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  setColor(TEXT);
  doc.setFontSize(7);
  doc.text(`Total Deposits (credited):        ${fmt(hotWallet.total_custodial_deposits)}`, MARGIN + 4, y); y += 4;
  doc.text(`Total Withdrawals (completed):  -${fmt(hotWallet.total_custodial_withdrawals)}`, MARGIN + 4, y); y += 4;
  doc.setFont('helvetica', 'bold');
  doc.text(`Expected Remaining:               ${fmt(hotWallet.total_custodial_deposits - hotWallet.total_custodial_withdrawals)}`, MARGIN + 4, y); y += 6;

  // ═══════════════════════════════════════
  // SECTION 3: Recovery
  // ═══════════════════════════════════════
  sectionHeader('Recovered Trading Balances', '3️⃣');
  kvLine('Total Recovery Entries', String(recovery.total_recovery_entries || 0));
  Object.entries(recovery.by_asset || {}).forEach(([sym, data]: [string, any]) => {
    kvLine(`${sym} Recovered`, `${fmt(data.total)} (${data.count} entries)`, GREEN);
    const entries = (data.entries || []).slice(0, 30);
    if (entries.length > 0) {
      const rxCols = [MARGIN + 4, MARGIN + 30, MARGIN + 75, MARGIN + 110, MARGIN + 140];
      tableRow(['Date', 'User', 'Amount', 'Type', 'Source/Notes'], rxCols, true, HDR_BG, [WHITE, WHITE, WHITE, WHITE, WHITE]);
      entries.forEach((e: any, i: number) => {
        tableRow([
          e.date ? format(new Date(e.date), 'MM/dd HH:mm') : '-',
          (e.username || 'N/A').substring(0, 20),
          fmt(e.amount),
          e.type || '-',
          (e.notes || '-').substring(0, 40),
        ], rxCols, false, i % 2 === 0 ? STRIPE : undefined);
      });
    }
  });

  // ═══════════════════════════════════════
  // SECTION 4: Trading Activity
  // ═══════════════════════════════════════
  sectionHeader('Trading Activity Summary', '4️⃣');
  kvLine('Total Trades', String(tradingActivity.total_trades || 0));

  const pairEntries = Object.entries(tradingActivity.by_pair || {});
  if (pairEntries.length > 0) {
    const taCols = [MARGIN + 2, MARGIN + 40, MARGIN + 70, MARGIN + 110, MARGIN + 150, MARGIN + 190, MARGIN + 230];
    tableRow(['Pair', 'Trades', 'Volume', 'Value', 'Buyer Fees', 'Seller Fees', 'Total Fees'], taCols, true, HDR_BG, [WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE]);
    pairEntries.forEach(([pair, d]: [string, any], i) => {
      tableRow([
        pair, String(d.count), fmt(d.volume), fmt(d.value),
        fmt(d.buyerFees), fmt(d.sellerFees), fmt(d.buyerFees + d.sellerFees),
      ], taCols, false, i % 2 === 0 ? STRIPE : undefined);
    });
  }

  y += 3;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  setColor(TEXT);
  doc.text('Platform Fee Wallet Balances:', MARGIN + 2, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  Object.entries(tradingActivity.total_fees_collected || {}).forEach(([sym, bal]: [string, any]) => {
    kvLine(`  ${sym}`, fmt(bal), PRIMARY);
  });

  // ═══════════════════════════════════════
  // SECTION 5: Reconciliation Proof
  // ═══════════════════════════════════════
  sectionHeader('Reconciliation Proof', '5️⃣');
  if (recon.length > 0) {
    const rcCols = [MARGIN + 2, MARGIN + 30, MARGIN + 65, MARGIN + 100, MARGIN + 135, MARGIN + 168, MARGIN + 200, MARGIN + 235];
    tableRow(['Asset', 'Deposits', 'Withdrawals', 'Expected', 'User Bal', 'Fees', 'Actual', 'Discrepancy'], rcCols, true, HDR_BG, [WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE, WHITE]);
    recon.forEach((r: any, i: number) => {
      const discColor: [number, number, number] = Math.abs(r.discrepancy) > 0.01 ? RED : GREEN;
      tableRow([
        r.asset, fmt(r.total_deposits), fmt(r.total_withdrawals), fmt(r.expected_balance),
        fmt(r.user_balances), fmt(r.platform_fees), fmt(r.actual_balance),
        `${r.discrepancy > 0 ? '+' : ''}${fmt(r.discrepancy)}  ${r.status === 'BALANCED' ? '✓' : '⚠'}`,
      ], rcCols, false, i % 2 === 0 ? STRIPE : undefined, [null, GREEN, RED, null, null, PRIMARY, null, discColor]);
    });
  }

  // Ledger breakdown
  const ledgerBreakdown = report.ledger_breakdown || {};
  const lbEntries = Object.entries(ledgerBreakdown);
  if (lbEntries.length > 0) {
    y += 3;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setColor(TEXT);
    doc.text('Ledger Entry Breakdown:', MARGIN + 2, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    lbEntries.forEach(([type, data]: [string, any]) => {
      checkPage(5);
      setColor(GRAY);
      doc.text(`${type}: ${data.count} entries, Δ${fmt(data.sum_available, 2)}`, MARGIN + 4, y);
      y += 4;
    });
  }

  // ═══════════════════════════════════════
  // SECTION 6: User-Level Summary
  // ═══════════════════════════════════════
  doc.addPage();
  y = 15;
  sectionHeader(`User-Level Summary (${userSummaries.length} users)`, '6️⃣');

  const uCols = [MARGIN + 2, MARGIN + 30, MARGIN + 50, MARGIN + 80, MARGIN + 105, MARGIN + 130, MARGIN + 155, MARGIN + 180, MARGIN + 210, MARGIN + 240];
  tableRow(['User', 'Asset', 'Deposited', 'Withdrawn', 'Bought', 'Sold', 'Recovered', 'Available', 'Locked', 'Total'], uCols, true, HDR_BG, Array(10).fill(WHITE) as any);

  let rowIdx = 0;
  userSummaries.forEach((u: any) => {
    (u.assets || []).forEach((a: any, ai: number) => {
      tableRow([
        ai === 0 ? (u.username || 'N/A').substring(0, 14) : '',
        a.symbol,
        a.deposited > 0 ? fmt(a.deposited) : '-',
        a.withdrawn > 0 ? fmt(a.withdrawn) : '-',
        a.bought > 0 ? fmt(a.bought) : '-',
        a.sold > 0 ? fmt(a.sold) : '-',
        a.recovered > 0 ? fmt(a.recovered) : '-',
        fmt(a.available),
        a.locked > 0 ? fmt(a.locked) : '-',
        fmt(a.total_balance),
      ], uCols, false, rowIdx % 2 === 0 ? STRIPE : undefined);
      rowIdx++;
    });
  });

  // ═══════════════════════════════════════
  // Footer on all pages
  // ═══════════════════════════════════════
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    setColor(GRAY);
    doc.text(`Page ${i} of ${pageCount} — Confidential — i-SMART Trading Full Report — For internal use only`, PW / 2, PH - 5, { align: 'center' });
  }

  doc.save(`Trading-Full-Report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);
}
