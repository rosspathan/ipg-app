import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';

const BATCH_SIZE = 200; // Safe batch size for URL length limits

export interface DownlineMember {
  level: number;
  user_id: string;
  username: string;
  display_name: string;
  email: string;
  current_badge: string | null;
  badge_date: string | null;
  join_date: string | null;
  total_generated: number;
  direct_sponsor_id: string | null;
  sponsor_username: string | null;
  package_cost: number | null;
}

export interface LevelStats {
  level: number;
  member_count: number;
  active_count: number;
  total_generated: number;
}

export interface DownlineTreeData {
  members: DownlineMember[];
  levelStats: LevelStats[];
  totalMembers: number;
  activeMembers: number;
  totalGenerated: number;
  deepestLevel: number;
}

export function useDownlineTree() {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ['downline-tree', user?.id],
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      // Note: Previously we short-circuited when there were no direct referrals with locked sponsors.
      // That hid valid downlines (e.g., when trees were built including unlocked or via admin tools).
      // We now always attempt to read from referral_tree for accurate visibility.

      // Fetch all descendants from referral_tree with pagination to handle large teams (1000+ members)
      // Supabase default limit is 1000, so we need to fetch in batches
      const TREE_PAGE_SIZE = 1000; // For referral_tree row pagination (different from BATCH_SIZE for .in() queries)
      let allTreeData: { level: number; user_id: string; direct_sponsor_id: string | null }[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: batchData, error: treeError } = await supabase
          .from('referral_tree')
          .select('level, user_id, direct_sponsor_id')
          .eq('ancestor_id', user.id)
          .order('level', { ascending: true })
          .range(offset, offset + TREE_PAGE_SIZE - 1);

        if (treeError) throw treeError;

        if (batchData && batchData.length > 0) {
          allTreeData = [...allTreeData, ...batchData];
          offset += TREE_PAGE_SIZE;
          hasMore = batchData.length === TREE_PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      const treeData = allTreeData;
      if (!treeData || treeData.length === 0) {
        return {
          members: [],
          levelStats: [],
          totalMembers: 0,
          activeMembers: 0,
          totalGenerated: 0,
          deepestLevel: 0,
        };
      }

      const userIds = treeData.map(t => t.user_id);

      // Fetch user profiles in batches (URL length limit ~8KB, ~200 UUIDs per batch)
      let profiles: { user_id: string; username: string; display_name: string; email: string }[] = [];
      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batchIds = userIds.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, email')
          .in('user_id', batchIds);
        if (error) throw error;
        if (data) profiles.push(...data);
      }

      // Fetch badge holdings using secure RPC function (bypasses RLS)
      const { data: badges, error: badgeError } = await supabase
        .rpc('get_downline_badges');

      if (badgeError) throw badgeError;
      
      console.log('📛 Badge data via RPC:', badges?.length || 0, 'badges', badges?.slice(0, 3));

      // Fetch referral links for join dates in batches
      let links: { user_id: string; locked_at: string | null }[] = [];
      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batchIds = userIds.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from('referral_links_new')
          .select('user_id, locked_at')
          .in('user_id', batchIds);
        if (error) throw error;
        if (data) links.push(...data);
      }

      // Fetch commissions generated for current user in batches
      let commissions: { payer_id: string; bsk_amount: number }[] = [];
      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batchIds = userIds.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from('referral_commissions')
          .select('payer_id, bsk_amount')
          .eq('earner_id', user.id)
          .in('payer_id', batchIds)
          .eq('status', 'settled');
        if (error) throw error;
        if (data) commissions.push(...data);
      }

      // Fetch sponsor usernames for display in batches
      const sponsorIds = [...new Set(treeData.map(t => t.direct_sponsor_id).filter(Boolean))] as string[];
      let sponsorProfiles: { user_id: string; username: string }[] = [];
      for (let i = 0; i < sponsorIds.length; i += BATCH_SIZE) {
        const batchIds = sponsorIds.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', batchIds);
        if (error) throw error;
        if (data) sponsorProfiles.push(...data);
      }

      // Create lookup maps
      const profileMap = new Map(profiles.map(p => [p.user_id, p]));
      const badgeMap = new Map(badges?.map(b => [b.user_id, b]) || []);
      const linkMap = new Map(links.map(l => [l.user_id, l]));
      const sponsorMap = new Map(sponsorProfiles.map(s => [s.user_id, s.username]));
      const commissionMap = new Map<string, number>();
      
      commissions.forEach(c => {
        commissionMap.set(c.payer_id, (commissionMap.get(c.payer_id) || 0) + c.bsk_amount);
      });

      // Build members array
      const members: DownlineMember[] = treeData.map(t => {
        const profile = profileMap.get(t.user_id);
        const badge = badgeMap.get(t.user_id);
        const link = linkMap.get(t.user_id);
        const sponsorUsername = t.direct_sponsor_id ? sponsorMap.get(t.direct_sponsor_id) : null;
        
        return {
          level: t.level,
          user_id: t.user_id,
          username: profile?.username || 'Unknown',
          display_name: profile?.display_name || 'Unknown User',
          email: profile?.email || '',
          current_badge: badge?.current_badge || null,
          badge_date: badge?.purchased_at || null,
          join_date: link?.locked_at || null,
          total_generated: commissionMap.get(t.user_id) || 0,
          direct_sponsor_id: t.direct_sponsor_id || null,
          sponsor_username: sponsorUsername || null,
          package_cost: badge?.price_bsk || null,
        };
      });

      // Calculate level statistics
      const levelMap = new Map<number, { count: number; active: number; generated: number }>();
      
      members.forEach(m => {
        if (!levelMap.has(m.level)) {
          levelMap.set(m.level, { count: 0, active: 0, generated: 0 });
        }
        const stats = levelMap.get(m.level)!;
        stats.count++;
        if (m.current_badge) stats.active++;
        stats.generated += m.total_generated;
      });

      const levelStats: LevelStats[] = Array.from(levelMap.entries())
        .map(([level, data]) => ({
          level,
          member_count: data.count,
          active_count: data.active,
          total_generated: data.generated,
        }))
        .sort((a, b) => a.level - b.level);

      // Calculate totals
      const totalMembers = members.length;
      const activeMembers = members.filter(m => m.current_badge).length;
      const totalGenerated = members.reduce((sum, m) => sum + m.total_generated, 0);
      const deepestLevel = Math.max(...members.map(m => m.level), 0);

      const result: DownlineTreeData = {
        members,
        levelStats,
        totalMembers,
        activeMembers,
        totalGenerated,
        deepestLevel,
      };

      return result;
    },
    enabled: !!user?.id,
  });
}
