# Manual Testing Checklist - IPG Exchange

## 🎯 Testing Overview
This checklist covers manual testing for all programs and features before production launch.

---

## 📱 1. Spin Wheel Program

### Basic Functionality
- [ ] Spin wheel loads correctly with all segments visible
- [ ] Segments display correct BSK amounts
- [ ] Spin button is clickable and responsive
- [ ] Wheel spins smoothly with animation
- [ ] Winner segment is highlighted correctly
- [ ] Success toast shows correct prize amount

### Reward Distribution
- [ ] BSK balance increases after spin
- [ ] Correct amount is credited to `bsk_withdrawable_ledger`
- [ ] Transaction appears in activity feed
- [ ] Ledger entry has correct metadata (segment_id, prize_amount)

### Edge Cases
- [ ] Cannot spin while animation is in progress
- [ ] Handles network errors gracefully
- [ ] Works on slow connections
- [ ] Spin history loads correctly
- [ ] Handles missing segment data

### Mobile Testing
- [ ] Wheel renders correctly on mobile
- [ ] Touch interactions work smoothly
- [ ] Responsive design on small screens

---

## 🎰 2. Lucky Draw Program

### Ticket Purchase
- [ ] Draw template loads with correct details
- [ ] Ticket price displays correctly
- [ ] Prize pool shows accurate amounts
- [ ] Can enter ticket quantity
- [ ] Total cost calculates correctly
- [ ] "Buy Tickets" button works

### Balance Validation
- [ ] Cannot purchase with insufficient BSK
- [ ] Error message displays for insufficient balance
- [ ] Balance updates after successful purchase
- [ ] Transaction appears in ledger

### Ticket Management
- [ ] Purchased tickets display in "My Tickets"
- [ ] Ticket numbers are unique
- [ ] Can view ticket details
- [ ] Ticket count matches purchase

### Draw Execution (Admin)
- [ ] Admin can access draw control panel
- [ ] Can execute draw manually
- [ ] Winner selection is provably fair
- [ ] Winners display correctly
- [ ] Prizes are distributed accurately
- [ ] Draw status updates to "completed"

### Edge Cases
- [ ] Cannot purchase tickets for expired draws
- [ ] Handles concurrent purchases correctly
- [ ] Validates ticket quantity limits
- [ ] Handles draw execution failures

---

## 📺 3. Ad Mining Program

### Ad Display
- [ ] Ads load from storage bucket correctly
- [ ] Ad cards display advertiser info
- [ ] Reward amount shows clearly
- [ ] CTA button is visible

### Ad Viewing
- [ ] Can click "Watch Ad" button
- [ ] Ad plays in fullscreen/modal
- [ ] Can close ad after minimum duration
- [ ] "Claim Reward" button appears after ad

### Reward Claiming
- [ ] BSK balance increases after claim
- [ ] Correct amount credited to ledger
- [ ] Transaction recorded with ad_id
- [ ] Success message displays

### Limits & Cooldowns
- [ ] Daily ad limit enforced (10 ads)
- [ ] Ad cooldown enforced (5 minutes)
- [ ] Cannot claim same ad twice
- [ ] Limit resets at midnight

### Edge Cases
- [ ] Handles ad loading failures
- [ ] Validates ad completion time
- [ ] Prevents reward double-claiming
- [ ] Works with slow video loading

---

## 🤝 4. Referral Program

### Code Generation
- [ ] Referral code generates on signup
- [ ] Code is unique per user
- [ ] Code format is correct (6 chars)
- [ ] Code displays on referral page

### Link Sharing
- [ ] Referral link copies to clipboard
- [ ] Link includes correct referral code
- [ ] Share button works on mobile
- [ ] Link works when opened

### Registration Flow
- [ ] Signup form accepts referral code
- [ ] Code validates correctly
- [ ] Invalid code shows error
- [ ] Referral links to correct user

### Commission Tracking
- [ ] Referrer receives commission on referred user trades
- [ ] Commission rate is correct (5%)
- [ ] Commission credited to `bsk_holding_ledger`
- [ ] Commission appears in referral stats

### Statistics
- [ ] Total referrals count is accurate
- [ ] Active referrals count correct
- [ ] Commission earned displays correctly
- [ ] Referral list shows all referred users

---

