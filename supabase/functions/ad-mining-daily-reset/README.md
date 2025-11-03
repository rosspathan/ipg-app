# Ad Mining Daily Reset Edge Function

## Overview
Automated daily reset function for the Ad Mining program that runs at midnight UTC via pg_cron.

## Features
- ✅ Reset daily ad view counters
- ✅ Clean up old records (7+ days)
- ✅ Expire subscriptions where `active_until < NOW()`
- ✅ Calculate missed earnings
- ✅ Log all actions to `admin_actions_log`
- ✅ Generate execution report

## Setup

### 1. Deploy Edge Function
The function is automatically deployed with other edge functions. Verify deployment:
```bash
# Check function logs
supabase functions logs ad-mining-daily-reset
```

### 2. Setup Cron Job
**IMPORTANT**: You must manually run the SQL setup in Supabase Dashboard.

1. Open Supabase Dashboard → SQL Editor
2. Copy contents from `setup-cron.sql`
3. Execute the SQL
4. Verify: Run `SELECT * FROM cron.job WHERE jobname = 'ad-mining-daily-reset';`

## Schedule
- **Default**: Midnight UTC (`0 0 * * *`)
- **IST Equivalent**: 5:30 AM IST
- **Frequency**: Once per day

## Testing

### Manual Trigger
```sql
-- In Supabase SQL Editor
SELECT net.http_post(
  url := 'https://ocblgldglqhlrmtnynmu.supabase.co/functions/v1/ad-mining-daily-reset',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer YOUR_ANON_KEY'
  ),
  body := jsonb_build_object('triggered_by', 'manual', 'timestamp', NOW())
);
```

### Check Results
```sql
-- View last reset action
SELECT * FROM admin_actions_log
WHERE action_type = 'daily_reset'
ORDER BY created_at DESC
LIMIT 1;

-- View expired subscriptions
SELECT * FROM ad_user_subscriptions
WHERE status = 'expired'
ORDER BY updated_at DESC
LIMIT 10;
```

## Response Format

### Success
```json
{
  "success": true,
  "reset_date": "2025-11-03",
  "statistics": {
    "daily_counters_reset": 1523,
    "old_records_deleted": 10345,
    "subscriptions_expired": 14,
    "users_affected_count": 14,
    "total_missed_earnings_bsk": 350.5,
    "errors": []
  },
  "execution_time_ms": 1250
}
```

### Partial Success (207)
```json
{
  "success": false,
  "reset_date": "2025-11-03",
  "statistics": {
    "daily_counters_reset": 1523,
    "old_records_deleted": 0,
    "subscriptions_expired": 0,
    "users_affected_count": 0,
    "total_missed_earnings_bsk": 0,
    "errors": ["Subscription expiration failed: ..."]
  },
  "execution_time_ms": 850
}
```

## Monitoring

### View Cron Job Status
```sql
SELECT * FROM cron.job WHERE jobname = 'ad-mining-daily-reset';
```

### View Recent Executions
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'ad-mining-daily-reset')
ORDER BY start_time DESC 
LIMIT 10;
```

### View Function Logs
```bash
supabase functions logs ad-mining-daily-reset --limit 100
```

## Alerts

**Setup alerts for:**
- ❌ Function fails to run for 48+ hours
- ⚠️ More than 100 subscriptions expired in one day
- ⚠️ Execution time > 30 seconds
- ⚠️ Errors array not empty in response

## Database Operations

### Tables Modified
1. **`user_daily_ad_views`** - DELETE old records, affects daily counters
2. **`ad_user_subscriptions`** - UPDATE status to 'expired' where applicable
3. **`admin_actions_log`** - INSERT reset action log

### Tables Read
1. **`ad_subscription_tiers`** - Read tier details for calculations

## Security

- ✅ No JWT verification required (`verify_jwt = false`)
- ✅ Uses SERVICE_ROLE_KEY for database operations
- ✅ CORS enabled for cron trigger
- ✅ Idempotent - safe to run multiple times
- ✅ Transactional where possible
- ✅ Graceful error handling (partial success support)

## Rollback

If issues occur:
1. **Disable cron**: `SELECT cron.unschedule('ad-mining-daily-reset');`
2. **Check logs**: View function logs and `admin_actions_log`
3. **Manual fix**: Update affected subscriptions manually if needed
4. **Re-enable**: Run setup-cron.sql again

## Configuration

Future enhancement - add to `ad_mining_settings`:
```json
{
  "daily_reset": {
    "enabled": true,
    "timezone": "Asia/Kolkata",
    "cleanup_days": 7,
    "notify_admins": true
  }
}
```

## Maintenance

- **Weekly**: Review cron execution logs
- **Monthly**: Analyze reset statistics trends
- **Quarterly**: Optimize cleanup retention period
- **As needed**: Update schedule or logic

## Support

For issues:
1. Check function logs: `supabase functions logs ad-mining-daily-reset`
2. Check cron execution: Query `cron.job_run_details`
3. Check admin logs: Query `admin_actions_log` table
4. Manual trigger for testing (see Testing section)
