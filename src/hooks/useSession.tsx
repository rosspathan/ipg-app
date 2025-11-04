/**
 * useSession - React hook for SessionManager
 * 
 * Replaces:
 * - useAuthSession
 * - useAuthUser
 * - useAuthLock
 * - useSessionIntegrityMonitor
 */

import { useEffect, useState } from 'react';
import { SessionManager, SessionState } from '@/services/SessionManager';
import { useNavigate, useLocation } from 'react-router-dom';

export function useSession() {
  const [state, setState] = useState<SessionState>(SessionManager.getState());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Subscribe to session state changes
    const unsubscribe = SessionManager.subscribe(setState);

    // Initialize if not already done
    if (!state.isInitialized) {
      SessionManager.initialize();
    }

    return unsubscribe;
  }, []);

  // Auto-redirect based on session state
  useEffect(() => {
    if (!state.isInitialized) return;

    const validation = SessionManager.validateAccess(location.pathname);
    
    if (!validation.isValid && validation.redirectTo) {
      console.log('[useSession] Redirecting:', validation.reason, '->', validation.redirectTo);
      navigate(validation.redirectTo, { replace: true });
    }
  }, [state, location.pathname]);

  return {
    // State
    session: state.session,
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    hasWallet: state.hasWallet,
    hasSecurity: state.hasSecurity,
    isUnlocked: state.isUnlocked,
    isInitialized: state.isInitialized,
    lockReason: state.lockReason,

    // Actions
    unlock: () => SessionManager.unlock(),
    lock: () => SessionManager.lock(),
    signOut: () => SessionManager.signOut(),
    refresh: () => SessionManager.refresh(),
    validateAccess: (pathname: string) => SessionManager.validateAccess(pathname),
  };
}

/**
 * Lightweight hook for components that only need to know if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const [isAuth, setIsAuth] = useState(SessionManager.getState().isAuthenticated);

  useEffect(() => {
    return SessionManager.subscribe((state) => {
      setIsAuth(state.isAuthenticated);
    });
  }, []);

  return isAuth;
}

/**
 * Hook for getting user info without triggering redirects
 */
export function useUser() {
  const [user, setUser] = useState(SessionManager.getState().user);

  useEffect(() => {
    return SessionManager.subscribe((state) => {
      setUser(state.user);
    });
  }, []);

  return user;
}
