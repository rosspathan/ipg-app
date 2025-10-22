import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KYCSubmission {
  id: string;
  user_id: string;
  full_name: string;
  date_of_birth: string;
  nationality: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  id_type: 'passport' | 'national_id' | 'drivers_license' | 'aadhaar';
  id_number: string;
  id_front_url: string;
  id_back_url: string;
  selfie_url: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  rejection_reason?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  reviewed_at?: string;
}

export const useKYCSimple = () => {
  const [submission, setSubmission] = useState<KYCSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('kyc_submissions_simple')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setSubmission(data as KYCSubmission | null);
    } catch (error: any) {
      console.error('Error fetching KYC:', error);
      toast.error('Failed to load KYC submission');
    } finally {
      setLoading(false);
    }
  };

  const saveForm = async (formData: Partial<KYCSubmission>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const dataToSave = {
        ...formData,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      if (submission) {
        // Update existing
        const { error } = await supabase
          .from('kyc_submissions_simple')
          .update(dataToSave)
          .eq('id', submission.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('kyc_submissions_simple')
          .insert([dataToSave as any]);

        if (error) throw error;
      }

      toast.success('Saved successfully');
      await fetchSubmission();
      return true;
    } catch (error: any) {
      console.error('Error saving KYC:', error);
      toast.error(error.message || 'Failed to save');
      return false;
    }
  };

  const uploadDocument = async (file: File, type: 'id_front' | 'id_back' | 'selfie') => {
    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(fileName);

      toast.success('Document uploaded');
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const submitForReview = async () => {
    try {
      if (!submission) throw new Error('No submission found');

      const { error } = await supabase
        .from('kyc_submissions_simple')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (error) throw error;

      toast.success('Submitted for review!');
      await fetchSubmission();
      return true;
    } catch (error: any) {
      console.error('Error submitting KYC:', error);
      toast.error('Failed to submit');
      return false;
    }
  };

  useEffect(() => {
    fetchSubmission();
  }, []);

  return {
    submission,
    loading,
    uploading,
    saveForm,
    uploadDocument,
    submitForReview,
    refetch: fetchSubmission,
  };
};
