import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'check';
    const isScheduledRun = body.scheduled_run === true;

    // For non-scheduled runs, verify admin auth
    if (!isScheduledRun) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: adminCheck } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!adminCheck) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    console.log(`[full-trading-reconciliation] Action: ${action}, Scheduled: ${isScheduledRun}`);

    // Get all wallet balances (excluding platform account)
    const { data: walletBalances, error: wbError } = await supabaseAdmin
      .from('wallet_balances')
      .select('user_id, asset_id, available, locked, assets!inner(symbol)')
      .neq('user_id', '00000000-0000-0000-0000-000000000001');

    if (wbError) throw wbError;

    // Get ledger sums per user per asset
    const { data: ledgerData, error: ledgerError } = await supabaseAdmin
      .from('trading_balance_ledger')
      .select('user_id, asset_symbol, delta_available, delta_locked')
      .neq('user_id', '00000000-0000-0000-0000-000000000001');

    if (ledgerError) throw ledgerError;

    // Aggregate ledger by user+asset
    const ledgerAgg: Record<string, { available: number; locked: number }> = {};
    for (const entry of (ledgerData || [])) {
      const key = `${entry.user_id}:${entry.asset_symbol}`;
      if (!ledgerAgg[key]) ledgerAgg[key] = { available: 0, locked: 0 };
      ledgerAgg[key].available += Number(entry.delta_available || 0);
      ledgerAgg[key].locked += Number(entry.delta_locked || 0);
    }

    // Compare
    const discrepancies: any[] = [];
    let totalChecked = 0;

    for (const wb of (walletBalances || [])) {
      const sym = (wb.assets as any)?.symbol;
      if (!sym) continue;
      totalChecked++;

      const key = `${wb.user_id}:${sym}`;
      const ledger = ledgerAgg[key] || { available: 0, locked: 0 };
      
      const walletAvailable = Number(wb.available || 0);
      const walletLocked = Number(wb.locked || 0);
      const walletTotal = walletAvailable + walletLocked;
      
      const ledgerNetAvailable = ledger.available;
      const ledgerNetLocked = ledger.locked;
      const ledgerTotal = ledgerNetAvailable + ledgerNetLocked;
      
      const drift = Math.abs(walletTotal - ledgerTotal);

      if (drift > 0.001) {
        discrepancies.push({
          user_id: wb.user_id,
          asset_symbol: sym,
          wallet_available: walletAvailable,
          wallet_locked: walletLocked,
          wallet_total: walletTotal,
          ledger_net_available: ledgerNetAvailable,
          ledger_net_locked: ledgerNetLocked,
          ledger_total: ledgerTotal,
          drift: walletTotal - ledgerTotal,
        });
      }
    }

    // Sort by absolute drift
    discrepancies.sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      total_checked: totalChecked,
      total_discrepancies: discrepancies.length,
      discrepancies: discrepancies.slice(0, 50),
      summary: {
        total_positive_drift: discrepancies.filter(d => d.drift > 0).reduce((s, d) => s + d.drift, 0),
        total_negative_drift: discrepancies.filter(d => d.drift < 0).reduce((s, d) => s + d.drift, 0),
      },
      auto_freeze_triggered: false,
    };

    // AUTO-FREEZE: If critical discrepancies found during scheduled run, freeze withdrawals
    const CRITICAL_DRIFT_THRESHOLD = 100; // >100 token drift = critical
    const criticalDiscrepancies = discrepancies.filter(d => Math.abs(d.drift) > CRITICAL_DRIFT_THRESHOLD);

    if ((action === 'alert' || isScheduledRun) && criticalDiscrepancies.length > 0) {
      console.warn(`[full-trading-reconciliation] CRITICAL: ${criticalDiscrepancies.length} critical discrepancies found!`);
      
      // Log to security audit
      await supabaseAdmin
        .from('security_audit_log')
        .insert({
          event_type: 'TRADING_RECONCILIATION_CRITICAL_MISMATCH',
          actor_id: '00000000-0000-0000-0000-000000000001',
          details: {
            total_discrepancies: discrepancies.length,
            critical_discrepancies: criticalDiscrepancies.length,
            top_discrepancies: criticalDiscrepancies.slice(0, 10),
            auto_freeze: true,
            scheduled_run: isScheduledRun,
          }
        });

      // Auto-freeze withdrawals by updating system settings
      const { error: freezeError } = await supabaseAdmin
        .from('system_settings')
        .update({ 
          value: 'false', 
          updated_at: new Date().toISOString() 
        })
        .eq('key', 'withdrawals_enabled');

      if (!freezeError) {
        result.auto_freeze_triggered = true;
        console.warn('[full-trading-reconciliation] AUTO-FREEZE: Withdrawals disabled due to critical drift');
        
        // Log the freeze action
        await supabaseAdmin
          .from('security_audit_log')
          .insert({
            event_type: 'WITHDRAWAL_AUTO_FREEZE',
            actor_id: '00000000-0000-0000-0000-000000000001',
            details: {
              reason: 'Critical balance drift detected by auto-reconciliation',
              critical_count: criticalDiscrepancies.length,
              max_drift: Math.max(...criticalDiscrepancies.map(d => Math.abs(d.drift))),
            }
          });
      }
    } else if ((action === 'alert' || isScheduledRun) && discrepancies.length > 0) {
      // Non-critical discrepancies - just log warning
      await supabaseAdmin
        .from('security_audit_log')
        .insert({
          event_type: 'TRADING_RECONCILIATION_MISMATCH',
          actor_id: '00000000-0000-0000-0000-000000000001',
          details: {
            total_discrepancies: discrepancies.length,
            top_discrepancies: discrepancies.slice(0, 10),
            scheduled_run: isScheduledRun,
          }
        });
    }

    console.log(`[full-trading-reconciliation] Checked: ${totalChecked}, Discrepancies: ${discrepancies.length}, Auto-freeze: ${result.auto_freeze_triggered}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[full-trading-reconciliation] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
