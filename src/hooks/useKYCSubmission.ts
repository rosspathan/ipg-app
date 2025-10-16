import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { toast } from 'sonner';

export interface KYCSubmission {
  id?: string;
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
  id_type: 'aadhaar' | 'passport' | 'drivers_license' | 'national_id';
  id_number: string;
  id_front_url?: string;
  id_back_url?: string;
  selfie_url?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  rejection_reason?: string;
  admin_notes?: string;
  submitted_at?: string;
  reviewed_at?: string;
}

export const useKYCSubmission = () => {
  const { user } = useAuthUser();
  const [submission, setSubmission] = useState<KYCSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const calculateProgress = useCallback((data: Partial<KYCSubmission>) => {
    const requiredFields = [
      'full_name', 'date_of_birth', 'nationality', 'phone',
      'address_line1', 'city', 'postal_code', 'country',
      'id_type', 'id_number', 'id_front_url', 'id_back_url', 'selfie_url'
    ];
    
    const filledFields = requiredFields.filter(field => {
      const value = data[field as keyof KYCSubmission];
      return value !== undefined && value !== null && value !== '';
    });
    
    return Math.round((filledFields.length / requiredFields.length) * 100);
  }, []);

  const fetchSubmission = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('kyc_submissions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSubmission(data as any);
        setProgress(calculateProgress(data as any));
      } else {
        // Initialize empty submission
        const emptySubmission: Partial<KYCSubmission> = {
          user_id: user.id,
          status: 'draft'
        };
        setSubmission(emptySubmission as KYCSubmission);
        setProgress(0);
      }
    } catch (error) {
      console.error('Error fetching KYC submission:', error);
      toast.error('Failed to load KYC data');
    } finally {
      setLoading(false);
    }
  }, [user, calculateProgress]);

  useEffect(() => {
    fetchSubmission();
  }, [fetchSubmission]);

  const saveDraft = useCallback(
    async (data: Partial<KYCSubmission>) => {
      if (!user) return;

      try {
        setSavingDraft(true);
        const updateData: any = {
          user_id: user.id,
          ...data
        };
        // Only set status to draft if not already submitted/approved/rejected
        if (!data.status || data.status === 'draft') {
          updateData.status = 'draft';
        }
        
        const { error } = await supabase
          .from('kyc_submissions')
          .upsert(updateData, {
            onConflict: 'user_id'
          });

        if (error) throw error;

        setProgress(calculateProgress(data));
        setLastSaved(new Date());
        
        // Clear last saved indicator after 3 seconds
        setTimeout(() => setLastSaved(null), 3000);
        
        console.log('KYC draft saved instantly');
      } catch (error) {
        console.error('Error saving draft:', error);
        toast.error('Failed to save changes');
      } finally {
        setSavingDraft(false);
      }
    },
    [user, calculateProgress]
  );

  const uploadDocument = async (file: File, docType: 'id_front' | 'id_back' | 'selfie'): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${docType}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(fileName);

      return publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const submitForReview = async (data: KYCSubmission) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const submitData: any = {
        user_id: user.id,
        full_name: data.full_name,
        date_of_birth: data.date_of_birth,
        nationality: data.nationality,
        phone: data.phone,
        address_line1: data.address_line1,
        address_line2: data.address_line2 || null,
        city: data.city,
        state: data.state || null,
        postal_code: data.postal_code,
        country: data.country,
        id_type: data.id_type,
        id_number: data.id_number,
        id_front_url: data.id_front_url,
        id_back_url: data.id_back_url,
        selfie_url: data.selfie_url,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      };

      const { data: result, error } = await supabase
        .from('kyc_submissions')
        .upsert(submitData, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit entry
      if (result) {
        await supabase
          .from('kyc_audit_log')
          .insert({
            submission_id: result.id,
            action: 'submitted',
            performed_by: user.id,
            new_status: 'submitted'
          });
      }

      toast.success('KYC submitted successfully! Our team will review your documents.');
      await fetchSubmission();
    } catch (error) {
      console.error('Error submitting KYC:', error);
      toast.error('Failed to submit KYC. Please try again.');
      throw error;
    }
  };

  return {
    submission,
    loading,
    uploading,
    savingDraft,
    progress,
    lastSaved,
    saveDraft,
    uploadDocument,
    submitForReview,
    refetch: fetchSubmission
  };
};
