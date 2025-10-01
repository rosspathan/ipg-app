# I-SMART Platform Deployment Guide

## 📋 Prerequisites

### Required Accounts
- [x] Lovable Account (for deployment)
- [x] Supabase Project (existing: ocblgldglqhlrmtnynmu)
- [x] Domain name (optional, for custom domain)

### Environment Setup
- Node.js 18+ (for local testing)
- Git (for version control)
- Supabase CLI (for edge function deployment)

## 🚀 Deployment Steps

### 1. Pre-Deployment Checklist

#### Database Verification
```bash
# Check all tables exist
- profiles
- user_roles
- referral_relationships
- bsk_bonus_campaigns
- lucky_draw_configs
- insurance_subscription_tiers
# ... (see QA_CHECKLIST_FINAL.md for full list)

# Verify RLS policies are enabled
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
  SELECT tablename FROM pg_policies
);
```

#### Edge Functions Check
All edge functions should be deployed:
- ✅ insurance-claim-process
- ✅ draw-commit, draw-reveal, draw-purchase
- ✅ bsk-daily-vesting
- ✅ admin-create-default
- ✅ web3-admin-auth
- ✅ grant-admin-by-email
- ✅ admin-password-reset
- ✅ send-verification-email
- ✅ bsk-loan-apply
- ✅ bsk-vesting-swap
- ✅ spin-verify

### 2. Frontend Deployment (Lovable)

#### Via Lovable UI
1. Click "Publish" button in Lovable editor
2. Select deployment environment (staging/production)
3. Wait for build to complete
4. Test deployment URL

#### Environment Variables
Ensure these are set in your Supabase project:
```
SUPABASE_URL=https://ocblgldglqhlrmtnynmu.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Edge Functions Deployment

Edge functions are automatically deployed when you push changes to Lovable. No manual deployment needed!

To verify deployment:
```bash
# Check edge function logs in Supabase Dashboard
https://supabase.com/dashboard/project/ocblgldglqhlrmtnynmu/functions
```

### 4. Database Migrations

All migrations are tracked in `supabase/migrations/`. They are automatically applied when:
- Using Lovable's migration tool
- Pushing to Supabase via CLI

To apply migrations manually:
```bash
supabase db push
```

### 5. Post-Deployment Verification

#### Smoke Tests
1. **User Auth Flow**
   - Register new user
   - Login with email/password
   - Connect Web3 wallet
   - Set PIN
   - Lock/unlock app

2. **Admin Auth Flow**
   - Login with admin Web3 wallet
   - Verify admin dashboard loads
   - Check sidebar navigation
   - Test breadcrumb navigation

3. **Program Functionality**
   - Test one program from each category:
     - Referrals: View tree
     - Ad Mining: Watch ad
     - Spin: Perform spin
     - Lucky Draw: Purchase ticket
     - Loans: View available loans
     - Insurance: View policies

4. **Admin Operations**
   - Create/edit user
   - Update market settings
   - Generate report
   - Change system setting

#### Performance Check
```bash
# Use Lighthouse in Chrome DevTools
- Performance Score: >90
- Accessibility Score: >90
- Best Practices Score: >90
- SEO Score: >90

# Check bundle size
- Initial load: <500KB gzipped
- Route-based code splitting working
```

#### Error Monitoring
- No console errors on page load
- No 404s in network tab
- All API calls returning 200/201
- Edge functions responding correctly

### 6. Custom Domain Setup (Optional)

#### In Lovable Dashboard
1. Go to Project Settings > Domains
2. Add your custom domain
3. Configure DNS records as shown

#### DNS Configuration
```
Type: CNAME
Name: www (or @)
Value: [provided by Lovable]
TTL: 3600
```

#### SSL Certificate
- Automatically provisioned by Lovable
- Wait 10-15 minutes for SSL to activate

## 🔒 Security Hardening

### Pre-Production Security Checklist

#### Database Security
- [ ] All tables have RLS enabled
- [ ] Policies prevent unauthorized data access
- [ ] Sensitive data is encrypted (PIN hashes)
- [ ] Admin-only tables restricted properly
- [ ] No SQL injection vulnerabilities

#### Authentication Security
- [ ] JWT tokens properly validated
- [ ] Session management secure
- [ ] Password requirements enforced
- [ ] 2FA available for sensitive operations
- [ ] Web3 signature verification secure

#### API Security
- [ ] CORS properly configured in edge functions
- [ ] Rate limiting enabled (Supabase default)
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info
- [ ] Admin endpoints require admin role check

#### Frontend Security
- [ ] No sensitive data in localStorage
- [ ] API keys not exposed in client code
- [ ] XSS protection via React's escaping
- [ ] HTTPS enforced in production
- [ ] Content Security Policy configured

### Security Audit Tools
```bash
# Run Supabase linter
# (Available via Lovable's migration tool)

