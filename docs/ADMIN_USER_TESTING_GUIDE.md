# Admin-User Integration Testing Guide

## Overview
This guide helps you systematically test that admin settings properly control user functionality.

---

## 🎯 Testing Strategy

### Two-Browser Approach
1. **Admin Browser**: Keep logged in as admin at `/admin`
2. **User Browser**: Keep logged in as regular user at `/app`
3. Make changes in admin → Verify effects in user interface immediately

---

## 📋 Test Checklist

### 1. BSK Rate Configuration (`/admin/settings`)

**Admin Actions:**
- [ ] Change BSK to INR rate (e.g., from 1.00 to 2.00)
- [ ] Save the new rate

**User Verification:**
- [ ] Check BSK balance displays correct INR equivalent
- [ ] Verify any BSK purchase/conversion shows updated rate
- [ ] Confirm referral rewards calculate with new rate
- [ ] Check badge subscription pricing reflects new rate

**Test Scenarios:**
```
Rate: 1 BSK = ₹1.00 → 100 BSK = ₹100
Rate: 1 BSK = ₹2.50 → 100 BSK = ₹250
```

---

### 2. Crypto Deposit/Withdrawal Controls (`/admin/crypto-controls`)

**Admin Actions:**
- [ ] Toggle deposit ON/OFF for USDT
- [ ] Toggle withdrawal ON/OFF for USDT
- [ ] Set min withdraw amount (e.g., 10 USDT)
- [ ] Set max withdraw amount (e.g., 5000 USDT)
- [ ] Set withdraw fee (e.g., 2 USDT)

**User Verification:**
- [ ] Deposit button appears/disappears based on toggle
- [ ] Withdrawal button appears/disappears based on toggle
- [ ] Withdrawal form validates minimum amount
- [ ] Withdrawal form validates maximum amount
- [ ] Withdrawal preview shows correct fee deduction
- [ ] Error messages display when limits exceeded

**Test Matrix:**
| Setting | Expected User Behavior |
|---------|------------------------|
| Deposit OFF | Deposit option hidden/disabled |
| Withdraw OFF | Withdraw option hidden/disabled |
| Min = 10 | Cannot withdraw < 10 |
| Max = 5000 | Cannot withdraw > 5000 |
| Fee = 2 | 100 USDT withdrawal = 98 received |

---

### 3. FX Rates Management (`/admin/fx-rates`)

**Admin Actions:**
- [ ] Add/update USD to INR rate
- [ ] Add/update BTC to USD rate
- [ ] Refresh rates from API

**User Verification:**
- [ ] Fiat deposit amounts calculate correctly
- [ ] Multi-currency balances show accurate conversions
- [ ] Trading pairs use correct exchange rates
- [ ] Portfolio value reflects updated FX rates

---

### 4. INR Deposits (`/admin/inr-deposits`)

**Admin Actions:**
- [ ] Approve a pending deposit
- [ ] Reject a pending deposit with notes
- [ ] Add admin notes to deposit request

**User Verification:**
- [ ] Check deposit status updates in real-time
- [ ] Verify balance credited on approval
- [ ] Confirm rejection notification received
- [ ] View admin notes in transaction history

**Workflow Test:**
```
1. User submits ₹1000 deposit request
2. Admin sees request in pending list
3. Admin approves → User balance increases by ₹1000
4. User sees "Approved" status in history
```

---

### 5. INR Withdrawals (`/admin/inr-withdrawals`)

**Admin Actions:**
- [ ] Review withdrawal request details
- [ ] Approve withdrawal with reference ID
- [ ] Reject withdrawal with reason
- [ ] Add proof of payment URL

**User Verification:**
- [ ] Withdrawal request appears in pending state
- [ ] Balance locked during pending period
- [ ] Approved withdrawal shows reference ID
- [ ] Rejected withdrawal refunds balance
- [ ] View payment proof if provided

---

### 6. BSK Balance Adjustments (`/admin/bsk-balances`)

**Admin Actions:**
- [ ] Search user by email
- [ ] Add BSK to withdrawable balance
- [ ] Subtract BSK from withdrawable balance
- [ ] Add BSK to holding balance
- [ ] Add adjustment note

**User Verification:**
- [ ] Balance updates reflect immediately
- [ ] Transaction appears in BSK history
- [ ] Admin note visible in transaction details
- [ ] Withdrawable vs holding balance correct

**Test Scenarios:**
```
Adjustment: +100 BSK (withdrawable)
→ User can withdraw that BSK

Adjustment: +100 BSK (holding)
→ User cannot withdraw, sees in holding
```

---

### 7. Ad Campaign Management (`/admin/ads`)

**Admin Actions:**
- [ ] Create new ad campaign
- [ ] Set BSK reward amount
- [ ] Set required view time
- [ ] Toggle campaign active/inactive
- [ ] Set start/end dates
- [ ] Set max impressions per user per day

**User Verification:**
- [ ] Active ads appear in ad mining section
- [ ] Inactive ads don't appear
- [ ] View time timer works correctly
- [ ] BSK reward credited after completion
- [ ] Daily impression limit enforced
- [ ] Ads outside date range don't show

