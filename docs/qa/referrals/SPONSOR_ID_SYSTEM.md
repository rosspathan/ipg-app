# Sponsor ID Based Referral System

## Overview

The IPG I-SMART referral system now uses **sponsor user IDs directly** as referral codes, eliminating the need for a separate `referral_codes` table lookup.

## Link Format

### Old System (Random Codes)
```
https://i-smartapp.com/r/P22SZSRY75BY
                           ↑ 12-character random code
```

### New System (Sponsor ID)
```
https://i-smartapp.com/r/63f85e16-73e8-4a8d-aafa-b23611e7cb61
                           ↑ Sponsor's user_id (UUID)
```

## How It Works

### 1. Referral Link Generation

When a user views their referral page:

```typescript
// src/hooks/useReferrals.ts
setReferralCode({
  id: user.id,
  user_id: user.id,
  code: user.id, // User ID is the referral code
  created_at: new Date().toISOString()
});
```

**Generated Link:**
```
https://i-smartapp.com/r/63f85e16-73e8-4a8d-aafa-b23611e7cb61
```

### 2. Link Resolution

When someone clicks the link:

```typescript
// src/pages/ReferralResolver.tsx

// URL: /r/63f85e16-73e8-4a8d-aafa-b23611e7cb61
const { code } = useParams(); // code = sponsor's user_id

// Store directly in localStorage
const pendingRef = {
  code: sponsorId,           // UUID
  sponsorId: sponsorId,      // Same UUID
  timestamp: Date.now()
};

// Validate sponsor exists
const { data } = await supabase
  .from('profiles')
  .select('user_id')
  .eq('user_id', sponsorId)
  .maybeSingle();

// Redirect to onboarding
navigate(`/welcome?ref=${sponsorId}`);
```

### 3. Referral Capture

After email verification:

```typescript
// src/utils/referralCapture.ts

await supabase
  .from('referral_links_new')
  .upsert({
    user_id: newUserId,
    sponsor_id: pending.sponsorId,    // Direct UUID
    referral_code: pending.sponsorId, // Same UUID stored
    locked_at: NOW(),
    source: 'applink',
    capture_stage: 'after_email_verify'
  });
```

## Database Schema

### referral_links_new Table
```sql
CREATE TABLE referral_links_new (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,           -- New user (referee)
  sponsor_id UUID,                  -- Sponsor's user_id
  referral_code TEXT NOT NULL,      -- Now stores sponsor_id (UUID)
  locked_at TIMESTAMP,
  first_touch_at TIMESTAMP,
  total_referrals INTEGER DEFAULT 0,
  total_commissions NUMERIC DEFAULT 0,
  source TEXT,
  capture_stage TEXT
);
```

## Advantages

✅ **Simpler Architecture** - No separate code generation/lookup
✅ **Direct Mapping** - Code = Sponsor ID (1:1 relationship)
✅ **Faster Resolution** - Skip database lookup for code
✅ **Easier Debugging** - Can directly identify sponsor from link
✅ **No Code Collisions** - UUIDs are globally unique

## Security

### Validation Steps
1. ✅ Check sponsor exists in `profiles` table
2. ✅ Prevent self-referrals (user_id === sponsor_id)
3. ✅ Verify sponsor hasn't been locked already
4. ✅ Expire pending referrals after 30 days

### Example Validation
```typescript
// Check for self-referral
if (settings.self_referral_block && userId === pending.sponsorId) {
  console.warn('❌ Self-referral blocked');
  clearPendingReferral();
  return;
}

// Validate sponsor exists
const { data: sponsorProfile } = await supabase
  .from('profiles')
  .select('user_id')
  .eq('user_id', pending.sponsorId)
  .maybeSingle();

if (!sponsorProfile) {
  console.warn('⚠️ Sponsor not found');
  clearPendingReferral();
  return;
}
```

## Real-World Example

**Ross (Sponsor)**
- User ID: `63f85e16-73e8-4a8d-aafa-b23611e7cb61`
- Referral Link: `https://i-smartapp.com/r/63f85e16-73e8-4a8d-aafa-b23611e7cb61`

