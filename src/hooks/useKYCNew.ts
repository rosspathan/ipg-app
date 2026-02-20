import { useState, useEffect, useCallback } from 'react';
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

  const getUserId = (): string | null => {
    return user?.id ?? null;
  };

  const fetchKYC = useCallback(async () => {
    if (authLoading) return;
    
    const userId = getUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch config
      const { data: configData } = await supabase
        .from('kyc_admin_config')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (configData) {
        setConfig(configData as unknown as KYCConfig);
      }

      // Fetch all KYC profiles for this user
      const { data: profilesData, error: profilesError } = await supabase
        .from('kyc_profiles_new')
        .select('*')
        .eq('user_id', userId);

      if (profilesError) {
        console.error('[KYC] Error fetching profiles:', profilesError);
      }

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
  }, [user?.id, authLoading]);

  const uploadDocument = async (
    file: File,
    level: KYCLevel,
    docType: string
  ): Promise<string> => {
    const userId = getUserId();
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload documents",
        variant: "destructive",
      });
      throw new Error('User not authenticated');
    }

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const fileName = `${userId}/${level}/${docType}_${timestamp}.${fileExt}`;
      
      console.log('[KYC] Uploading:', fileName, 'Size:', (file.size / 1024).toFixed(1), 'KB');

      // Upload to storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('kyc')
        .upload(fileName, file, { 
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('[KYC] Storage upload error:', uploadError);
        throw uploadError;
      }

      // Generate a signed URL (valid for 1 hour) — bucket is private
      const { data: signedData, error: signedError } = await supabase.storage
        .from('kyc')
        .createSignedUrl(fileName, 3600);

      if (signedError || !signedData?.signedUrl) {
        console.error('[KYC] Failed to generate signed URL:', signedError);
        throw new Error('Failed to generate document URL');
      }

      // Store the storage path (not the URL) so we can re-sign on demand
      const publicUrl = signedData.signedUrl;
      console.log('[KYC] Upload success, signed URL generated for:', fileName);

      // Save document record (best effort - don't fail the upload if this fails)
      try {
        await supabase
          .from('kyc_documents_new')
          .insert({
            user_id: userId,
            level,
            doc_type: docType,
            storage_path: fileName,
            mime_type: file.type,
            file_size_bytes: file.size
          });
      } catch (docError) {
        console.warn('[KYC] Document record insert failed (non-critical):', docError);
      }

      return publicUrl;
    } catch (error: any) {
      console.error('[KYC] Upload failed:', error);
      const errorMsg = error?.message || 'Upload failed';
      
      if (errorMsg.includes('Payload too large') || errorMsg.includes('413')) {
        throw new Error('File is too large. Please compress it and try again.');
      } else if (errorMsg.includes('not allowed') || errorMsg.includes('policy')) {
        throw new Error('Upload permission denied. Please log in again.');
      }
      
      throw new Error('Upload failed. Please check your connection and try again.');
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
      toast({
        title: "Authentication Required",
        description: "Please sign in to update your KYC information",
        variant: "destructive",
      });
      throw new Error('User not authenticated');
    }

    try {
      const { data: upserted, error } = await supabase
        .from('kyc_profiles_new')
        .upsert(
          {
            user_id: userId,
            level,
            data_json: data,
            status: status ?? 'draft',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,level' }
        )
        .select()
        .single();

      if (error) {
        console.error('[KYC] Upsert error:', error.code, error.message);
        throw error;
      }
      
      setProfiles(prev => ({
        ...prev,
        [level]: upserted as KYCProfile
      }));
      
      return upserted as KYCProfile;
    } catch (error: any) {
      console.error('[KYC] Error updating KYC level:', error);
      
      if (error?.message?.includes('PHONE_ALREADY_USED')) {
        toast({
          title: "Phone Number Already Used",
          description: "This mobile number is already registered for KYC. Please contact support.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Save Failed",
          description: "Failed to save your information. Please try again.",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const submitKYCLevel = async (level: KYCLevel, profileId: string) => {
    const userId = getUserId();
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to submit your KYC",
        variant: "destructive",
      });
      throw new Error('User not authenticated');
    }

    try {
      const { data, error } = await supabase
        .from('kyc_profiles_new')
        .update({
          submitted_at: new Date().toISOString(),
          status: 'submitted'
        })
        .eq('id', profileId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('[KYC] Submit error:', error.code, error.message);
        throw error;
      }

      setProfiles(prev => ({
        ...prev,
        [level]: data as KYCProfile
      }));

      // Refresh to get latest state
      await fetchKYC();
    } catch (error: any) {
      console.error('[KYC] Error submitting KYC:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit your KYC. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Subscribe to realtime updates for the user's KYC status
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`kyc-user-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kyc_profiles_new',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.status === 'approved') {
            toast({
              title: "🎉 KYC Approved!",
              description: "Your identity has been verified successfully.",
            });
          } else if (updated.status === 'rejected') {
            toast({
              title: "KYC Needs Revision",
              description: updated.rejection_reason || "Please check the details and resubmit.",
              variant: "destructive",
            });
          }
          fetchKYC();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!authLoading) {
      fetchKYC();
    }
  }, [fetchKYC]);

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
