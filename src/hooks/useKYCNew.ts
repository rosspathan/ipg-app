import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
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

  const fetchKYC = async () => {
    if (!user || authLoading) {
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

      // Fetch all KYC profiles
      const { data: profilesData } = await supabase
        .from('kyc_profiles_new')
        .select('*')
        .eq('user_id', user.id);

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
        .eq('user_id', user.id);

      if (docsData) {
        setDocuments(docsData as KYCDocument[]);
      }
    } catch (error) {
      console.error('Error fetching KYC:', error);
      toast({
        title: "Error",
        description: "Failed to load KYC data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (
    file: File,
    level: KYCLevel,
    docType: string
  ): Promise<string> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to upload documents",
        variant: "destructive",
      });
      throw new Error('User not authenticated');
    }

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${level}/${docType}_${Date.now()}.${fileExt}`;
      
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
          user_id: user.id,
          level,
          doc_type: docType,
          storage_path: fileName,
          mime_type: file.type,
          file_size_bytes: file.size
        });

      if (docError) throw docError;

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "Failed to upload document",
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
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save your KYC information",
        variant: "destructive",
      });
      throw new Error('User not authenticated');
    }

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
            user_id: user.id,
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
    } catch (error) {
      console.error('Error updating KYC level:', error);
      toast({
        title: "Error",
        description: "Failed to update KYC",
        variant: "destructive",
      });
      throw error;
    }
  };

  const submitKYCLevel = async (level: KYCLevel, profileId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit your KYC",
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
        .select()
        .single();

      if (error) throw error;

      setProfiles(prev => ({
        ...prev,
        [level]: data as KYCProfile
      }));

      await fetchKYC();
    } catch (error) {
      console.error('Error submitting KYC:', error);
      toast({
        title: "Error",
        description: "Failed to submit KYC for review",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchKYC();
    }
  }, [user, authLoading]);

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