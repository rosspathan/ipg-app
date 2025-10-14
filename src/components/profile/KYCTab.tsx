import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import KYCSubmission from '@/pages/KYCSubmission';

export const KYCTab = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Navigate to the standalone KYC page for better UX
    navigate('/app/profile/kyc-submission');
  }, [navigate]);

  // Render the KYC submission component directly
  return <KYCSubmission />;
};