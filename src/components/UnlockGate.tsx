import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthLock } from '@/hooks/useAuthLock';
import { useAuthUser } from '@/hooks/useAuthUser';

interface UnlockGateProps {
  children: React.ReactNode;
}

export const UnlockGate = ({ children }: UnlockGateProps) => {
  const { user } = useAuthUser();
  const { lockState, isUnlockRequired } = useAuthLock();
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

    // Check if unlock is required
    if (isUnlockRequired()) {
      navigate('/auth/lock', { 
        state: { from: location.pathname },
        replace: true 
      });
    }
  }, [user, lockState, isUnlockRequired, navigate, location]);

  // If not authenticated or on exempt routes, render children
  if (!user || 
      location.pathname.startsWith('/auth') || 
      location.pathname.startsWith('/onboarding') ||
      location.pathname === '/recovery/verify') {
    return <>{children}</>;
  }

  // If unlock is required, don't render children (will redirect)
  if (isUnlockRequired()) {
    return null;
  }

  return <>{children}</>;
};