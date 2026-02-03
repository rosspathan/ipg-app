

# PDF Export Feature for BSK Migration Report

## Overview

Create a comprehensive PDF export functionality for the BSK Migration admin page that generates a professional, multi-page report containing all 476+ eligible users (100+ BSK) with complete details for release planning.

---

## What Will Be Built

### 1. New Utility File: `src/utils/bskMigrationPdfExport.ts`

A dedicated PDF generation utility using jsPDF (already installed) that creates:

**Page 1: Executive Summary**
- Report title and generation date
- Total eligible users count
- Total BSK to migrate
- Breakdown by wallet status (with/without wallet)
- Breakdown by KYC status (approved/pending)
- Balance distribution table

**Pages 2+: User Data Table (Landscape)**
Each row contains:
- Row number
- Username
- Email (full)
- Full Name
- Phone
- Wallet Address
- BSK Withdrawable Balance
- BSK Holding Balance
- KYC Status
- Account Status
- Sponsor Username
- Sponsor Email
- Registration Date

### 2. Enhanced Data Fetching

Update the `BSKOnchainMigration.tsx` to fetch comprehensive user data including:
- All profile fields (email, username, display_name, full_name, phone)
- Both wallet types (bsc_wallet_address, wallet_address)
- Both balance types (withdrawable_balance, holding_balance)
- KYC and account status
- Sponsor information from referral_tree (direct_sponsor_id -> profiles)

### 3. UI Updates to `BSKOnchainMigration.tsx`

**Add Export Buttons in "Eligible Users" Tab:**
- "Export PDF" button with loading state
- "Export CSV" button with loading state
- Filter toggles (All / With Wallet / Without Wallet)

**Add Statistics Summary Card:**
- Visual breakdown of users by wallet status
- KYC status distribution

---

## Technical Implementation

### File: `src/utils/bskMigrationPdfExport.ts`

```typescript
// Structure:
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

export function generateBSKMigrationPDF(
  users: BSKUserExportData[],
  stats: BSKMigrationReportStats
): void;

export function generateBSKMigrationCSV(
  users: BSKUserExportData[]
): void;
```

### PDF Layout Design

**Page 1 (Portrait):**
```
┌─────────────────────────────────────────────────┐
│                                                 │
│     [LOGO] i-SMART BSK Migration Report        │
│        Generated: February 2, 2026              │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  EXECUTIVE SUMMARY                              │
│  ──────────────────                            │
│  Total Eligible Users:    476                   │
│  Total BSK to Migrate:    5,882,938.15         │
│                                                 │
│  WALLET STATUS                                  │
│  ├── With Wallet:    295 users (4,393,482 BSK) │
│  └── Without Wallet: 181 users (1,489,456 BSK) │
│                                                 │
│  KYC STATUS                                     │
│  ├── Approved:  56 users (12%)                 │
│  └── Pending:  420 users (88%)                 │
│                                                 │
│  BALANCE DISTRIBUTION                           │
│  ┌──────────────────────────────────┐          │
│  │ Range         │ Users │ BSK     │          │
│  ├──────────────────────────────────┤          │
│  │ 100-500       │ 49    │ 9,192   │          │
│  │ 500-1,000     │ 60    │ 35,512  │          │
│  │ 1,000-5,000   │ 186   │ 318,820 │          │
│  │ 5,000-10,000  │ 63    │ 403,731 │          │
│  │ 10,000-50,000 │ 89    │ 1,673K  │          │
│  │ 50,000+       │ 28    │ 3,461K  │          │
│  └──────────────────────────────────┘          │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Pages 2+ (Landscape):**
```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│ BSK Migration Report - User Details                                                    Page 2  │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│ # │ Username │ Email          │ BSK      │ Wallet      │ KYC     │ Sponsor   │ Registered    │
├────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1 │ mangamma │ man***@gm.com  │ 951,700  │ 0xDAe4...   │ pending │ keerthi   │ 2025-12-14   │
│ 2 │ samendar │ sam***@gm.com  │ 220,000  │ 0x3180...   │ pending │ akshitha  │ 2025-11-09   │
│ 3 │ sivaaksh │ siv***@gm.com  │ 170,100  │ 0x86bD...   │ pending │ keerthi   │ 2025-08-08   │
│ ...                                                                                           │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Enhanced Data Query

