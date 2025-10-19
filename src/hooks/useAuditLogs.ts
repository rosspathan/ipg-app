import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

interface UseAuditLogsFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export function useAuditLogs(filters: UseAuditLogsFilters = {}) {
  const { userId, action, resourceType, dateFrom, dateTo, search, page = 1, limit = 50 } = filters;

  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (action) {
        query = query.eq('action', action);
      }

      if (resourceType) {
        query = query.eq('resource_type', resourceType);
      }

      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }

      if (search) {
        query = query.or(`action.ilike.%${search}%,resource_type.ilike.%${search}%,resource_id.ilike.%${search}%`);
      }

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        logs: data as AuditLog[],
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      };
    }
  });
}
