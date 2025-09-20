import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

export interface KYCProfile {
  user_id: string;
  status: 'unverified' | 'pending' | 'verified' | 'rejected';
  first_name?: string;
  last_name?: string;
  id_type?: string;
  id_number?: string;
  id_front_url?: string;
  id_back_url?: string;
  selfie_url?: string;
  notes?: string;
  submitted_at?: string;
  reviewed_at?: string;
  created_at: string;
}

export const useKYC = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [kycProfile, setKycProfile] = useState<KYCProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchKYC = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Set default KYC state since table doesn't exist yet
      setKycProfile({
        user_id: user.id,
        status: 'unverified',
        created_at: new Date().toISOString()
      });
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

  const uploadFile = async (file: File, type: 'id_front' | 'id_back' | 'selfie'): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('kyc')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('kyc')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const updateKYC = async (updates: Partial<KYCProfile>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('kyc_profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setKycProfile(data as KYCProfile);
      return data;
    } catch (error) {
      console.error('Error updating KYC:', error);
      toast({
        title: "Error",
        description: "Failed to update KYC data",
        variant: "destructive",
      });
      throw error;
    }
  };

  const submitKYC = async (kycData: {
    first_name: string;
    last_name: string;
    id_type: string;
    id_number: string;
    id_front_url: string;
    id_back_url: string;
    selfie_url: string;
  }) => {
    try {
      const updates = {
        ...kycData,
        status: 'pending' as const,
        submitted_at: new Date().toISOString()
      };

      await updateKYC(updates);
      toast({
        title: "Success",
        description: "KYC documents submitted successfully",
      });
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    fetchKYC();
  }, [user]);

  return {
    kycProfile,
    loading,
    uploading,
    updateKYC,
    uploadFile,
    submitKYC,
    refetch: fetchKYC
  };
};