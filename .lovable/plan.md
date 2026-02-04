
# Fix Edge Function Migration Error

## Problem Identified

The migration is failing with error:
```
'new row for relation "bsk_onchain_migration_batches" violates check constraint "bsk_onchain_migration_batches_status_check"'
```

**Root Cause:** The edge function `user-migrate-bsk-onchain` is trying to create a batch with `status: 'active'`, but the database only allows these status values:
- `pending`
- `processing`
- `completed`
- `partial`
- `failed`
- `cancelled`

## Solution

Update the edge function to use a valid status value when creating/querying for user-initiated migration batches.

### Changes Required

**File: `supabase/functions/user-migrate-bsk-onchain/index.ts`**

1. **Line 272-273** - Change the query to look for `status: 'pending'` instead of `'active'`:
   ```typescript
   // Before
   .eq('status', 'active')
   
   // After
   .eq('status', 'pending')
   ```

2. **Line 283** - Change the insert to use `status: 'pending'` instead of `'active'`:
   ```typescript
   // Before
   status: 'active',
   
   // After
   status: 'pending',
   ```

### Technical Details

The edge function has two places where `'active'` is used incorrectly:

1. **Query for existing batch (line 272):** Looking for a batch with `status: 'active'` will never find one because no batch can have that status.

2. **Insert new batch (line 283):** Trying to insert with `status: 'active'` causes the constraint violation error.

Both need to be changed to `'pending'` which is the default status and is allowed by the constraint.

After this fix:
- User migrations will successfully create/find the USER-INITIATED batch
- The transaction will proceed to execute on-chain
- Migration history will be properly recorded
