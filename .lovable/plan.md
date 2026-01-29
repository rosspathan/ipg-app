
# Crypto Staking System: Wallet Transfer & Admin Hot Wallet Setup

## Overview

This plan implements the complete wallet-to-staking-account transfer flow and a dedicated admin interface for managing the staking hot wallet. The staking system will have its own separate hot wallet (distinct from the trading hot wallet) to maintain clear fund separation.

## Architecture

```text
┌─────────────────────┐    On-chain Transfer    ┌────────────────────────┐
│   User's Wallet     │ ────────────────────────▶ │  Staking Hot Wallet   │
│  (Personal BEP-20)  │    IPG Tokens           │  (Admin 24-word seed)  │
└─────────────────────┘                          └────────────────────────┘
                                                           │
                                                           ▼
                                                   ┌───────────────────┐
                                                   │  user_staking_    │
                                                   │  accounts         │
                                                   │  (available_bal)  │
                                                   └───────────────────┘
                                                           │
                                               Choose Plan │ 0.5% Fee
                                                           ▼
                                                   ┌───────────────────┐
                                                   │  user_crypto_     │
                                                   │  stakes           │
                                                   │  (locked 30 days) │
                                                   └───────────────────┘
```

## Deliverables

### 1. Admin Staking Hot Wallet Generator Page

A new admin page at `/admin/staking-wallet` to generate and manage the dedicated staking hot wallet.

**Features:**
- Generate new 24-word BIP39 mnemonic seed phrase
- Display/copy wallet address, private key, and recovery phrase
- Download credentials as secure file
- Save wallet address to `crypto_staking_config.admin_hot_wallet_address`
- Show current staking wallet status and BNB gas balance
- Instructions for storing private key as Supabase secret (`STAKING_WALLET_PRIVATE_KEY`)

**UI Components:**
- Warning banner about security (credentials shown once)
- Current wallet status card with gas balance indicator
- Generation form with reveal/hide toggles
- Copy-to-clipboard buttons for all fields
- Save to database confirmation

### 2. Wallet to Staking Account Transfer Flow

**New Components:**

**`StakingDepositScreen.tsx`** (`/app/staking/deposit`)
- Shows user's current on-chain IPG balance
- Displays staking hot wallet address for deposit
- QR code for easy mobile wallet scanning
- Amount input with "Max" button
- Clear instructions: "Send IPG to this address to fund your staking account"
- Real-time deposit detection status

**Transfer Process:**
1. User views their on-chain IPG balance
2. User clicks "Fund" → goes to deposit screen
3. User sends IPG from their wallet to the staking hot wallet address
4. Edge function detects the deposit via blockchain monitoring
5. User's `user_staking_accounts.available_balance` is credited
6. Transaction recorded in `crypto_staking_ledger` with `tx_type='deposit'`

### 3. Staking Account to Wallet Withdrawal Flow

**New Component: `StakingWithdrawScreen.tsx`**
- Shows available (unlocked) staking balance
- 0.5% withdrawal fee display
- Confirmation dialog
- Initiates on-chain transfer from staking hot wallet back to user

### 4. Edge Functions

**`staking-deposit-monitor/index.ts`**
- Monitors staking hot wallet for incoming IPG transfers
- Matches deposits to users via their registered wallet addresses
- Credits `user_staking_accounts.available_balance`
- Creates ledger entry in `crypto_staking_ledger`

**`process-staking-deposit/index.ts`**
- Manual deposit crediting (admin use)
- Validates transaction hash on BSCScan
- Prevents double-crediting

**`process-staking-withdrawal/index.ts`**
- Validates available balance
- Deducts 0.5% unstaking fee
- Signs and broadcasts on-chain transfer using `STAKING_WALLET_PRIVATE_KEY`
- Updates `crypto_staking_ledger`

### 5. Staking Account Hook

**`useCryptoStakingAccount.ts`**
- Fetches user's staking account balance
- Fetches staking plans from database
- Fetches user's active stakes
- Fetches staking history/ledger
- Provides deposit address (from config)
- Real-time subscription for balance updates

### 6. Updated Staking Screen

**Updates to `CryptoStakingScreen.tsx`:**
- Fetch real staking account balance from database
- Fetch staking plans from `crypto_staking_plans` table (not hardcoded)
- Show "Fund" button linking to deposit page
- Display pending deposits status
- Show real-time available balance

---

## Technical Details

### Database Tables Already Exist

| Table | Purpose |
|-------|---------|
| `crypto_staking_config` | Global config: hot wallet address, 0.5% fees |
| `crypto_staking_plans` | 4 tiers already seeded |
| `user_staking_accounts` | Per-user: available_balance, staked_balance |
| `user_crypto_stakes` | Individual locked stake positions |
| `crypto_staking_ledger` | Full audit trail of all transactions |

### Secret Required

You will need to add **`STAKING_WALLET_PRIVATE_KEY`** as a Supabase secret after generating the hot wallet. This is used by the withdrawal edge function to sign on-chain transactions.

### File Structure

```text
src/
├── pages/
│   ├── CryptoStakingScreen.tsx (update)
│   ├── StakingDepositScreen.tsx (new)
│   ├── StakingWithdrawScreen.tsx (new)
│   └── admin/
│       └── StakingHotWalletAdmin.tsx (new)
├── hooks/
│   └── useCryptoStakingAccount.ts (new)
└── components/
    └── staking/
        ├── StakingAccountCard.tsx (new)
        ├── StakingPlanCard.tsx (new)
        └── StakingHistory.tsx (new)

supabase/functions/
├── staking-deposit-monitor/index.ts (new)
├── process-staking-deposit/index.ts (new)
├── process-staking-withdrawal/index.ts (new)
└── distribute-staking-rewards/index.ts (already exists - for monthly rewards)
```

### Security Considerations

1. **Separate hot wallet** from trading to isolate staking funds
2. **Private key stored as secret** - never exposed to frontend
3. **RLS policies** already in place for staking tables
4. **Ledger-based auditing** for all balance changes
5. **Fee enforcement** on both entry (0.5%) and exit (0.5%)

---

## Implementation Sequence

1. **Create Admin Staking Wallet Page** - Generate and save the staking hot wallet
2. **Create useCryptoStakingAccount hook** - Database integration
3. **Update CryptoStakingScreen** - Connect to real database
4. **Create StakingDepositScreen** - Deposit flow UI
5. **Create staking-deposit-monitor edge function** - On-chain detection
6. **Create process-staking-withdrawal edge function** - Withdrawal handling
7. **Add routing** - Register new pages in App.tsx

After implementation, you will:
1. Navigate to `/admin/staking-wallet`
2. Generate or enter your 24-word seed phrase
3. Save the wallet address to the database
4. Store the private key as `STAKING_WALLET_PRIVATE_KEY` secret
5. Fund the wallet with a small amount of BNB for gas fees