**Alice (New User) Flow:**
1. Clicks Ross's link
2. System stores: `sponsorId = "63f85e16-73e8-4a8d-aafa-b23611e7cb61"`
3. Redirects to `/welcome?ref=63f85e16-73e8-4a8d-aafa-b23611e7cb61`
4. Alice completes onboarding
5. After email verification:
   ```sql
   INSERT INTO referral_links_new (
     user_id,           -- Alice's new UUID
     sponsor_id,        -- Ross's UUID
     referral_code,     -- Ross's UUID (same)
     locked_at
   ) VALUES (
     'alice-uuid',
     '63f85e16-73e8-4a8d-aafa-b23611e7cb61',
     '63f85e16-73e8-4a8d-aafa-b23611e7cb61',
     NOW()
   );
   ```

## Mobile Deep Links

### Android App Links
```
https://i-smartapp.com/r/63f85e16-73e8-4a8d-aafa-b23611e7cb61
```

### Custom Scheme (Fallback)
```
ismart://r/63f85e16-73e8-4a8d-aafa-b23611e7cb61
```

## WhatsApp Sharing

Template:
```
Join me on IPG I-SMART! Use my link: 
https://i-smartapp.com/r/63f85e16-73e8-4a8d-aafa-b23611e7cb61 🚀
```

## Commission Tracking

When Alice makes her first trade:

```sql
-- Find Alice's sponsor
SELECT sponsor_id 
FROM referral_links_new 
WHERE user_id = 'alice-uuid' 
  AND locked_at IS NOT NULL;

-- Returns: '63f85e16-73e8-4a8d-aafa-b23611e7cb61' (Ross)

-- Credit Ross with commission
UPDATE user_bsk_balances 
SET withdrawable_balance = withdrawable_balance + commission_amount
WHERE user_id = '63f85e16-73e8-4a8d-aafa-b23611e7cb61';

-- Update Ross's stats
UPDATE referral_links_new
SET 
  total_referrals = total_referrals + 1,
  total_commissions = total_commissions + commission_amount
WHERE user_id = '63f85e16-73e8-4a8d-aafa-b23611e7cb61';
```

## Migration Notes

### Changes from Old System

**Before (Random Code System):**
- Generated 12-char random codes: `P22SZSRY75BY`
- Stored in `referral_codes` table
- Required lookup: code → user_id

**After (Sponsor ID System):**
- Uses sponsor's UUID directly: `63f85e16-73e8-4a8d-aafa-b23611e7cb61`
- No separate codes table needed
- Direct mapping: code = sponsor_id

### Backward Compatibility

Old links with random codes will still redirect correctly, but new links use sponsor IDs.

## Testing

### Test Cases

1. **Valid Sponsor Link**
   ```
   URL: /r/63f85e16-73e8-4a8d-aafa-b23611e7cb61
   Expected: Redirects to /welcome, stores pending referral
   ```

2. **Invalid Sponsor ID**
   ```
   URL: /r/invalid-uuid-123
   Expected: Still redirects, but sponsor validation fails later
   ```

3. **Self-Referral Attempt**
   ```
   User: 63f85e16-73e8-4a8d-aafa-b23611e7cb61
   Clicks: /r/63f85e16-73e8-4a8d-aafa-b23611e7cb61
   Expected: Blocked after email verification
   ```

4. **Already Locked Sponsor**
   ```
   User has locked sponsor: abc-123
   Clicks new link: /r/xyz-789
   Expected: New sponsor ignored, keeps abc-123
   ```

## Logging

Console logs for debugging:

```
🔗 Resolving referral sponsorID: 63f85e16-73e8-4a8d-aafa-b23611e7cb61
Using sponsorID directly: 63f85e16-73e8-4a8d-aafa-b23611e7cb61
✅ Valid sponsor found: 63f85e16-73e8-4a8d-aafa-b23611e7cb61
Redirecting to welcome with sponsorID

📋 Capturing referral - sponsorID: 63f85e16-73e8-4a8d-aafa-b23611e7cb61
✅ Referral locked to sponsor: 63f85e16-73e8-4a8d-aafa-b23611e7cb61
```
