import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MobileLinkingSettings {
  id: string;
  host: string;
  ref_base_path: string;
  capture_stage: string;
  lock_policy: string;
  allow_sponsor_change_before_lock: boolean;
  self_referral_block: boolean;
  code_length: number;
  android_package_name_release?: string;
  sha256_fingerprints_release?: string[];
  android_package_name_debug?: string;
  sha256_fingerprints_debug?: string[];
  custom_scheme: string;
  play_store_fallback_url?: string;
  whatsapp_template: string;
}

export function useMobileLinking() {
  return useQuery({
    queryKey: ['mobile-linking-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mobile_linking_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as MobileLinkingSettings | null;
    },
    staleTime: 1000 * 60 * 5 // Cache for 5 minutes
  });
}
