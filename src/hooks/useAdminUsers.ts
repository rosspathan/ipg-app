import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminUser {
  user_id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  kyc_status: string | null;
  account_status: string | null;
  created_at: string;
}

interface UseAdminUsersFilters {
  search?: string;
  status?: string;
  kycStatus?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

export function useAdminUsers(filters: UseAdminUsersFilters = {}) {
  const { search, status, kycStatus, dateFrom, dateTo, page = 1, limit = 50 } = filters;

  return useQuery({
    queryKey: ['admin-users', filters],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          user_id,
          email,
          username,
          display_name,
          kyc_status,
          account_status,
          created_at
        `, { count: 'exact' })
        .order('created_at', { ascending: false });
      
      // Apply search filter
      if (search) {
        query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%,display_name.ilike.%${search}%`);
      }

      // Apply status filter
      if (status) {
        query = query.eq('account_status', status);
      }

      // Apply KYC status filter
      if (kycStatus) {
        query = query.eq('kyc_status', kycStatus);
      }

      // Apply date filters
      if (dateFrom) {
        query = query.gte('created_at', dateFrom.toISOString());
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo.toISOString());
      }
      
      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      return { 
        users: data as AdminUser[], 
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      };
    }
  });
}
