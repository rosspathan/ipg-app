

# BSK On-Chain Migration: Deep Analysis & Enhanced Plan

## Executive Summary

### Current State: Data Analysis

| Metric | Value |
|--------|-------|
| **Total Eligible Users** | 479 users with ≥100 BSK |
| **Total BSK to Migrate** | 5,901,469.65 BSK |
| **Users WITH Wallet** | 274 users (4,393,482.15 BSK) |
| **Users WITHOUT Wallet** | 205 users (1,507,987.50 BSK) |
| **Average Balance** | 12,320.40 BSK |
| **Largest Balance** | 951,700 BSK (single user) |
| **Minimum Threshold** | 100 BSK |

### Balance Distribution

| Range | Users | Total BSK |
|-------|-------|-----------|
| 100-500 BSK | 49 | 9,192.50 |
| 500-1,000 BSK | 60 | 35,511.85 |
| 1,000-5,000 BSK | 190 | 318,820.30 |
| 5,000-10,000 BSK | 63 | 403,730.65 |
| 10,000-50,000 BSK | 89 | 1,673,562.90 |
| 50,000+ BSK | 28 | 3,460,651.45 |

---

## Critical Issues Identified

### Issue 1: Wallet Coverage Gap
- **Problem**: 205 users (43%) with 1.5M BSK have NO linked wallet
- **Impact**: Cannot migrate these users until they link a wallet
- **Solution**: Either require wallet linking OR allow claiming later

### Issue 2: Current Hot Wallet Risk
- **Problem**: The system uses `ADMIN_WALLET_PRIVATE_KEY` which is the general admin wallet
- **Risk**: Mixing operational funds with migration funds is dangerous
- **Solution**: Create a dedicated migration hot wallet

### Issue 3: Gas Cost Calculation
- **Current**: Uses hardcoded BNB/BSK rate (1 BNB = 10,000 BSK)
- **Problem**: If BSK price changes, gas deductions become unfair
- **Solution**: Fetch real-time price or use system setting

### Issue 4: Precision Handling
- **Risk**: JavaScript floating-point errors on large numbers
- **Example**: 951,700 BSK could have rounding issues
- **Solution**: Use BigInt/string arithmetic throughout

---

## Proposed Enhanced Architecture

### A. Dedicated Migration Hot Wallet

Create a **separate** hot wallet specifically for migrations:

```
Purpose: Hold only BSK tokens for migration
Fund it with: Exactly the amount needed for current batch
Benefits:
  - Isolated risk (if compromised, only migration funds at risk)
  - Clear audit trail (all transactions are migration-related)
  - Easier reconciliation (wallet balance = remaining migrations)
```

**Implementation:**
1. Generate new BSC wallet (admin does this externally)
2. Store private key as new secret: `MIGRATION_WALLET_PRIVATE_KEY`
3. Fund wallet with required BSK before starting batch
4. Edge function uses this wallet for transfers

### B. Pre-Migration Funding Calculator

Add a new action to calculate exact funding requirements:

```typescript
action: 'calculate_funding' => {
  total_bsk_needed: 4,393,482.15,  // For users with wallets
  estimated_gas_bsk: ~5,000,       // 274 users × ~18 BSK gas each
  net_bsk_to_transfer: 4,388,482,  // After gas deductions
  bnb_for_gas: ~0.195 BNB,         // 274 × 65,000 gas × 3 gwei
  funding_address: "0x...",
  bscscan_link: "https://..."
}
```

### C. Balance Reconciliation Check

Before ANY migration, verify:

```sql
-- Each user's withdrawable_balance MUST match ledger sum
SELECT 
  ub.user_id,
  ub.withdrawable_balance as table_balance,
  (SELECT SUM(CASE WHEN tx_type='credit' THEN amount_bsk ELSE -amount_bsk END)
   FROM unified_bsk_ledger 
   WHERE user_id = ub.user_id 
   AND balance_type = 'withdrawable' 
   AND status = 'completed') as ledger_balance,
  ABS(ub.withdrawable_balance - ledger_balance) as drift
FROM user_bsk_balances ub
WHERE ub.withdrawable_balance >= 100
HAVING drift > 0.01;  -- Flag any mismatch > 0.01 BSK
```

---

## Implementation Plan

### Phase 1: Infrastructure Setup

**1.1 Add Migration Wallet Secret**
- Admin generates new BSC wallet (MetaMask/hardware wallet)
- Store `MIGRATION_WALLET_PRIVATE_KEY` as new secret
- Keep backup of private key securely offline

**1.2 Create Funding Calculator Endpoint**
Add new action to existing edge function:
```typescript
case 'calculate_funding':
  return await calculateFundingRequirements(supabase);
```

Returns:
- Exact BSK needed
- Estimated BNB for gas
- Migration wallet address
- Link to fund via BscScan

**1.3 Update Edge Function for New Wallet**
- Add fallback: Use `MIGRATION_WALLET_PRIVATE_KEY` if set, else `ADMIN_WALLET_PRIVATE_KEY`
- Add wallet balance pre-check before creating batch

### Phase 2: Pre-Migration Safeguards

