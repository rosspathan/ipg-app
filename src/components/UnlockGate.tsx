import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthUser } from '@/hooks/useAuthUser';

interface UnlockGateProps {
  children: React.ReactNode;
}

export const UnlockGate = ({ children }: UnlockGateProps) => {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;

    // Skip for auth and onboarding routes
    if (location.pathname.startsWith('/auth') || 
        location.pathname.startsWith('/onboarding') ||
        location.pathname === '/recovery/verify') {
      return;
    }

    // For now, just check if user has completed security setup
    const hasCompletedSetup = localStorage.getItem('cryptoflow_setup_complete');
    
    if (!hasCompletedSetup) {
      navigate('/onboarding/security', { 
        state: { from: location.pathname },
        replace: true 
      });
      return;
    }

    // Simple PIN check - if no PIN is set, redirect to setup
    const hasPinSet = localStorage.getItem('cryptoflow_pin');
    if (!hasPinSet) {
      navigate('/onboarding/security', { 
        state: { from: location.pathname },
        replace: true 
      });
      return;
    }

    // Check if we need to show lock screen
    const isUnlocked = localStorage.getItem('cryptoflow_unlocked') === 'true';
    if (!isUnlocked) {
      navigate('/auth/lock', { 
        state: { from: location.pathname },
        replace: true 
      });
    }
  }, [user, navigate, location]);

  return <>{children}</>;
};