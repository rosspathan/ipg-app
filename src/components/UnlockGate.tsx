import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthUser } from '@/hooks/useAuthUser';
import { supabase } from '@/integrations/supabase/client';
import { hasLocalSecurity } from '@/utils/localSecurityStorage';
import { hasPinConfigured as hasLegacyPin } from '@/utils/lockState';

interface UnlockGateProps {
  children: React.ReactNode;
}

export const UnlockGate = ({ children }: UnlockGateProps) => {
  // Security disabled - return children immediately
  return <>{children}</>;
};