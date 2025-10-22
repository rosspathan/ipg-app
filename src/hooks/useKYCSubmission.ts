import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useAuthLock } from '@/hooks/useAuthLock';
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
  const { startCriticalOperation, endCriticalOperation, updateActivity } = useAuthLock();
  const [submission, setSubmission] = useState<KYCSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
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
        .from('kyc_profiles_new')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Transform data_json to flat structure for form
        const dataJson = data.data_json as any || {};
        const flatData = {
          id: data.id,
          user_id: data.user_id,
          full_name: dataJson.personal_details?.full_name || '',
          date_of_birth: dataJson.personal_details?.date_of_birth || '',
          nationality: dataJson.personal_details?.nationality || '',
          phone: dataJson.personal_details?.phone || '',
          address_line1: dataJson.address_details?.address_line1 || '',
          address_line2: dataJson.address_details?.address_line2 || '',
          city: dataJson.address_details?.city || '',
          state: dataJson.address_details?.state || '',
          postal_code: dataJson.address_details?.postal_code || '',
          country: dataJson.address_details?.country || '',
          id_type: dataJson.id_document?.id_type || '',
          id_number: dataJson.id_document?.id_number || '',
          id_front_url: dataJson.documents?.id_front || '',
          id_back_url: dataJson.documents?.id_back || '',
          selfie_url: dataJson.documents?.selfie || '',
          status: data.status,
          rejection_reason: data.rejection_reason || '',
          submitted_at: data.submitted_at,
          reviewed_at: data.reviewed_at
        };
        setSubmission(flatData as KYCSubmission);
        setProgress(calculateProgress(flatData as any));
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
        
        // Merge with existing submission data
        const mergedData = {
          ...submission,
          ...data,
          user_id: user.id,
        };
        
        // Transform flat data to nested JSON structure
        const dataJson = {
          personal_details: {
            full_name: mergedData.full_name,
            date_of_birth: mergedData.date_of_birth,
            nationality: mergedData.nationality,
            phone: mergedData.phone,
          },
          address_details: {
            address_line1: mergedData.address_line1,
            address_line2: mergedData.address_line2,
            city: mergedData.city,
            state: mergedData.state,
            postal_code: mergedData.postal_code,
            country: mergedData.country,
          },
          id_document: {
            id_type: mergedData.id_type,
            id_number: mergedData.id_number,
          },
          documents: {
            id_front: mergedData.id_front_url,
            id_back: mergedData.id_back_url,
            selfie: mergedData.selfie_url,
          }
        };
        
        const updateData: any = {
          user_id: user.id,
          level: 'L1',
          data_json: dataJson,
          status: (data.status && data.status !== 'draft') ? data.status : 'pending'
        };
        
        const { error } = await supabase
          .from('kyc_profiles_new')
          .upsert(updateData, {
            onConflict: 'user_id,level'
          });

        if (error) throw error;

        // Update local state with merged data
        setSubmission(mergedData as KYCSubmission);
        
        // Calculate progress from complete merged data
        const newProgress = calculateProgress(mergedData);
        setProgress(newProgress);
        setLastSaved(new Date());
        
        console.log('✅ Draft saved, progress:', newProgress, '%');
        
        // Clear last saved indicator after 3 seconds
        setTimeout(() => setLastSaved(null), 3000);
      } catch (error) {
        console.error('Error saving draft:', error);
        toast.error('Failed to save changes');
      } finally {
        setSavingDraft(false);
      }
    },
    [user, submission, calculateProgress]
  );

  const uploadDocument = async (file: File, docType: 'id_front' | 'id_back' | 'selfie'): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    // Prevent auto-lock during upload
    startCriticalOperation();
    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${docType}_${Date.now()}.${fileExt}`;
      
      // Update activity every 5 seconds during upload
      const activityInterval = setInterval(() => {
        updateActivity();
        console.log('📸 Keeping session active during upload...');
      }, 5000);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file, {
          upsert: true
        });

      clearInterval(activityInterval);
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(fileName);

      toast.success('Document uploaded successfully');
      return publicUrl;
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed. Please try again.');
      throw error;
    } finally {
      setUploading(false);
      setUploadProgress(0);
      endCriticalOperation();
    }
  };

  const submitForReview = async (data: KYCSubmission) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Transform flat data to nested JSON structure
      const dataJson = {
        personal_details: {
          full_name: data.full_name,
          date_of_birth: data.date_of_birth,
          nationality: data.nationality,
          phone: data.phone,
        },
        address_details: {
          address_line1: data.address_line1,
          address_line2: data.address_line2,
          city: data.city,
          state: data.state,
          postal_code: data.postal_code,
          country: data.country,
        },
        id_document: {
          id_type: data.id_type,
          id_number: data.id_number,
        },
        documents: {
          id_front: data.id_front_url,
          id_back: data.id_back_url,
          selfie: data.selfie_url,
        }
      };

      const submitData: any = {
        user_id: user.id,
        level: 'L1',
        data_json: dataJson,
        status: 'pending',
        submitted_at: new Date().toISOString()
      };

      const { data: result, error } = await supabase
        .from('kyc_profiles_new')
        .upsert(submitData, {
          onConflict: 'user_id,level'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('KYC submitted successfully! You\'ll receive 5 BSK tokens after approval.');
      await fetchSubmission();
    } catch (error) {
      console.error('Error submitting KYC:', error);
      toast.error('Failed to submit KYC. Please try again.');
      throw error;
    }
  };

  const handleCameraStart = () => {
    startCriticalOperation();
    console.log('📸 Camera/Gallery access started - auto-lock disabled');
  };

  const handleCameraEnd = () => {
    endCriticalOperation();
    console.log('📸 Camera/Gallery access ended - auto-lock re-enabled');
  };

  return {
    submission,
    loading,
    uploading,
    savingDraft,
    progress,
    uploadProgress,
    lastSaved,
    saveDraft,
    uploadDocument,
    submitForReview,
    handleCameraStart,
    handleCameraEnd,
    refetch: fetchSubmission
  };
};
