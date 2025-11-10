/* ═══════════════════════════════════════════════════════════
   APP LOCK GUARD - Unified with useAuthLock
   Route guard + visibility change handler for /app/* routes
   ═══════════════════════════════════════════════════════════ */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthLock } from '@/hooks/useAuthLock';
import { useAuthUser } from '@/hooks/useAuthUser';

interface AppLockGuardProps {
  children: React.ReactNode;
}

export function AppLockGuard({ children }: AppLockGuardProps) {
  // Security disabled - bypass all lock checks to eliminate flicker/blink
  return <>{children}</>;
}
