import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProgramAnalytics {
  moduleId: string;
  moduleName: string;
  totalViews: number;
  totalUsers: number;
  activeUsers: number;
  conversionRate: number;
  revenue: number;
  engagement: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ProgramEngagementData {
  date: string;
  views: number;
  users: number;
  conversions: number;
}

export function useProgramAnalytics() {
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['program-analytics'],
    queryFn: async () => {
      // Fetch program modules
      const { data: modules, error: modulesError } = await supabase
        .from('program_modules')
        .select('*')
        .eq('status', 'live');
      
      if (modulesError) throw modulesError;

      // Mock analytics data - in production, this would come from real analytics tables
      const analyticsData: ProgramAnalytics[] = modules?.map(module => ({
        moduleId: module.id,
        moduleName: module.name,
        totalViews: Math.floor(Math.random() * 10000) + 1000,
        totalUsers: Math.floor(Math.random() * 5000) + 500,
        activeUsers: Math.floor(Math.random() * 2000) + 200,
        conversionRate: Math.random() * 30 + 5,
        revenue: Math.floor(Math.random() * 100000) + 10000,
        engagement: Math.random() * 100,
        trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable'
      })) || [];

      return analyticsData;
    }
  });

  return {
    analytics,
    isLoading: analyticsLoading
  };
}

export function useProgramEngagement(moduleId?: string, days: number = 30) {
  const { data: engagement, isLoading } = useQuery({
    queryKey: ['program-engagement', moduleId, days],
    queryFn: async () => {
      // Mock time-series data - in production, fetch from analytics tables
      const data: ProgramEngagementData[] = [];
      const now = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        
        data.push({
          date: date.toISOString().split('T')[0],
          views: Math.floor(Math.random() * 500) + 100,
          users: Math.floor(Math.random() * 200) + 50,
          conversions: Math.floor(Math.random() * 50) + 10
        });
      }
      
      return data;
    },
    enabled: !!moduleId
  });

  return {
    engagement,
    isLoading
  };
}

export function useOverallProgramStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['overall-program-stats'],
    queryFn: async () => {
      const { data: modules, error } = await supabase
        .from('program_modules')
        .select('*');
      
      if (error) throw error;

      const liveCount = modules?.filter(m => m.status === 'live').length || 0;
      const totalCount = modules?.length || 0;

      // Mock aggregated data
      return {
        totalPrograms: totalCount,
        livePrograms: liveCount,
        totalViews: Math.floor(Math.random() * 100000) + 50000,
        totalUsers: Math.floor(Math.random() * 20000) + 10000,
        totalRevenue: Math.floor(Math.random() * 1000000) + 500000,
        avgEngagement: Math.random() * 100,
        growthRate: (Math.random() * 40 - 10).toFixed(1) // -10% to +30%
      };
    }
  });

  return {
    stats,
    isLoading
  };
}
