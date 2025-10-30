import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';

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

      // Fetch all descendants from referral_tree
      const { data: treeData, error: treeError } = await supabase
        .from('referral_tree')
        .select('level, user_id, direct_sponsor_id')
        .eq('ancestor_id', user.id)
        .order('level', { ascending: true });

      if (treeError) throw treeError;
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

      // Fetch user profiles
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, email')
        .in('user_id', userIds);

      if (profileError) throw profileError;

      // Fetch badge holdings
      const { data: badges, error: badgeError } = await supabase
        .from('user_badge_holdings')
        .select('user_id, current_badge, purchased_at, price_bsk')
        .in('user_id', userIds);

      if (badgeError) throw badgeError;
      
      console.log('📛 Badge data fetched:', badges?.length || 0, 'badges');

      // Fetch referral links for join dates
      const { data: links, error: linkError } = await supabase
        .from('referral_links_new')
        .select('user_id, locked_at')
        .in('user_id', userIds);

      if (linkError) throw linkError;

      // Fetch commissions generated for current user
      const { data: commissions, error: commError } = await supabase
        .from('referral_commissions')
        .select('payer_id, bsk_amount')
        .eq('earner_id', user.id)
        .in('payer_id', userIds)
        .eq('status', 'settled');

      if (commError) throw commError;

      // Fetch sponsor usernames for display
      const sponsorIds = [...new Set(treeData.map(t => t.direct_sponsor_id).filter(Boolean))];
      const { data: sponsorProfiles } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', sponsorIds);

      // Create lookup maps
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const badgeMap = new Map(badges?.map(b => [b.user_id, b]) || []);
      const linkMap = new Map(links?.map(l => [l.user_id, l]) || []);
      const sponsorMap = new Map(sponsorProfiles?.map(s => [s.user_id, s.username]) || []);
      const commissionMap = new Map<string, number>();
      
      commissions?.forEach(c => {
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
