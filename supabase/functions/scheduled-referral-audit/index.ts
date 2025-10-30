import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditIssue {
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  user_id?: string;
  message: string;
  details: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting scheduled referral audit...');

    const issues: AuditIssue[] = [];
    let autoFixedCount = 0;

    // =====================================================
    // CHECK 1: Users with sponsor but no referral tree
    // =====================================================
    const { data: missingTrees } = await supabase
      .from('referral_links_new')
      .select(`
        user_id,
        sponsor_id,
        locked_at,
        users:auth.users!referral_links_new_user_id_fkey(email)
      `)
      .not('sponsor_id', 'is', null)
      .not('locked_at', 'is', null);

    if (missingTrees) {
      for (const link of missingTrees) {
        const { count } = await supabase
          .from('referral_tree')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', link.user_id);

        if (count === 0) {
          issues.push({
            type: 'missing_referral_tree',
            severity: 'critical',
            user_id: link.user_id,
            message: `User has locked sponsor but no referral tree`,
            details: {
              email: link.users?.email,
              sponsor_id: link.sponsor_id,
              locked_at: link.locked_at
            }
          });

          // Auto-fix: Rebuild tree
          try {
            await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/build-referral-tree`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({ user_id: link.user_id })
              }
            );
            autoFixedCount++;
            console.log(`Auto-fixed missing tree for ${link.user_id}`);
          } catch (error) {
            console.error(`Failed to auto-fix tree for ${link.user_id}:`, error);
          }
        }
      }
    }

    // =====================================================
    // CHECK 2: Missing Level 1 entries
    // =====================================================
    const { data: allLinks } = await supabase
      .from('referral_links_new')
      .select('user_id, sponsor_id')
      .not('sponsor_id', 'is', null)
      .not('locked_at', 'is', null);

    if (allLinks) {
      for (const link of allLinks) {
        const { data: level1 } = await supabase
          .from('referral_tree')
          .select('*')
          .eq('user_id', link.user_id)
          .eq('level', 1)
          .maybeSingle();

        if (!level1) {
          issues.push({
            type: 'missing_level_1',
            severity: 'error',
            user_id: link.user_id,
            message: 'User missing Level 1 entry in referral_tree',
            details: { sponsor_id: link.sponsor_id }
          });
        } else if (level1.ancestor_id !== link.sponsor_id) {
          issues.push({
            type: 'level_1_mismatch',
            severity: 'error',
            user_id: link.user_id,
            message: 'Level 1 ancestor_id does not match sponsor_id',
            details: {
              expected: link.sponsor_id,
              actual: level1.ancestor_id
            }
          });
        }
      }
    }

    // =====================================================
    // CHECK 3: direct_sponsor_id consistency
    // =====================================================
    const { data: inconsistentSponsors } = await supabase
      .from('referral_tree')
      .select('user_id, level, ancestor_id, direct_sponsor_id')
      .eq('level', 1)
      .neq('ancestor_id', supabase.rpc('direct_sponsor_id'));

    if (inconsistentSponsors && inconsistentSponsors.length > 0) {
      for (const record of inconsistentSponsors) {
        issues.push({
          type: 'direct_sponsor_mismatch',
          severity: 'warning',
          user_id: record.user_id,
          message: 'Level 1 ancestor_id != direct_sponsor_id',
          details: {
            ancestor_id: record.ancestor_id,
            direct_sponsor_id: record.direct_sponsor_id
          }
        });
      }
    }

    // =====================================================
    // CHECK 4: Orphaned referral tree entries
    // =====================================================
    const { data: orphanedTrees } = await supabase.rpc('find_orphaned_tree_entries');

    if (orphanedTrees && orphanedTrees.length > 0) {
      issues.push({
        type: 'orphaned_tree_entries',
        severity: 'warning',
        message: `Found ${orphanedTrees.length} orphaned tree entries`,
        details: { count: orphanedTrees.length }
      });
    }

    // =====================================================
    // CHECK 5: Balance consistency
    // =====================================================
    const { data: invalidBalances } = await supabase
      .from('user_bsk_balances')
      .select('user_id, holding_balance, total_earned_holding, withdrawable_balance, total_earned_withdrawable')
      .or('holding_balance.gt.total_earned_holding,withdrawable_balance.gt.total_earned_withdrawable');

    if (invalidBalances && invalidBalances.length > 0) {
      for (const balance of invalidBalances) {
        issues.push({
          type: 'invalid_balance',
          severity: 'critical',
          user_id: balance.user_id,
          message: 'Current balance exceeds total earned',
          details: balance
        });
      }
    }

    // =====================================================
    // LOG CRITICAL ISSUES TO system_errors
    // =====================================================
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    
    if (criticalIssues.length > 0) {
      for (const issue of criticalIssues) {
        await supabase.rpc('log_system_error', {
          p_error_type: issue.type,
          p_error_message: issue.message,
          p_error_details: issue.details,
          p_user_id: issue.user_id || null,
          p_severity: issue.severity,
          p_source_function: 'scheduled-referral-audit'
        });
      }
    }

    // =====================================================
    // SUMMARY
    // =====================================================
    const summary = {
      audit_timestamp: new Date().toISOString(),
      total_issues: issues.length,
      auto_fixed: autoFixedCount,
      issues_by_severity: {
        critical: issues.filter(i => i.severity === 'critical').length,
        error: issues.filter(i => i.severity === 'error').length,
        warning: issues.filter(i => i.severity === 'warning').length,
        info: issues.filter(i => i.severity === 'info').length,
      },
      issues: issues.slice(0, 50) // Return first 50 for response
    };

    console.log('Audit complete:', summary);

    // If there are critical issues, notify admin
    if (criticalIssues.length > 0) {
      console.error(`🚨 CRITICAL: Found ${criticalIssues.length} critical issues in referral system`);
    }

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in scheduled audit:', error);
    
    // Log the audit failure itself
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabase.rpc('log_system_error', {
        p_error_type: 'audit_failure',
        p_error_message: 'Scheduled referral audit failed',
        p_error_details: { error: error.message },
        p_severity: 'critical',
        p_source_function: 'scheduled-referral-audit',
        p_stack_trace: error.stack
      });
    } catch (logError) {
      console.error('Failed to log audit error:', logError);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
