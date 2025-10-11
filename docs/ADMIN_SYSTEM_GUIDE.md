# Admin System Guide - I-SMART Exchange

## Overview
The admin role provides complete control over the I-SMART Exchange platform, including user management, financial operations, program configuration, and system settings.

---

## 🔐 Admin Authentication & Access

### Who Can Be an Admin?

1. **Automatic Admin Assignment**
   - Email: `rosspathan@gmail.com` is automatically assigned admin role on signup
   - This is handled by the database trigger `assign_admin_role_to_email()`

2. **Manual Admin Assignment**
   - Use the `grant-admin-by-email` edge function
   - Requires an existing admin to execute
   - Method: Call the function with user's email address

3. **Web3 Wallet Admin Access**
   - Admins can authenticate using their Web3 wallet
   - Uses the `web3-admin-auth` edge function
   - Admin wallet addresses are configured in environment variables (`ADMIN_WALLETS`)
   - Provides signature-based authentication without password

### How Admin Status is Verified

Admin access is controlled through a **secure, server-side validation system**:

```typescript
// Database function (server-side)
has_role(user_id uuid, role app_role) returns boolean

// This function is SECURITY DEFINER, meaning:
// - It executes with database owner privileges
// - It bypasses RLS policies to check the user_roles table
// - It prevents privilege escalation attacks
```

**🔒 Critical Security**: Admin status is NEVER stored in:
- localStorage (can be manipulated by users)
- Client-side code (can be bypassed)
- Profile or users table (violates security best practices)

Admin status is stored in a separate `user_roles` table with Row-Level Security (RLS) policies.

---

## 📊 Admin Dashboard

### Access Points
- **URL**: `/admin/dashboard` or `/admin`
- **Login**: `/admin/login`

### Dashboard Features
- **Active Users**: Total registered, active users
- **24h Trading Volume**: Total trading activity
- **Deposits & Withdrawals**: Financial flow monitoring
- **Fee Revenue**: Platform earnings
- **Pending Queues**:
  - KYC verifications pending
  - Fiat withdrawal requests
  - Insurance claims awaiting review

---

## 🛠️ Admin Capabilities

### 1. **User Management** (`/admin/users`)

**What Admins Can Do:**
- View all user profiles
- Search and filter users
- Check user verification status (KYC levels)
- View user balances (wallet, BSK, bonus balances)
- View user transaction history
- Manage user roles (grant/revoke admin access)
- View user referral networks
- Check user badge status

**Database Tables Accessed:**
- `profiles` - User profile information
- `user_roles` - Role assignments
- `user_bsk_balances` - BSK token balances
- `wallet_balances` - Crypto wallet balances
- `referral_relationships` - Referral connections

**RLS Policies:**
```sql
-- Admins can view all profiles
CREATE POLICY "Admins can manage profiles"
ON public.profiles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
```

---

### 2. **BSK Token Management** (`/admin/bsk`)

**What Admins Can Do:**
- Set BSK exchange rates (BSK to INR conversion)
- View total BSK in circulation
- Monitor BSK mint/burn limits
- Configure withdrawal settings:
  - Minimum withdrawal amount
  - Maximum withdrawal amount
  - Withdrawal fees
  - Enable/disable withdrawals
  - KYC requirements for withdrawals

**Manual Operations:**
- **Manual BSK Purchases** (`/admin/bsk-manual-purchases`):
  - Create manual BSK purchase orders for users
  - Used for offline/bank transfer purchases
  - Generates proper ledger entries
  
- **BSK Withdrawals** (`/admin/bsk-withdrawals`):
  - Approve/reject user BSK withdrawal requests
  - Process payouts to user bank accounts/UPI
  - Track withdrawal status

- **Crypto Conversions** (`/admin/crypto-conversions`):
  - Manage user requests to convert crypto to BSK
  - Set conversion rates
  - Process conversion orders

**Database Tables:**
- `bsk_rates` - Exchange rate history
- `bsk_admin_settings` - Global BSK configuration
- `user_bsk_balances` - User BSK holdings
- `bsk_withdrawable_ledger` - Withdrawable balance transactions
- `bsk_holding_ledger` - Holding balance transactions

**Edge Functions:**
- `admin-reset-balances` - Reset all user balances (emergency use)

---

### 3. **Referral System Management** (`/admin/referrals`)

**What Admins Can Control:**