# Check for exposed secrets
git secrets --scan

# Audit npm packages
npm audit

# Check for outdated dependencies
npm outdated
```

## 📊 Monitoring Setup

### Supabase Dashboard
Monitor the following:
- Auth: User signups, login attempts
- Database: Query performance, connection pool
- Edge Functions: Invocations, errors, latency
- Storage: Usage, bandwidth

### Key Metrics to Track
- Daily Active Users (DAU)
- API response times
- Error rates by endpoint
- Edge function success rate
- Database query performance
- Storage usage trends

### Alerting (Recommended)
Set up alerts for:
- Error rate > 5%
- API latency > 2s
- Failed login attempts > 100/hour
- Database CPU > 80%
- Storage > 80% capacity

## 🔄 Continuous Deployment

### Git Workflow
```bash
# Development branch
main -> staging deployment

# Production branch
production -> production deployment
```

### Deployment Pipeline
1. Code changes pushed to Lovable
2. Automatic build triggered
3. Tests run (if configured)
4. Edge functions deployed
5. Frontend deployed
6. Health checks performed

### Rollback Procedure
If issues detected:
1. Go to Lovable Dashboard
2. Click "Revert" to previous version
3. Or manually restore from git history
4. Re-deploy stable version

## 🐛 Troubleshooting

### Common Issues

#### "Cannot read property of undefined"
- Check if user is authenticated
- Verify data exists before rendering
- Add loading states

#### "Row violates RLS policy"
- Check if user_id is set correctly
- Verify RLS policies allow operation
- Ensure user has proper role

#### "Edge function timeout"
- Check function logs in Supabase
- Optimize long-running queries
- Add pagination for large datasets

#### "Sidebar not showing on mobile"
- Verify DockAdmin is rendered
- Check responsive breakpoints
- Test on actual device

### Debug Mode
Enable detailed logging:
```typescript
// In edge functions
console.log('Request:', JSON.stringify(req, null, 2));
console.log('Response:', JSON.stringify(data, null, 2));

// In React components
useEffect(() => {
  console.log('Component mounted', { props, state });
}, []);
```

### Support Resources
- Lovable Docs: https://docs.lovable.dev
- Supabase Docs: https://supabase.com/docs
- Discord Community: https://discord.com/channels/1119885301872070706
- GitHub Issues: [Your repo URL]

## 📈 Performance Optimization

### Frontend Optimizations
- [x] Code splitting by route (React.lazy)
- [x] Image lazy loading
- [x] Component memoization (React.memo)
- [x] Virtual scrolling for long lists
- [ ] Service Worker for offline support
- [ ] Cache API responses

### Database Optimizations
- [ ] Add indexes on frequently queried columns
- [ ] Use database functions for complex queries
- [ ] Implement pagination for large tables
- [ ] Cache frequently accessed data
- [ ] Use database connection pooling

### Edge Function Optimizations
- [ ] Minimize cold starts
- [ ] Cache responses where appropriate
- [ ] Batch database operations
- [ ] Use parallel processing
- [ ] Optimize dependency size

## 🎯 Success Criteria

### Launch Ready Checklist
- [ ] All QA tests passing
- [ ] No critical bugs
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Admin accounts created
- [ ] Monitoring configured
- [ ] Backup strategy defined
- [ ] Rollback plan documented
- [ ] Support team trained

### Post-Launch Monitoring (First 24 Hours)
- Monitor error rates every hour
- Check user registration flow
- Verify email delivery
- Monitor edge function performance
- Check database load
- Review user feedback
- Track key metrics (DAU, conversions)

## 📞 Emergency Contacts

### Critical Issues
- Lovable Support: support@lovable.dev
- Supabase Support: support@supabase.com
- On-Call Developer: [Your contact]

### Escalation Path
1. Check monitoring dashboards
2. Review error logs
3. Attempt rollback if needed
4. Contact platform support
5. Notify stakeholders

---

**Last Updated**: 2025-01-15
**Version**: 1.0.0
**Status**: Production Ready
