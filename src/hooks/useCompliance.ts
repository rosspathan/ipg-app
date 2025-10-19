import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';

interface ComplianceStatus {
  riskDisclosure: boolean;
  termsAcceptance: boolean;
  ageVerification: boolean;
  currentTermsVersion: string | null;
}

export const useCompliance = () => {
  const { user } = useAuthUser();
  const [status, setStatus] = useState<ComplianceStatus>({
    riskDisclosure: false,
    termsAcceptance: false,
    ageVerification: false,
    currentTermsVersion: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchComplianceStatus = async () => {
      try {
        // Get current terms version
        const { data: termsData } = await supabase
          .from('terms_versions')
          .select('version')
          .eq('is_current', true)
          .single();

        // Check all compliance acceptances
        const { data: acceptances } = await supabase
          .from('user_compliance_acceptances')
          .select('compliance_type, version')
          .eq('user_id', user.id);

        const hasRiskDisclosure = acceptances?.some(
          a => a.compliance_type === 'risk_disclosure'
        ) || false;

        const hasTermsAcceptance = acceptances?.some(
          a => a.compliance_type === 'terms_acceptance' && 
               a.version === termsData?.version
        ) || false;

        const hasAgeVerification = acceptances?.some(
          a => a.compliance_type === 'age_verification'
        ) || false;

        setStatus({
          riskDisclosure: hasRiskDisclosure,
          termsAcceptance: hasTermsAcceptance,
          ageVerification: hasAgeVerification,
          currentTermsVersion: termsData?.version || null,
        });
      } catch (error) {
        console.error('Error fetching compliance status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComplianceStatus();
  }, [user]);

  const acceptCompliance = async (
    type: 'risk_disclosure' | 'terms_acceptance' | 'age_verification',
    version?: string
  ) => {
    if (!user) return;

    try {
      await supabase.from('user_compliance_acceptances').insert({
        user_id: user.id,
        compliance_type: type,
        version: version || null,
        ip_address: null, // Can be enhanced with IP detection
        user_agent: navigator.userAgent,
      });

      // Update local status
      setStatus(prev => ({
        ...prev,
        [type === 'risk_disclosure' ? 'riskDisclosure' :
         type === 'terms_acceptance' ? 'termsAcceptance' : 
         'ageVerification']: true,
      }));
    } catch (error) {
      console.error('Error accepting compliance:', error);
      throw error;
    }
  };

  return {
    status,
    loading,
    acceptCompliance,
  };
};