**2.1 Balance Integrity Audit**
New action: `action: 'audit_balances'`
- Compares every eligible user's `withdrawable_balance` vs ledger sum
- Flags any drift > 0.01 BSK
- BLOCKS batch creation if mismatches found
- Provides fix command for admins

**2.2 Precision-Safe Arithmetic**
Replace all balance calculations with string/BigInt:
```typescript
// BEFORE (risky)
const netAmount = amountBsk - gasDeduction;

// AFTER (safe)
import BigNumber from 'bignumber.js';
const netAmount = new BigNumber(amountBsk).minus(gasDeduction).toFixed(8);
```

**2.3 Dynamic Gas Pricing**
Fetch current BSK/BNB rate from:
- Option A: Add to `system_settings` table (admin-controlled)
- Option B: Query from trading pair on-chain
- Option C: Use CMC/CoinGecko API (requires new secret)

### Phase 3: Enhanced Migration Flow

**Step-by-Step Process:**

```text
1. CALCULATE FUNDING
   └─> Admin calls 'calculate_funding'
   └─> Shows: 274 users, 4,393,482 BSK, ~0.2 BNB gas

2. FUND MIGRATION WALLET
   └─> Admin sends BSK + BNB to migration wallet
   └─> System verifies sufficient balance

3. AUDIT BALANCES
   └─> Admin calls 'audit_balances'
   └─> System checks all users' balances match ledger
   └─> If mismatches: STOP and reconcile first

4. CREATE BATCH
   └─> Snapshots all balances
   └─> Records idempotency keys
   └─> Marks batch as 'pending'

5. PROCESS MIGRATIONS (one-by-one or bulk)
   └─> For each user:
       ├─> Validate current balance
       ├─> Calculate gas deduction (precision-safe)
       ├─> Debit internal ledger (idempotent)
       ├─> Sign & broadcast on-chain transfer
       ├─> Wait for confirmation
       └─> Update status to 'completed'

6. POST-MIGRATION VERIFICATION
   └─> Compare expected vs actual on-chain transfers
   └─> Generate audit report
   └─> Handle any failures (rollback or retry)
```

### Phase 4: UI Enhancements

**4.1 Add Funding Status Card**
Show migration wallet status:
- Current BSK balance
- Current BNB balance (for gas)
- Expected remaining after batch

**4.2 Add Audit Tab**
- Run balance integrity check
- Show any mismatches
- One-click reconciliation

**4.3 Add Funding Calculator**
- Show exact requirements before batch creation
- Deep link to fund via BscScan

---

## Technical Details

### New System Settings

| Key | Value | Purpose |
|-----|-------|---------|
| `bsk_migration_enabled` | true/false | Global kill switch |
| `bsk_migration_min_amount` | 100 | Minimum BSK to migrate |
| `bsk_to_bnb_rate` | 10000 | 1 BNB = X BSK for gas calc |
| `bsk_migration_gas_buffer` | 1.2 | 20% gas price buffer |
| `bsk_contract_address` | 0x742... | BSK BEP-20 contract |

### Edge Function Updates

```typescript
// New actions to add:
'calculate_funding'    // Calculate exact BSK + BNB needed
'audit_balances'       // Check all balances match ledger
'get_wallet_status'    // Show migration wallet balances
'reconcile_user'       // Fix single user's balance drift
```

### Database Additions

Add columns to `bsk_onchain_migrations`:
- `balance_verified_at` - When ledger match was confirmed
- `precision_amount_wei` - Full precision amount as string
- `gas_rate_used` - BSK/BNB rate used for this transfer

---

## Risk Mitigation

### What Could Go Wrong?

| Risk | Mitigation |
|------|------------|
| User withdraws during migration | Lock withdrawals for users in batch |
| Hot wallet hacked | Use separate wallet with only required funds |
| BSC network congestion | Dynamic gas pricing + retry mechanism |
| Double debit | Idempotency keys prevent this |
| Partial batch failure | Rollback mechanism restores internal balance |
| Precision loss | BigNumber.js for all calculations |

### Rollback Strategy

If migration fails AFTER internal debit:
1. System automatically credits back via `migration_rollback` tx_subtype
2. Uses unique idempotency key: `migrate_rollback_{migration_id}`
3. Updates status to `rolled_back`
4. Batch marked as `partial` (not `completed`)

---

## Summary: What Will Be Built

1. **New Secret**: `MIGRATION_WALLET_PRIVATE_KEY` for dedicated hot wallet
2. **Edge Function Updates**:
   - `calculate_funding` action - shows exact requirements
   - `audit_balances` action - verifies ledger integrity
   - `get_wallet_status` action - shows hot wallet balances
   - Dynamic gas rate from system settings
   - BigNumber.js for precision-safe arithmetic
3. **UI Enhancements**:
   - Funding calculator panel
   - Balance audit tab
   - Migration wallet status display
4. **System Settings**: Gas rate, minimum amount, contract address

---

## Next Steps After Approval

1. Admin generates new BSC wallet externally
2. Add `MIGRATION_WALLET_PRIVATE_KEY` secret
3. I implement the enhanced edge function
4. I update the admin UI
5. Admin funds the migration wallet
6. Run audit to verify all balances
7. Create first batch and test with small users (100-500 BSK range)
8. If successful, proceed with larger batches