## 💰 5. BSK Loan Program

### Loan Application
- [ ] Loan form loads correctly
- [ ] Can enter collateral amount
- [ ] Can enter loan amount
- [ ] Can select tenor (16 weeks)
- [ ] LTV calculation is accurate (50%)

### Validation
- [ ] Cannot exceed 50% LTV
- [ ] Error message for excessive loan amount
- [ ] Validates sufficient collateral balance
- [ ] Checks minimum loan amount

### Loan Approval
- [ ] Loan status starts as "pending"
- [ ] Admin can approve/reject loans
- [ ] Approved loans disburse BSK
- [ ] Collateral is locked correctly

### Repayment
- [ ] Repayment schedule displays correctly
- [ ] Weekly payments calculated accurately
- [ ] Can make payments manually
- [ ] Collateral released after full repayment

### Ledger Entries
- [ ] Loan disbursement recorded in `bsk_withdrawable_ledger`
- [ ] Collateral lock recorded in `bsk_holding_ledger`
- [ ] Repayments update ledgers correctly
- [ ] Interest is 0% (no interest charges)

---

## 🔐 6. Security Testing

### Authentication
- [ ] Cannot access protected routes without login
- [ ] Session expires after timeout
- [ ] Lock screen appears after idle time
- [ ] PIN verification works correctly
- [ ] Biometric authentication works (if supported)

### Authorization
- [ ] Regular users cannot access admin routes
- [ ] RLS policies enforce user isolation
- [ ] Cannot view other users' balances
- [ ] Cannot modify other users' data

### Balance Security
- [ ] Cannot spend more BSK than available
- [ ] Concurrent transactions handled atomically
- [ ] Balance locks prevent double-spending
- [ ] Negative balances are impossible

### Session Conflicts
- [ ] Detects wallet/session mismatches
- [ ] Auto-resolves conflicts when safe
- [ ] Shows modal for manual resolution
- [ ] Clears mismatched security data

---

## ⚡ 7. Performance Testing

### Load Times
- [ ] Home page loads within 3 seconds
- [ ] Spin wheel loads within 2 seconds
- [ ] Lucky draw loads within 2 seconds
- [ ] Ad mining loads within 2 seconds

### Database Performance
- [ ] Balance queries complete within 500ms
- [ ] Activity feed loads within 1 second
- [ ] Ledger queries are optimized
- [ ] No N+1 query issues

### UI Responsiveness
- [ ] Skeleton loaders appear immediately
- [ ] No layout shifts during loading
- [ ] Smooth animations (60fps)
- [ ] No janky scrolling

### Mobile Performance
- [ ] App works on 3G connection
- [ ] Images load progressively
- [ ] Offline mode shows appropriate messages
- [ ] Battery usage is reasonable

---

## 🧪 8. Edge Cases & Error Handling

### Network Issues
- [ ] Handles timeout errors gracefully
- [ ] Shows retry option on failure
- [ ] Queues actions for retry
- [ ] Offline indicator displays

### Invalid Data
- [ ] Validates all form inputs
- [ ] Handles missing data gracefully
- [ ] Shows helpful error messages
- [ ] Prevents XSS and injection attacks

### Race Conditions
- [ ] Prevents duplicate transactions
- [ ] Handles concurrent balance updates
- [ ] Order placement is atomic
- [ ] Prize distribution is idempotent

---

## ✅ Testing Sign-Off

### Tester Information
- **Name**: ___________________________
- **Date**: ___________________________
- **Environment**: Dev / Staging / Production

### Results Summary
- **Total Tests**: ______
- **Passed**: ______
- **Failed**: ______
- **Blocked**: ______

### Critical Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Recommendation
- [ ] Ready for production launch
- [ ] Requires bug fixes before launch
- [ ] Requires additional testing

### Sign-Off
- **Tested By**: ___________________________
- **Approved By**: ___________________________
- **Date**: ___________________________

---

## 🆘 Testing Support

**Found Issues?**
1. Note the exact steps to reproduce
2. Take screenshots/screen recordings
3. Check browser console for errors
4. Share in team chat or create bug ticket

**Questions?**
- Review SECURITY_AUDIT.md for security guidelines
- Check TESTING_LAUNCH_CHECKLIST.md for automated tests
- Reach out to development team