```typescript
// Fetch comprehensive user data with sponsor info
const fetchCompleteUserData = async () => {
  // 1. Get all users with 100+ BSK
  const { data: balances } = await supabase
    .from('user_bsk_balances')
    .select('user_id, withdrawable_balance, holding_balance')
    .gte('withdrawable_balance', 100)
    .order('withdrawable_balance', { ascending: false });

  const userIds = balances?.map(b => b.user_id) || [];

  // 2. Get profiles with all fields
  const { data: profiles } = await supabase
    .from('profiles')
    .select(`
      user_id, email, username, display_name, full_name, phone,
      bsc_wallet_address, wallet_address,
      kyc_status, account_status, created_at
    `)
    .in('user_id', userIds);

  // 3. Get sponsor relationships
  const { data: referrals } = await supabase
    .from('referral_tree')
    .select('user_id, direct_sponsor_id')
    .in('user_id', userIds)
    .eq('level', 1);

  // 4. Get sponsor profiles
  const sponsorIds = referrals
    ?.map(r => r.direct_sponsor_id)
    .filter(Boolean) || [];
  
  const { data: sponsors } = await supabase
    .from('profiles')
    .select('user_id, username, email')
    .in('user_id', sponsorIds);

  // 5. Merge all data
  return mergeUserData(balances, profiles, referrals, sponsors);
};
```

---

## Files to Create/Modify

### New Files:
1. **`src/utils/bskMigrationPdfExport.ts`**
   - PDF generation with jsPDF
   - Summary page + paginated user table
   - CSV export function
   - Data preparation utilities

### Modified Files:
1. **`src/pages/admin/BSKOnchainMigration.tsx`**
   - Add export buttons with loading states
   - Add comprehensive data fetching function
   - Add filter controls (wallet status)
   - Add summary statistics display
   - Import and use new export utilities

---

## Implementation Steps

### Step 1: Create PDF Export Utility
- Create `src/utils/bskMigrationPdfExport.ts`
- Implement `generateBSKMigrationPDF()` with:
  - Summary page (portrait) with statistics
  - User detail pages (landscape) with table
  - Proper pagination (40-50 users per page)
  - Footer with page numbers
  - Header with report title
- Implement `generateBSKMigrationCSV()` for raw data export

### Step 2: Update BSKOnchainMigration.tsx
- Add new interface for complete user data
- Create `fetchCompleteUserData()` function
- Add export buttons in the "Eligible Users" tab header
- Add loading states for export operations
- Add filter toggles (All / With Wallet / Without Wallet)
- Add statistics summary cards

### Step 3: Calculate Statistics
- Total users and BSK amounts
- Wallet status breakdown
- KYC status breakdown
- Balance distribution by range

---

## Output Files

When user clicks "Export PDF":
- **File**: `BSK_Migration_Report_2026-02-02.pdf`
- **Size**: Approximately 15-20 pages (for 476 users)
- **Orientation**: Page 1 Portrait, Pages 2+ Landscape

When user clicks "Export CSV":
- **File**: `BSK_Migration_Users_2026-02-02.csv`
- **Contains**: All raw data for spreadsheet analysis

---

## Technical Notes

1. **jsPDF is already installed** - Version 3.0.3 available
2. **date-fns is available** for date formatting
3. **Pagination**: ~40 users per landscape page to fit columns
4. **Privacy**: Full emails shown (admin-only access)
5. **Performance**: Client-side generation handles 500+ users without issues
6. **Precision**: Use `.toFixed(2)` for BSK amounts

---

## Summary

This implementation will provide a professional PDF report that includes:
- Executive summary with key metrics
- Complete user listing with all relevant fields
- Sponsor relationship information
- Proper pagination and formatting
- Companion CSV export for data analysis

The admin can use this report for:
- Release planning and fund allocation
- Wallet coverage gap analysis
- KYC prioritization
- Sponsor network analysis

