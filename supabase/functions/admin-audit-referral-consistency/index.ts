import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuditRequest {
  repair?: boolean;
  sponsor_id?: string;
}

interface SponsorStats {
  sponsor_id: string;
  expected_directs: number;
  actual_directs: number;
  diff: number;
  sponsor_email?: string;
}

interface Inconsistency {
  user_id: string;
  issue: string;
  expected_sponsor?: string;
  actual_sponsor?: string;
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

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!roles?.some(r => r.role === 'admin')) {
      throw new Error('Admin access required');
    }

    const { repair = false, sponsor_id } = await req.json() as AuditRequest;

    console.log(`Starting consistency audit: repair=${repair}, sponsor_id=${sponsor_id || 'all'}`);

    // Get all users with sponsors
    let linksQuery = supabase
      .from('referral_links_new')
      .select('user_id, sponsor_id')
      .not('sponsor_id', 'is', null);

    if (sponsor_id) {
      linksQuery = linksQuery.eq('sponsor_id', sponsor_id);
    }

    const { data: allLinks, error: linksError } = await linksQuery;

    if (linksError) {
      throw new Error(`Failed to fetch links: ${linksError.message}`);
    }

    // Group by sponsor to get expected direct counts
    const expectedDirects = new Map<string, number>();
    const linksBySponsor = new Map<string, string[]>();

    for (const link of allLinks || []) {
      const count = expectedDirects.get(link.sponsor_id) || 0;
      expectedDirects.set(link.sponsor_id, count + 1);

      const users = linksBySponsor.get(link.sponsor_id) || [];
      users.push(link.user_id);
      linksBySponsor.set(link.sponsor_id, users);
    }

    // Get actual Level 1 counts from referral_tree
    let treeQuery = supabase
      .from('referral_tree')
      .select('ancestor_id, user_id, level, direct_sponsor_id')
      .eq('level', 1);

    if (sponsor_id) {
      treeQuery = treeQuery.eq('ancestor_id', sponsor_id);
    }

    const { data: level1Records, error: treeError } = await treeQuery;

    if (treeError) {
      throw new Error(`Failed to fetch tree: ${treeError.message}`);
    }

    const actualDirects = new Map<string, number>();
    const treeUsersBySponsor = new Map<string, string[]>();

    for (const record of level1Records || []) {
      const count = actualDirects.get(record.ancestor_id) || 0;
      actualDirects.set(record.ancestor_id, count + 1);

      const users = treeUsersBySponsor.get(record.ancestor_id) || [];
      users.push(record.user_id);
      treeUsersBySponsor.set(record.ancestor_id, users);
    }

    // Calculate differences
    const sponsorStats: SponsorStats[] = [];
    const allSponsors = new Set([...expectedDirects.keys(), ...actualDirects.keys()]);

    for (const sponsorId of allSponsors) {
      const expected = expectedDirects.get(sponsorId) || 0;
      const actual = actualDirects.get(sponsorId) || 0;
      const diff = expected - actual;

      if (diff !== 0) {
        sponsorStats.push({
          sponsor_id: sponsorId,
          expected_directs: expected,
          actual_directs: actual,
          diff
        });
      }
    }

    // Sort by largest diff
    sponsorStats.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    // Find specific inconsistencies
    const inconsistencies: Inconsistency[] = [];
    const usersToRepair = new Set<string>();

    // Check for missing Level 1 users
    for (const [sponsorId, expectedUsers] of linksBySponsor) {
      const actualUsers = new Set(treeUsersBySponsor.get(sponsorId) || []);
      
      for (const userId of expectedUsers) {
        if (!actualUsers.has(userId)) {
          inconsistencies.push({
            user_id: userId,
            issue: 'missing_level1',
            expected_sponsor: sponsorId
          });
          usersToRepair.add(userId);
        }
      }
    }

    // Check for misassigned direct_sponsor_id
    const { data: allTreeRecords } = await supabase
      .from('referral_tree')
      .select('user_id, direct_sponsor_id');

    const directSponsorMap = new Map<string, string>();
    for (const record of allTreeRecords || []) {
      if (!directSponsorMap.has(record.user_id)) {
        directSponsorMap.set(record.user_id, record.direct_sponsor_id);
      }
    }

    for (const link of allLinks || []) {
      const actualDirectSponsor = directSponsorMap.get(link.user_id);
      if (actualDirectSponsor && actualDirectSponsor !== link.sponsor_id) {
        inconsistencies.push({
          user_id: link.user_id,
          issue: 'misassigned_direct_sponsor',
          expected_sponsor: link.sponsor_id,
          actual_sponsor: actualDirectSponsor
        });
        usersToRepair.add(link.user_id);
      }
    }

    console.log(`Audit found ${sponsorStats.length} sponsors with discrepancies, ${inconsistencies.length} user inconsistencies`);

    // Repair mode: trigger rebuild for inconsistent users
    let repairResult = null;
    if (repair && usersToRepair.size > 0) {
      console.log(`Repairing ${usersToRepair.size} users...`);
      
      const repairUsers = Array.from(usersToRepair);
      
      // Call the v2 rebuild function for these users
      const rebuildResponse = await supabase.functions.invoke('admin-rebuild-referral-trees-v2', {
        body: {
          force: true,
          include_unlocked: true,
          users: repairUsers
        }
      });

      if (rebuildResponse.error) {
        console.error('Repair failed:', rebuildResponse.error);
      } else {
        repairResult = rebuildResponse.data;
        console.log('Repair completed:', repairResult);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sponsor_stats: sponsorStats.slice(0, 100), // Top 100
        total_sponsors_with_issues: sponsorStats.length,
        inconsistencies: inconsistencies.slice(0, 200), // Top 200
        total_inconsistencies: inconsistencies.length,
        users_needing_repair: usersToRepair.size,
        repair_result: repairResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in consistency audit:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