**Flow Test:**
```
1. Admin creates ad with 5 BSK reward, 30s view
2. User sees ad in /app/ad-mining
3. User watches for 30s
4. User earns 5 BSK
5. Admin deactivates ad
6. Ad disappears from user interface
```

---

### 8. Manual Purchase Settings (`/admin/manual-purchases`)

**Admin Actions:**
- [ ] Set admin BEP20 address
- [ ] Set min purchase amount
- [ ] Set max purchase amount
- [ ] Set fee percentage
- [ ] Set fixed fee

**User Verification:**
- [ ] Purchase form shows admin address
- [ ] Cannot submit below minimum
- [ ] Cannot submit above maximum
- [ ] Fee calculation preview correct
- [ ] Final BSK amount includes fees

**Fee Calculation Test:**
```
Settings: 2% + 5 INR fixed fee
Purchase: ₹1000
Fee: (1000 × 0.02) + 5 = 25 INR
Net: 975 INR → BSK conversion
```

---

### 9. User Account Management (`/admin/users`)

**Admin Actions:**
- [ ] Change KYC status to approved
- [ ] Lock/unlock withdrawal
- [ ] Change account status (active/suspended)
- [ ] Reset 2FA

**User Verification:**
- [ ] KYC approved → Access premium features
- [ ] Withdrawal locked → Cannot withdraw
- [ ] Account suspended → Login blocked
- [ ] 2FA reset → Can re-setup authenticator

---

### 10. Market Controls (`/admin/markets`)

**Admin Actions:**
- [ ] Enable/disable trading pair
- [ ] Set min order size
- [ ] Set max order size
- [ ] Set trading fee

**User Verification:**
- [ ] Disabled pairs hidden from trading interface
- [ ] Order validation respects min/max sizes
- [ ] Fee displays correctly in order preview
- [ ] Fee deducted from executed trades

---

## 🔄 Real-Time Testing Scenarios

### Scenario A: Live Rate Change Impact
```
1. Admin opens /admin/settings
2. User opens /app/wallet (shows 1000 BSK = ₹1000)
3. Admin changes rate to ₹2.00
4. Admin clicks Save
5. User refreshes → Should see 1000 BSK = ₹2000
```

### Scenario B: Emergency Withdrawal Disable
```
1. Security issue detected
2. Admin opens /admin/crypto-controls
3. Admin toggles USDT withdrawal OFF
4. User trying to withdraw sees "Withdrawals temporarily disabled"
5. Admin re-enables → User can withdraw again
```

### Scenario C: Deposit Approval Flow
```
1. User submits ₹5000 INR deposit at 10:00 AM
2. Admin receives notification
3. Admin verifies payment screenshot
4. Admin approves at 10:05 AM
5. User balance updates in < 5 seconds
6. User receives notification
```

---

## 🐛 Common Issues to Check

### Database Sync
- [ ] Changes save to database correctly
- [ ] User queries fetch latest data
- [ ] Real-time listeners update UI
- [ ] Cache invalidation works

### Permission Checks
- [ ] Admin-only functions blocked for users
- [ ] Users can only modify their own data
- [ ] RLS policies prevent unauthorized access

### Edge Cases
- [ ] Decimal precision handling
- [ ] Negative balance prevention
- [ ] Concurrent modification conflicts
- [ ] Network timeout handling

---

## 📊 Success Criteria

✅ **All Settings Work:**
- Every admin toggle/input affects user interface
- Changes apply immediately or within expected timeframe
- No orphaned states or stuck transactions

✅ **Security Maintained:**
- Users cannot bypass admin restrictions
- Settings changes logged for audit
- Sensitive operations require admin role

✅ **User Experience:**
- Clear error messages when restrictions apply
- Real-time feedback on status changes
- No confusing intermediate states

---

## 🚀 Quick Test Script

**5-Minute Smoke Test:**
1. Change BSK rate → Verify conversion
2. Toggle crypto withdrawal → Verify button
3. Approve deposit → Verify balance
4. Adjust user BSK → Verify total
5. Toggle ad status → Verify visibility

**Complete Test: 30-45 minutes**
- Run through all sections above
- Document any issues found
- Create bug reports with reproduction steps

---

## 📝 Test Log Template

```
Date: [Date]
Tester: [Name]
Admin User: [Email]
Test User: [Email]

Test Results:
[ ] BSK Rate Settings - Pass/Fail
[ ] Crypto Controls - Pass/Fail
[ ] FX Rates - Pass/Fail
[ ] INR Deposits - Pass/Fail
[ ] INR Withdrawals - Pass/Fail
[ ] BSK Adjustments - Pass/Fail
[ ] Ad Management - Pass/Fail
[ ] Manual Purchases - Pass/Fail
[ ] User Management - Pass/Fail
[ ] Market Controls - Pass/Fail

Issues Found:
1. [Description]
2. [Description]

Notes:
[Additional observations]
```

---

## 🔗 Related Documentation

- Admin Console Overview: `/admin`
- User Features: `/app`
- Database Schema: `supabase/migrations/`
- Testing Results: `docs/TESTING_RESULTS.md`