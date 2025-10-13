import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useWeb3 } from '@/contexts/Web3Context';
import { useToast } from '@/hooks/use-toast';

export type KYCLevel = 'L0' | 'L1' | 'L2';
export type KYCStatus = 'none' | 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';

export interface KYCProfile {
  id: string;
  user_id: string;
  level: KYCLevel;
  data_json: Record<string, any>;
  status: KYCStatus;
  reviewer_id?: string;
  rejection_reason?: string;
  submitted_at?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface KYCDocument {
  id: string;
  user_id: string;
  level: KYCLevel;
  doc_type: string;
  storage_path: string;
  mime_type?: string;
  file_hash?: string;
  file_size_bytes?: number;
  created_at: string;
}

export interface KYCConfig {
  required_levels: string[];
  level_schemas: Record<string, any>;
  liveness_required: boolean;
  selfie_match_threshold: number;
  encrypt_at_rest: boolean;
  storage_bucket: string;
  manual_review_required: boolean;
}

export const useKYCNew = () => {
  const { user, loading: authLoading } = useAuthUser();
  const { wallet, isConnected } = useWeb3();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Record<KYCLevel, KYCProfile | null>>({
    L0: null,
    L1: null,
    L2: null
  });
  const [config, setConfig] = useState<KYCConfig | null>(null);
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Use Supabase user ID if available, otherwise use wallet address
  const getUserId = (): string | null => {
    if (user?.id) return user.id;
    if (wallet?.address) return wallet.address;
    return null;
  };

  const fetchKYC = async () => {
    // Wait for auth to complete before checking user
    if (authLoading) {
      return;
    }
    
    const userId = getUserId();
    if (!userId) {
      console.log('[KYC] No user ID available yet');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[KYC] Fetching KYC data for user:', userId.slice(0, 8) + '...');
      
      // Fetch config
      const { data: configData } = await supabase
        .from('kyc_admin_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (configData) {
        setConfig(configData as unknown as KYCConfig);
      }

      // Fetch all KYC profiles
      const { data: profilesData } = await supabase
        .from('kyc_profiles_new')
        .select('*')
        .eq('user_id', userId);

      if (profilesData) {
        const profilesMap: Record<KYCLevel, KYCProfile | null> = {
          L0: null,
          L1: null,
          L2: null
        };
        profilesData.forEach((p: any) => {
          profilesMap[p.level as KYCLevel] = p as KYCProfile;
        });
        setProfiles(profilesMap);
      }

      // Fetch documents
      const { data: docsData } = await supabase
        .from('kyc_documents_new')
        .select('*')
        .eq('user_id', userId);

      if (docsData) {
        setDocuments(docsData as KYCDocument[]);
      }
    } catch (error: any) {
      console.error('[KYC] Error fetching KYC:', error);
      
      // Don't show toast for auth-related errors (user not logged in yet)
      if (error?.code !== 'PGRST116' && error?.message?.indexOf('JWT') === -1) {
        toast({
          title: "Error",
          description: "Failed to load KYC data. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (
    file: File,
    level: KYCLevel,
    docType: string
  ): Promise<string> => {
    const userId = getUserId();
    if (!userId) {
      console.error('[KYC] Upload attempted without authentication');
      toast({
        title: "Authentication Required",
        description: "Please log in to upload documents",
        variant: "destructive",
      });
      throw new Error('User not authenticated. Please log in to continue.');
    }
    
    console.log('[KYC] Uploading document:', docType, 'for level:', level);

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${level}/${docType}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('kyc')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('kyc')
        .getPublicUrl(fileName);

      // Save document record
      const { error: docError } = await supabase
        .from('kyc_documents_new')
        .insert({
          user_id: userId,
          level,
          doc_type: docType,
          storage_path: fileName,
          mime_type: file.type,
          file_size_bytes: file.size
        });

      if (docError) throw docError;

      return data.publicUrl;
    } catch (error: any) {
      console.error('[KYC] Error uploading document:', error);
      const errorMsg = error?.message || 'Failed to upload document';
      toast({
        title: "Upload Failed",
        description: errorMsg.includes('authenticated') 
          ? "Please log in to upload documents" 
          : "Failed to upload document. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const updateKYCLevel = async (
    level: KYCLevel,
    data: Record<string, any>,
    status?: KYCStatus
  ): Promise<KYCProfile> => {
    const userId = getUserId();
    if (!userId) {
      console.error('[KYC] Update attempted without authentication');
      toast({
        title: "Authentication Required",
        description: "Please log in to update your KYC information",
        variant: "destructive",
      });
      throw new Error('User not authenticated. Please log in to continue.');
    }
    
    console.log('[KYC] Updating level:', level, 'status:', status);

    try {
      const existing = profiles[level];
      
      if (existing) {
        const { data: updated, error } = await supabase
          .from('kyc_profiles_new')
          .update({
            data_json: data,
            status: status || existing.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        
        setProfiles(prev => ({
          ...prev,
          [level]: updated as KYCProfile
        }));
        
        return updated as KYCProfile;
      } else {
        const { data: created, error } = await supabase
          .from('kyc_profiles_new')
          .insert({
            user_id: userId,
            level,
            data_json: data,
            status: status || 'draft'
          })
          .select()
          .single();

        if (error) throw error;
        
        setProfiles(prev => ({
          ...prev,
          [level]: created as KYCProfile
        }));
        
        return created as KYCProfile;
      }
    } catch (error: any) {
      console.error('[KYC] Error updating KYC level:', error);
      const errorMsg = error?.message || 'Failed to update KYC';
      toast({
        title: "Update Failed",
        description: errorMsg.includes('authenticated') 
          ? "Please log in to update your KYC" 
          : "Failed to save your information. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const submitKYCLevel = async (level: KYCLevel, profileId: string) => {
    const userId = getUserId();
    if (!userId) {
      console.error('[KYC] Submit attempted without authentication');
      toast({
        title: "Authentication Required",
        description: "Please log in to submit your KYC for review",
        variant: "destructive",
      });
      throw new Error('User not authenticated. Please log in to continue.');
    }
    
    console.log('[KYC] Submitting level:', level, 'profile:', profileId);

    try {
      const { data, error } = await supabase
        .from('kyc_profiles_new')
        .update({
          submitted_at: new Date().toISOString(),
          status: 'submitted'
        })
        .eq('id', profileId)
        .select()
        .single();

      if (error) throw error;

      setProfiles(prev => ({
        ...prev,
        [level]: data as KYCProfile
      }));

      await fetchKYC();
    } catch (error: any) {
      console.error('[KYC] Error submitting KYC:', error);
      const errorMsg = error?.message || 'Failed to submit KYC';
      toast({
        title: "Submission Failed",
        description: errorMsg.includes('authenticated') 
          ? "Please log in to submit your KYC" 
          : "Failed to submit your KYC for review. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchKYC();
    }
  }, [user, wallet, authLoading]);

  return {
    profiles,
    config,
    documents,
    loading,
    uploading,
    uploadDocument,
    updateKYCLevel,
    submitKYCLevel,
    refetch: fetchKYC
  };
};