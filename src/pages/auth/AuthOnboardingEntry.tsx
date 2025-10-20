import { useEffect } from 'react';
import OnboardingFlow from '@/pages/OnboardingFlow';
import { useOnboarding } from '@/hooks/useOnboarding';

export default function AuthOnboardingEntry() {
  const { setStep } = useOnboarding();
  
  useEffect(() => {
    setStep('auth-signup');
  }, [setStep]);
  
  return <OnboardingFlow />;
}