#### A. Global Settings (`team_referral_settings` table)
```sql
-- Admin can configure:
- enabled: true/false (turn system on/off)
- direct_referral_percent: 10.0 (commission %)
- cooloff_hours: 24 (hours before payout)
- trigger_event: 'badge_purchase_or_upgrade'
- payout_destination: 'WITHDRAWABLE' or 'HOLDING'
- min_referrer_badge_required: 'ANY_BADGE' or specific badge
- max_daily_direct_commission_bsk: 100000
```

#### B. Badge Threshold Configuration (`badge_thresholds` table)
Admin can set for each badge tier:
- `bsk_threshold`: Cost in BSK to purchase badge
- `unlock_levels`: How many referral levels this badge unlocks
- `bonus_bsk_holding`: Bonus BSK given on purchase
- `is_active`: Enable/disable specific badge tier

**Example Badge Configuration:**
| Badge | BSK Cost | Unlocked Levels | Bonus BSK |
|-------|----------|-----------------|-----------|
| Silver | 1 BSK | 10 levels | 0 BSK |
| Gold | 5 BSK | 20 levels | 0 BSK |
| Platinum | 20 BSK | 30 levels | 0 BSK |
| Diamond | 100 BSK | 40 levels | 0 BSK |
| i-Smart VIP | 5000 BSK | 50 levels | 0 BSK |

#### C. Monitor Referral Activity
- View all referral relationships (`referral_relationships`)
- Track referral events (`referral_events`)
- Monitor commission payouts
- View referral ledger (`referral_ledger`)

**SQL Queries for Monitoring:**
```sql
-- Total referrals in system
SELECT COUNT(*) FROM referral_relationships;

-- Top referrers
SELECT referrer_id, COUNT(*) as total_referrals
FROM referral_relationships
GROUP BY referrer_id
ORDER BY total_referrals DESC
LIMIT 10;

-- Total commissions paid
SELECT SUM(amount_bsk) FROM referral_ledger;

-- Badge purchase rate
SELECT 
  COUNT(CASE WHEN current_badge != 'None' THEN 1 END) as badge_holders,
  COUNT(*) as total_users,
  ROUND(100.0 * COUNT(CASE WHEN current_badge != 'None' THEN 1 END) / COUNT(*), 2) as badge_rate
FROM user_badge_status;
```

---

### 4. **Market & Trading Management** (`/admin/markets`)

**What Admins Can Do:**
- Create new trading pairs (e.g., BTC/USDT)
- Enable/disable trading pairs
- Set trading fees:
  - Maker fee percentage
  - Taker fee percentage
- Configure market parameters:
  - Minimum trade amount
  - Maximum trade amount
  - Price precision
  - Volume precision
- View market statistics and trading volume

**Database Tables:**
- `markets` - Trading pair configuration
- `assets` - Token/coin information
- `trades` - Trade execution records
- `orders` - Open order book

---

### 5. **Program Management** (`/admin/programs`)

Admins control all gamification and earning programs:

#### A. **Lucky Draw** (`/admin/lucky-draw`)
- Create draw campaigns
- Set ticket prices
- Configure prize pool
- Set pool size (e.g., 100 participants)
- Execute draws (manual or automatic)
- Distribute prizes

**Tables**: `lucky_draw_configs`, `lucky_draw_tickets`, `draw_results`

#### B. **Spin Wheel** (`/admin/spin`)
- Configure spin segments (rewards)
- Set segment probabilities (weights)
- Set free spin limits per user
- Configure bet amounts
- Manage RNG seeds for provable fairness

**Tables**: `spin_segments`, `spin_user_limits`, `spin_transactions`, `rng_seeds`

#### C. **Advertising Mining** (`/admin/ads`)
- Upload ad campaigns
- Set BSK rewards per ad view
- Configure view time requirements
- Set impression limits
- Target specific regions
- Track ad performance

**Tables**: `ads`, `ad_clicks`, `ad_subscription_tiers`

#### D. **Insurance Program** (`/admin/insurance-claims`)
- Review insurance claims
- Approve/reject claims
- Set coverage ratios
- Configure subscription tiers
- Process claim payouts

**Tables**: `insurance_bsk_claims`, `insurance_bsk_plans`, `user_insurance_subscriptions`

**Edge Function**: `insurance-claim-process`

#### E. **BSK Loans** (`/admin/bsk-loans`)
- Review loan applications
- Approve/reject loans
- Set interest rates
- Configure repayment schedules
- Track loan performance

**Tables**: `bsk_loans`, `bsk_loan_installments`, `bsk_loan_ledger`

**Edge Function**: `bsk-loan-disburse`

#### F. **Staking Programs** (`/admin/staking`)
- Create staking pools
- Set APY rates
- Configure lock periods
- Manage reward distributions

---

