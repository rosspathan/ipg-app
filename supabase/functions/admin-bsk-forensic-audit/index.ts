import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const { data: roleData } = await supabase
      .from('user_roles').select('role')
      .eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const section = url.searchParams.get('section') || 'summary';
    const userId = url.searchParams.get('user_id');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('page_size') || '50');
    const search = url.searchParams.get('search') || '';
    const balanceFilter = url.searchParams.get('balance_filter') || 'all'; // all, positive, zero, negative
    const sourceFilter = url.searchParams.get('source_filter') || '';
    const sortBy = url.searchParams.get('sort_by') || 'balance_desc';

    if (section === 'summary') {
      // Global summary with all metrics
      const { data: summaryData, error: sumErr } = await supabase.rpc('exec_sql_readonly', {
        sql_query: `
          WITH balance_stats AS (
            SELECT 
              COUNT(*) as total_users,
              COUNT(CASE WHEN withdrawable_balance > 0 THEN 1 END) as holders_positive,
              COUNT(CASE WHEN withdrawable_balance = 0 THEN 1 END) as holders_zero,
              COUNT(CASE WHEN withdrawable_balance < 0 THEN 1 END) as holders_negative,
              ROUND(SUM(withdrawable_balance)::numeric, 4) as total_balance,
              ROUND(AVG(CASE WHEN withdrawable_balance > 0 THEN withdrawable_balance END)::numeric, 4) as avg_per_holder,
              ROUND(MAX(withdrawable_balance)::numeric, 4) as max_balance,
              ROUND(MIN(withdrawable_balance)::numeric, 4) as min_balance,
              ROUND(STDDEV(CASE WHEN withdrawable_balance > 0 THEN withdrawable_balance END)::numeric, 4) as stddev_balance
            FROM user_bsk_balances
          ),
          ledger_stats AS (
            SELECT 
              ROUND(SUM(CASE WHEN tx_type = 'credit' THEN amount_bsk ELSE 0 END)::numeric, 4) as total_credits,
              ROUND(SUM(CASE WHEN tx_type = 'debit' THEN amount_bsk ELSE 0 END)::numeric, 4) as total_debits,
              ROUND(SUM(CASE WHEN tx_type = 'credit' THEN amount_bsk ELSE -amount_bsk END)::numeric, 4) as net_outstanding,
              COUNT(CASE WHEN tx_type = 'credit' THEN 1 END) as credit_count,
              COUNT(CASE WHEN tx_type = 'debit' THEN 1 END) as debit_count
            FROM unified_bsk_ledger
            WHERE balance_type = 'withdrawable'
          ),
          concentration AS (
            SELECT 
              ROUND(SUM(CASE WHEN rn <= 1 THEN wb ELSE 0 END) / NULLIF(MAX(gt), 0) * 100, 2) as top_1_pct,
              ROUND(SUM(CASE WHEN rn <= 10 THEN wb ELSE 0 END) / NULLIF(MAX(gt), 0) * 100, 2) as top_10_pct,
              ROUND(SUM(CASE WHEN rn <= 50 THEN wb ELSE 0 END) / NULLIF(MAX(gt), 0) * 100, 2) as top_50_pct
            FROM (
              SELECT withdrawable_balance as wb,
                ROW_NUMBER() OVER (ORDER BY withdrawable_balance DESC) as rn,
                SUM(withdrawable_balance) OVER () as gt
              FROM user_bsk_balances WHERE withdrawable_balance > 0
            ) ranked
          ),
          mismatch_stats AS (
            SELECT 
              COUNT(*) as mismatched_users,
              ROUND(SUM(ABS(COALESCE(b.withdrawable_balance, 0) - COALESCE(l.ledger_net, 0)))::numeric, 4) as total_abs_mismatch
            FROM user_bsk_balances b
            FULL OUTER JOIN (
              SELECT user_id, SUM(CASE WHEN tx_type = 'credit' THEN amount_bsk ELSE -amount_bsk END) as ledger_net
              FROM unified_bsk_ledger WHERE balance_type = 'withdrawable' GROUP BY user_id
            ) l ON b.user_id = l.user_id
            WHERE ROUND((COALESCE(b.withdrawable_balance, 0) - COALESCE(l.ledger_net, 0))::numeric, 4) != 0
          )
          SELECT json_build_object(
            'balance', (SELECT row_to_json(balance_stats) FROM balance_stats),
            'ledger', (SELECT row_to_json(ledger_stats) FROM ledger_stats),
            'concentration', (SELECT row_to_json(concentration) FROM concentration),
            'mismatch', (SELECT row_to_json(mismatch_stats) FROM mismatch_stats)
          ) as result
        `
      });

      // If exec_sql_readonly doesn't exist, fall back to individual queries
      let summary;
      if (sumErr) {
        // Fallback: run individual queries
        const [balRes, ledRes, concRes, misRes] = await Promise.all([
          supabase.from('user_bsk_balances').select('withdrawable_balance'),
          fetchLedgerStats(supabase),
          fetchConcentration(supabase),
          fetchMismatchCount(supabase),
        ]);

        const balances = balRes.data || [];
        const positive = balances.filter(b => Number(b.withdrawable_balance) > 0);
        const zero = balances.filter(b => Number(b.withdrawable_balance) === 0);
        const negative = balances.filter(b => Number(b.withdrawable_balance) < 0);
        const total = balances.reduce((s, b) => s + Number(b.withdrawable_balance), 0);
        const posAmounts = positive.map(b => Number(b.withdrawable_balance));
        const avg = posAmounts.length > 0 ? posAmounts.reduce((a, b) => a + b, 0) / posAmounts.length : 0;
        const max = posAmounts.length > 0 ? Math.max(...posAmounts) : 0;
        const min = balances.length > 0 ? Math.min(...balances.map(b => Number(b.withdrawable_balance))) : 0;

        summary = {
          balance: {
            total_users: balances.length,
            holders_positive: positive.length,
            holders_zero: zero.length,
            holders_negative: negative.length,
            total_balance: round4(total),
            avg_per_holder: round4(avg),
            max_balance: round4(max),
            min_balance: round4(min),
          },
          ledger: ledRes,
          concentration: concRes,
          mismatch: misRes,
        };
      } else {
        summary = summaryData?.[0]?.result || summaryData;
      }

      return jsonResponse(summary);
    }

    if (section === 'source_breakdown') {
      const breakdown = await fetchSourceBreakdown(supabase);
      return jsonResponse(breakdown);
    }

    if (section === 'top_holders') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const holders = await fetchTopHolders(supabase, limit);
      return jsonResponse(holders);
    }

    if (section === 'users') {
      const users = await fetchUserBalances(supabase, page, pageSize, search, balanceFilter, sortBy);
      return jsonResponse(users);
    }

    if (section === 'mismatches') {
      const mismatches = await fetchMismatches(supabase, page, pageSize);
      return jsonResponse(mismatches);
    }

    if (section === 'user_detail' && userId) {
      const detail = await fetchUserDetail(supabase, userId);
      return jsonResponse(detail);
    }

    if (section === 'user_history' && userId) {
      const history = await fetchUserHistory(supabase, userId, page, pageSize, sourceFilter);
      return jsonResponse(history);
    }

    if (section === 'export') {
      const exportData = await fetchExportData(supabase, balanceFilter, search);
      return jsonResponse(exportData);
    }

    return jsonResponse({ error: 'Invalid section' }, 400);
  } catch (error) {
    console.error('[BSK Forensic Audit] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

function round4(n: number) { return Math.round(n * 10000) / 10000; }

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function fetchLedgerStats(supabase: any) {
  const allLedger: any[] = [];
  let from = 0;
  const batch = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('unified_bsk_ledger')
      .select('tx_type, amount_bsk')
      .eq('balance_type', 'withdrawable')
      .range(from, from + batch - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allLedger.push(...data);
    if (data.length < batch) break;
    from += batch;
  }

  let total_credits = 0, total_debits = 0, credit_count = 0, debit_count = 0;
  for (const row of allLedger) {
    const amt = Number(row.amount_bsk);
    if (row.tx_type === 'credit') { total_credits += amt; credit_count++; }
    else if (row.tx_type === 'debit') { total_debits += amt; debit_count++; }
  }

  return {
    total_credits: round4(total_credits),
    total_debits: round4(total_debits),
    net_outstanding: round4(total_credits - total_debits),
    credit_count,
    debit_count,
  };
}

async function fetchConcentration(supabase: any) {
  const { data } = await supabase
    .from('user_bsk_balances')
    .select('withdrawable_balance')
    .gt('withdrawable_balance', 0)
    .order('withdrawable_balance', { ascending: false });

  if (!data || data.length === 0) return { top_1_pct: 0, top_10_pct: 0, top_50_pct: 0 };

  const total = data.reduce((s: number, r: any) => s + Number(r.withdrawable_balance), 0);
  const top1 = data.slice(0, 1).reduce((s: number, r: any) => s + Number(r.withdrawable_balance), 0);
  const top10 = data.slice(0, 10).reduce((s: number, r: any) => s + Number(r.withdrawable_balance), 0);
  const top50 = data.slice(0, 50).reduce((s: number, r: any) => s + Number(r.withdrawable_balance), 0);

  return {
    top_1_pct: round4(top1 / total * 100),
    top_10_pct: round4(top10 / total * 100),
    top_50_pct: round4(top50 / total * 100),
  };
}

async function fetchMismatchCount(supabase: any) {
  // Fetch all balances
  const allBal: any[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from('user_bsk_balances')
      .select('user_id, withdrawable_balance').range(from, from + 999);
    if (!data || data.length === 0) break;
    allBal.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  // Fetch all ledger entries
  const ledgerMap = new Map<string, number>();
  from = 0;
  while (true) {
    const { data } = await supabase.from('unified_bsk_ledger')
      .select('user_id, tx_type, amount_bsk')
      .eq('balance_type', 'withdrawable').range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const r of data) {
      const prev = ledgerMap.get(r.user_id) || 0;
      ledgerMap.set(r.user_id, prev + (r.tx_type === 'credit' ? Number(r.amount_bsk) : -Number(r.amount_bsk)));
    }
    if (data.length < 1000) break;
    from += 1000;
  }

  let mismatched_users = 0;
  let total_abs_mismatch = 0;
  for (const b of allBal) {
    const ledgerNet = ledgerMap.get(b.user_id) || 0;
    const diff = round4(Number(b.withdrawable_balance) - ledgerNet);
    if (diff !== 0) {
      mismatched_users++;
      total_abs_mismatch += Math.abs(diff);
    }
  }
  // Check ledger-only users
  for (const [uid, net] of ledgerMap) {
    if (!allBal.find(b => b.user_id === uid)) {
      mismatched_users++;
      total_abs_mismatch += Math.abs(net);
    }
  }

  return { mismatched_users, total_abs_mismatch: round4(total_abs_mismatch) };
}

async function fetchSourceBreakdown(supabase: any) {
  const allLedger: any[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from('unified_bsk_ledger')
      .select('tx_type, tx_subtype, amount_bsk, user_id')
      .eq('balance_type', 'withdrawable').range(from, from + 999);
    if (!data || data.length === 0) break;
    allLedger.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const map = new Map<string, { credited: number; debited: number; users: Set<string>; count: number }>();
  for (const r of allLedger) {
    const key = `${r.tx_type}::${r.tx_subtype || 'none'}`;
    if (!map.has(key)) map.set(key, { credited: 0, debited: 0, users: new Set(), count: 0 });
    const entry = map.get(key)!;
    const amt = Number(r.amount_bsk);
    if (r.tx_type === 'credit') entry.credited += amt;
    else entry.debited += amt;
    entry.users.add(r.user_id);
    entry.count++;
  }

  const result = Array.from(map.entries()).map(([key, val]) => {
    const [txType, txSubtype] = key.split('::');
    return {
      tx_type: txType,
      tx_subtype: txSubtype === 'none' ? null : txSubtype,
      total_credited: round4(val.credited),
      total_debited: round4(val.debited),
      net: round4(val.credited - val.debited),
      affected_users: val.users.size,
      tx_count: val.count,
    };
  });

  result.sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  return result;
}

async function fetchTopHolders(supabase: any, limit: number) {
  const { data } = await supabase
    .from('user_bsk_balances')
    .select('user_id, withdrawable_balance, total_earned_withdrawable, created_at')
    .order('withdrawable_balance', { ascending: false })
    .limit(limit);

  if (!data) return [];

  const userIds = data.map((d: any) => d.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, username, full_name, email')
    .in('user_id', userIds);

  const profileMap = new Map<string, any>();
  for (const p of (profiles || [])) profileMap.set(p.user_id, p);

  const totalBSK = data.reduce((s: number, d: any) => s + Number(d.withdrawable_balance), 0);

  return data.map((d: any, i: number) => {
    const p = profileMap.get(d.user_id) || {};
    return {
      rank: i + 1,
      user_id: d.user_id,
      username: p.username || 'N/A',
      full_name: p.full_name || 'N/A',
      email: p.email || 'N/A',
      balance: Number(d.withdrawable_balance),
      total_earned: Number(d.total_earned_withdrawable || 0),
      pct_of_total: round4(Number(d.withdrawable_balance) / totalBSK * 100),
      created_at: d.created_at,
    };
  });
}

async function fetchUserBalances(supabase: any, page: number, pageSize: number, search: string, balanceFilter: string, sortBy: string) {
  let query = supabase.from('user_bsk_balances')
    .select('user_id, withdrawable_balance, total_earned_withdrawable, created_at', { count: 'exact' });

  if (balanceFilter === 'positive') query = query.gt('withdrawable_balance', 0);
  else if (balanceFilter === 'zero') query = query.eq('withdrawable_balance', 0);
  else if (balanceFilter === 'negative') query = query.lt('withdrawable_balance', 0);

  if (sortBy === 'balance_desc') query = query.order('withdrawable_balance', { ascending: false });
  else if (sortBy === 'balance_asc') query = query.order('withdrawable_balance', { ascending: true });
  else query = query.order('created_at', { ascending: false });

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  // Enrich with profiles
  const userIds = (data || []).map((d: any) => d.user_id);
  let profiles: any[] = [];
  if (userIds.length > 0) {
    const { data: pData } = await supabase.from('profiles')
      .select('user_id, username, full_name, email')
      .in('user_id', userIds);
    profiles = pData || [];
  }

  // If search, filter by profile fields
  const profileMap = new Map<string, any>();
  for (const p of profiles) profileMap.set(p.user_id, p);

  const enriched = (data || []).map((d: any) => {
    const p = profileMap.get(d.user_id) || {};
    return {
      user_id: d.user_id,
      username: p.username || 'N/A',
      full_name: p.full_name || 'N/A',
      email: p.email || 'N/A',
      balance: Number(d.withdrawable_balance),
      total_earned: Number(d.total_earned_withdrawable || 0),
      created_at: d.created_at,
    };
  });

  let filtered = enriched;
  if (search) {
    const s = search.toLowerCase();
    filtered = enriched.filter((u: any) =>
      u.username?.toLowerCase().includes(s) ||
      u.full_name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.user_id?.toLowerCase().includes(s)
    );
  }

  return { users: filtered, total: count || 0, page, pageSize };
}

async function fetchMismatches(supabase: any, page: number, pageSize: number) {
  // Fetch all balances
  const allBal: any[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from('user_bsk_balances')
      .select('user_id, withdrawable_balance').range(from, from + 999);
    if (!data || data.length === 0) break;
    allBal.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  // Fetch all ledger
  const ledgerMap = new Map<string, number>();
  from = 0;
  while (true) {
    const { data } = await supabase.from('unified_bsk_ledger')
      .select('user_id, tx_type, amount_bsk')
      .eq('balance_type', 'withdrawable').range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const r of data) {
      const prev = ledgerMap.get(r.user_id) || 0;
      ledgerMap.set(r.user_id, prev + (r.tx_type === 'credit' ? Number(r.amount_bsk) : -Number(r.amount_bsk)));
    }
    if (data.length < 1000) break;
    from += 1000;
  }

  const mismatches: any[] = [];
  const balMap = new Map<string, number>();
  for (const b of allBal) {
    balMap.set(b.user_id, Number(b.withdrawable_balance));
    const ledgerNet = ledgerMap.get(b.user_id) || 0;
    const diff = round4(Number(b.withdrawable_balance) - ledgerNet);
    if (diff !== 0) {
      mismatches.push({
        user_id: b.user_id,
        current_balance: Number(b.withdrawable_balance),
        ledger_net: round4(ledgerNet),
        mismatch: diff,
      });
    }
  }
  // Ledger-only users
  for (const [uid, net] of ledgerMap) {
    if (!balMap.has(uid)) {
      mismatches.push({
        user_id: uid,
        current_balance: 0,
        ledger_net: round4(net),
        mismatch: round4(-net),
      });
    }
  }

  mismatches.sort((a, b) => Math.abs(b.mismatch) - Math.abs(a.mismatch));

  // Enrich with profiles
  const pageItems = mismatches.slice((page - 1) * pageSize, page * pageSize);
  const userIds = pageItems.map(m => m.user_id);
  let profiles: any[] = [];
  if (userIds.length > 0) {
    const { data } = await supabase.from('profiles')
      .select('user_id, username, email')
      .in('user_id', userIds);
    profiles = data || [];
  }
  const pMap = new Map<string, any>();
  for (const p of profiles) pMap.set(p.user_id, p);

  return {
    mismatches: pageItems.map(m => ({
      ...m,
      username: pMap.get(m.user_id)?.username || 'N/A',
      email: pMap.get(m.user_id)?.email || 'N/A',
    })),
    total: mismatches.length,
    page,
    pageSize,
  };
}

async function fetchUserDetail(supabase: any, userId: string) {
  const [balRes, profileRes] = await Promise.all([
    supabase.from('user_bsk_balances').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('user_id, username, full_name, email, created_at, referrer_id').eq('user_id', userId).maybeSingle(),
  ]);

  // Source breakdown for this user
  const allLedger: any[] = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from('unified_bsk_ledger')
      .select('tx_type, tx_subtype, amount_bsk, created_at')
      .eq('user_id', userId).eq('balance_type', 'withdrawable')
      .order('created_at', { ascending: true })
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    allLedger.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  let totalCredited = 0, totalDebited = 0, creditCount = 0, debitCount = 0;
  const sourceMap = new Map<string, { credited: number; debited: number; count: number }>();
  let firstActivity: string | null = null;
  let lastActivity: string | null = null;

  for (const r of allLedger) {
    const amt = Number(r.amount_bsk);
    const key = r.tx_subtype || r.tx_type;
    if (!sourceMap.has(key)) sourceMap.set(key, { credited: 0, debited: 0, count: 0 });
    const entry = sourceMap.get(key)!;

    if (r.tx_type === 'credit') { totalCredited += amt; creditCount++; entry.credited += amt; }
    else { totalDebited += amt; debitCount++; entry.debited += amt; }
    entry.count++;

    if (!firstActivity || r.created_at < firstActivity) firstActivity = r.created_at;
    if (!lastActivity || r.created_at > lastActivity) lastActivity = r.created_at;
  }

  const ledgerNet = round4(totalCredited - totalDebited);
  const currentBalance = Number(balRes.data?.withdrawable_balance || 0);

  // Check for admin adjustments
  const { data: adminAdj } = await supabase.from('admin_balance_adjustments')
    .select('*').eq('target_user_id', userId).order('created_at', { ascending: false }).limit(20);

  return {
    profile: profileRes.data,
    balance: {
      current: currentBalance,
      total_credited: round4(totalCredited),
      total_debited: round4(totalDebited),
      ledger_net: ledgerNet,
      mismatch: round4(currentBalance - ledgerNet),
      credit_count: creditCount,
      debit_count: debitCount,
      first_activity: firstActivity,
      last_activity: lastActivity,
    },
    source_breakdown: Array.from(sourceMap.entries()).map(([key, val]) => ({
      source: key,
      credited: round4(val.credited),
      debited: round4(val.debited),
      net: round4(val.credited - val.debited),
      count: val.count,
    })).sort((a, b) => Math.abs(b.net) - Math.abs(a.net)),
    admin_adjustments: adminAdj || [],
    has_suspicious_markers: round4(currentBalance - ledgerNet) !== 0 || (adminAdj && adminAdj.length > 0),
  };
}

async function fetchUserHistory(supabase: any, userId: string, page: number, pageSize: number, sourceFilter: string) {
  let query = supabase.from('unified_bsk_ledger')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('balance_type', 'withdrawable');

  if (sourceFilter) {
    query = query.eq('tx_subtype', sourceFilter);
  }

  query = query.order('created_at', { ascending: false });
  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return { transactions: data || [], total: count || 0, page, pageSize };
}

async function fetchExportData(supabase: any, balanceFilter: string, search: string) {
  const allBal: any[] = [];
  let from = 0;
  while (true) {
    let query = supabase.from('user_bsk_balances')
      .select('user_id, withdrawable_balance, total_earned_withdrawable, created_at');
    if (balanceFilter === 'positive') query = query.gt('withdrawable_balance', 0);
    else if (balanceFilter === 'zero') query = query.eq('withdrawable_balance', 0);
    else if (balanceFilter === 'negative') query = query.lt('withdrawable_balance', 0);
    query = query.order('withdrawable_balance', { ascending: false }).range(from, from + 999);
    const { data } = await query;
    if (!data || data.length === 0) break;
    allBal.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }

  // Get all profiles
  const userIds = allBal.map(b => b.user_id);
  const profileMap = new Map<string, any>();
  for (let i = 0; i < userIds.length; i += 100) {
    const batch = userIds.slice(i, i + 100);
    const { data } = await supabase.from('profiles')
      .select('user_id, username, full_name, email')
      .in('user_id', batch);
    for (const p of (data || [])) profileMap.set(p.user_id, p);
  }

  return allBal.map(b => {
    const p = profileMap.get(b.user_id) || {};
    return {
      user_id: b.user_id,
      username: p.username || '',
      full_name: p.full_name || '',
      email: p.email || '',
      balance: Number(b.withdrawable_balance),
      total_earned: Number(b.total_earned_withdrawable || 0),
      created_at: b.created_at,
    };
  });
}
