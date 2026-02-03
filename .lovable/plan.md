
# Migration Hot Wallet Admin Page

## Overview

Create a dedicated admin page at `/admin/migration-hot-wallet` to generate and manage a separate hot wallet specifically for BSK on-chain migration operations. This follows the same pattern as the existing Staking Hot Wallet page.

---

## What Will Be Built

### New Admin Page: `src/pages/admin/MigrationHotWalletAdmin.tsx`

A dedicated page that allows admins to:

1. **View Current Migration Wallet** - Display the active migration wallet address and BNB gas balance
2. **Generate New Wallet** - Create a new BIP39 24-word mnemonic wallet
3. **Import Existing Wallet** - Import from an existing 24-word recovery phrase
4. **Save to Database** - Store the wallet address in `platform_hot_wallet` table with label "Migration Hot Wallet"
5. **Download Credentials** - Save the mnemonic and private key to a secure file
6. **Copy Private Key** - Easy copy for adding to secrets

---

## Database Storage

The migration wallet address will be stored in the existing `platform_hot_wallet` table:

```text
+------------------+--------------------------------+
| Column           | Value                          |
+------------------+--------------------------------+
| address          | 0x...                          |
| chain            | BSC                            |
| label            | Migration Hot Wallet           |
| is_active        | true                           |
+------------------+--------------------------------+
```

The private key must be stored separately as a Supabase secret: `MIGRATION_WALLET_PRIVATE_KEY`

---

## Page Features

### Header Section
- Back navigation to admin dashboard
- Title "Migration Hot Wallet" with migration icon
- Description explaining the purpose

### Current Wallet Status Card (if configured)
- Display active migration wallet address
- Show BNB gas balance (real-time from BSC)
- Low gas warning if below 0.05 BNB
- Link to BscScan for the address
- Status indicator (Healthy / Low Gas)

### Security Warning Alert
- Critical operation warning
- Reminder that credentials are shown only once
- Must save before leaving page

### Mode Selection (if no wallet generated yet)
- **Generate New** button - Creates fresh 24-word wallet
- **Import Existing** button - Enter existing mnemonic

### Credentials Display (after generation/import)
- Wallet Address (public, copyable)
- Recovery Phrase (24 words, hidden by default, toggle visibility)
- Private Key (hidden by default, with copy button)
- Note about saving as `MIGRATION_WALLET_PRIVATE_KEY` secret

### Action Buttons
- **Download Credentials** - Saves to `.txt` file
- **Save Address to Database** - Stores in `platform_hot_wallet` table
- **Copy to Clipboard** - For each field

### Setup Instructions Card
- Step-by-step guide for completing setup
- 1. Save credentials securely
- 2. Click "Save to Database"
- 3. Add private key to Cloud Secrets
- 4. Fund wallet with BNB for gas

---

## Files to Create

### 1. `src/pages/admin/MigrationHotWalletAdmin.tsx`

The main admin page with:
- BIP39 wallet generation using existing `bip39` and `ethers` libraries
- Database integration with `platform_hot_wallet` table
- Real-time BNB balance checking via BSC RPC
- Secure credential display with show/hide toggles
- Download and copy functionality

---

## Files to Modify

### 1. `src/App.tsx`

Add route for the new page:
```typescript
<Route path="migration-hot-wallet" element={
  <React.Suspense fallback={<LoadingFallback />}>
    {React.createElement(React.lazy(() => import('./pages/admin/MigrationHotWalletAdmin')))}
  </React.Suspense>
} />
```

### 2. `src/components/admin/unified/AdminSidebarUnified.tsx`

Add navigation link in the System section:
```typescript
{ title: "Migration Wallet", url: "/admin/migration-hot-wallet", icon: Coins }
```

---

## Technical Implementation Details

### Wallet Generation
```typescript
// Generate 24-word mnemonic for maximum security
const mnemonic = bip39.generateMnemonic(256);
const wallet = ethers.Wallet.fromPhrase(mnemonic);
```

### Database Save
```typescript
// Deactivate any existing migration wallets first
await supabase
  .from('platform_hot_wallet')
  .update({ is_active: false })
  .eq('label', 'Migration Hot Wallet');

// Insert new migration wallet
await supabase
  .from('platform_hot_wallet')
  .insert({
    address: walletAddress,
    chain: 'BSC',
    label: 'Migration Hot Wallet',
    is_active: true
  });
```

### BNB Balance Check
```typescript
const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
const balance = await provider.getBalance(walletAddress);
const bnbBalance = ethers.formatEther(balance);
```

---

## Secret Configuration

After generating the wallet, the admin must:

1. Copy the **Private Key** from the credentials display
2. Navigate to Cloud Secrets
3. Add new secret with name: `MIGRATION_WALLET_PRIVATE_KEY`
4. Paste the private key as the value
5. Fund the wallet address with BNB (~0.5-1 BNB recommended)

---

## UI Design

Following the exact same visual pattern as `StakingHotWalletAdmin.tsx`:
- Dark theme compatible cards
- Primary color accents for active wallet
- Destructive color for security warnings
- Green/Red status indicators for wallet health
- Blur effect on sensitive credentials
- Consistent button styling

---

## Navigation Access

**Sidebar Location**: System section
**URL Path**: `/admin/migration-hot-wallet`
**Icon**: Coins (or Send icon to distinguish from staking)

---

## Summary

This creates a dedicated, secure workflow for managing the BSK migration hot wallet separately from:
- Trading Hot Wallet (`/admin/generate-hot-wallet`)
- Staking Hot Wallet (`/admin/staking-wallet`)

Each wallet serves a distinct purpose and has isolated funds for operational security.