### 6. **Funding Operations** (`/admin/funding`)

**Fiat Deposits:**
- Review deposit proof images
- Verify bank transfer references
- Approve/reject deposits
- Credit user INR balances

**Fiat Withdrawals:**
- Review withdrawal requests
- Verify user bank account details
- Process payouts
- Add admin notes

**Tables**: `fiat_deposits`, `fiat_withdrawals`, `inr_funding_routes`

---

### 7. **Announcements** (`/admin/announcements`)

- Create system-wide announcements
- Set announcement priority
- Schedule announcements
- Target specific user groups
- Manage announcement visibility

---

### 8. **System Settings** (`/admin/settings`)

**What Admins Can Configure:**
- KYC verification levels
- Security settings
- Fee structures
- Supported payment methods
- Email templates
- System maintenance mode

**Tables**: `system_settings`, `kyc_admin_config`

---

## 🔍 Monitoring & Audit

### Audit Logs
All admin actions are logged in the `audit_logs` table:

```typescript
{
  user_id: uuid,          // Who performed the action
  action: string,         // What action (e.g., 'user_approved')
  resource_type: string,  // What was affected (e.g., 'kyc')
  resource_id: string,    // Specific record ID
  old_values: jsonb,      // Before state
  new_values: jsonb,      // After state
  ip_address: inet,       // IP address of admin
  created_at: timestamp   // When action occurred
}
```

**RLS Policy:**
```sql
-- Only admins can view audit logs
CREATE POLICY "Admin can view audit_logs"
ON public.audit_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
```

---

## 🚨 Security Best Practices for Admins

1. **Never Share Admin Credentials**
   - Each admin should have unique credentials
   - Use Web3 wallet signing for additional security

2. **Review Audit Logs Regularly**
   - Monitor for unauthorized access
   - Check for suspicious activities

3. **Test Changes in Staging**
   - Never make direct production changes without testing
   - Use database transactions when possible

4. **Backup Before Major Changes**
   - Take database snapshots before:
     - Changing fee structures
     - Modifying referral settings
     - Resetting balances

5. **Use Cooloff Periods**
   - Don't immediately approve large withdrawals
   - Review high-value transactions carefully
   - Enable multi-admin approval for critical operations

---

## 📞 Admin Support

### Emergency Procedures

**If Admin Access is Lost:**
1. Access database directly via Supabase dashboard
2. Run SQL to grant admin role:
```sql
INSERT INTO public.user_roles (user_id, role, assigned_by)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
  'admin'::app_role,
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com')
);
```

**If System is Down:**
1. Check Supabase project status
2. Review edge function logs
3. Check database connection limits
4. Review RLS policies for misconfigurations

---

## 📊 Database Schema Summary

### Core Admin Tables
- `user_roles` - Role assignments (admin, moderator, user)
- `audit_logs` - All admin action history
- `team_referral_settings` - Global referral configuration
- `badge_thresholds` - Badge tier pricing and benefits
- `bsk_admin_settings` - BSK token global settings
- `system_settings` - Key-value system configuration

### Admin Edge Functions
- `grant-admin-by-email` - Grant admin to user by email
- `web3-admin-auth` - Web3 wallet admin authentication
- `admin-reset-balances` - Emergency balance reset
- `insurance-claim-process` - Process insurance claims
- `bsk-loan-disburse` - Approve and disburse loans

---

## 🎯 Quick Reference: Admin URLs

| Function | URL | Description |
|----------|-----|-------------|
| Dashboard | `/admin/dashboard` | Main admin overview |
| Users | `/admin/users` | User management |
| BSK Management | `/admin/bsk` | BSK settings & monitoring |
| Markets | `/admin/markets` | Trading pair management |
| Referrals | `/admin/referrals` | Referral system config |
| Lucky Draw | `/admin/lucky-draw` | Draw campaign management |
| Spin Wheel | `/admin/spin` | Spin configuration |
| Ads | `/admin/ads` | Ad campaign management |
| Insurance | `/admin/insurance-claims` | Claim processing |
| Loans | `/admin/bsk-loans` | Loan approvals |
| Funding | `/admin/funding` | Deposit/withdrawal operations |
| Settings | `/admin/settings` | System configuration |

---

## 📖 Related Documentation
- [Referral System Guide](./REFERRAL_SYSTEM_GUIDE.md)
- [BSK Token Documentation](./BSK_TOKEN_GUIDE.md)
- [Database Schema Reference](./DATABASE_SCHEMA.md)

---

**Last Updated**: January 2025  
**Admin Contact**: rosspathan@gmail.com
