import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthLock } from '@/hooks/useAuthLock';
import { ROUTES } from '@/config/routes';
import { useNavigation } from '@/hooks/useNavigation';
import { hasLocalSecurity } from '@/utils/localSecurityStorage';

// Auth Guard - Protects authenticated routes
interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  redirectTo = ROUTES.ONBOARDING 
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Role Guard - Protects admin routes
interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
  redirectTo?: string;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  requiredRole = 'admin',
  redirectTo = ROUTES.APP_HOME 
}) => {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!user || (requiredRole === 'admin' && !isAdmin)) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// KYC Guard - Redirects to KYC if verification required
interface KycGuardProps {
  children: React.ReactNode;
  requireKyc?: boolean;
}

export const KycGuard: React.FC<KycGuardProps> = ({ 
  children, 
  requireKyc = true 
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Checking verification...</p>
        </div>
      </div>
    );
  }

  // For now, we'll skip KYC check since profile is not available in the current auth context
  // In a real implementation, you would fetch user profile data here
  if (requireKyc && user) {
    // TODO: Add KYC check when profile data is available
    // return <Navigate to={ROUTES.KYC} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Email Verification Guard
interface VerificationGuardProps {
  children: React.ReactNode;
  requireVerification?: boolean;
}

export const VerificationGuard: React.FC<VerificationGuardProps> = ({ 
  children, 
  requireVerification = true 
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Checking verification...</p>
        </div>
      </div>
    );
  }

  if (requireVerification && user && !user.email_confirmed_at) {
    return <Navigate to={ROUTES.EMAIL_VERIFICATION} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Lock Guard - CRITICAL: Enforces PIN/biometric on every app open
interface LockGuardProps {
  children: React.ReactNode;
}

export const LockGuard: React.FC<LockGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { lockState, isUnlockRequired } = useAuthLock();
  const location = useLocation();

  // Skip lock screen for auth routes
  const isAuthRoute = location.pathname.startsWith('/auth') || 
                     location.pathname.startsWith('/onboarding') ||
                     location.pathname === '/' ||
                     location.pathname.startsWith('/welcome');

  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Initializing security...</p>
        </div>
      </div>
    );
  }

  // CRITICAL: If user is authenticated and has security set up, require unlock
  if (user && (hasLocalSecurity() || lockState.biometricEnabled)) {
    if (!lockState.isUnlocked || isUnlockRequired()) {
      return <Navigate to="/auth/lock" state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
};

// Route Guard - Master guard that combines all guards
interface RouteGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireRole?: 'admin' | 'user';
  requireKyc?: boolean;
  requireVerification?: boolean;
}

export const RouteGuard: React.FC<RouteGuardProps> = ({
  children,
  requireAuth = false,
  requireRole,
  requireKyc = false,
  requireVerification = false
}) => {
  let guardedChildren = children;

  // Apply guards in order of priority
  if (requireVerification) {
    guardedChildren = (
      <VerificationGuard requireVerification={requireVerification}>
        {guardedChildren}
      </VerificationGuard>
    );
  }

  if (requireKyc) {
    guardedChildren = (
      <KycGuard requireKyc={requireKyc}>
        {guardedChildren}
      </KycGuard>
    );
  }

  if (requireRole) {
    guardedChildren = (
      <RoleGuard requiredRole={requireRole}>
        {guardedChildren}
      </RoleGuard>
    );
  }

  if (requireAuth) {
    guardedChildren = (
      <AuthGuard>
        {guardedChildren}
      </AuthGuard>
    );
  }

  // CRITICAL: Apply lock guard to all authenticated user routes
  if (requireAuth && !requireRole) {
    guardedChildren = (
      <LockGuard>
        {guardedChildren}
      </LockGuard>
    );
  }

  return <>{guardedChildren}</>;
};

// Navigation State Manager - Preserves form state during navigation
export const NavigationStateManager: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const { preserveState, getState } = useNavigation();
  const location = useLocation();

  useEffect(() => {
    // Restore scroll position on route change
    const savedState = getState();
    if (savedState?.scrollPosition) {
      setTimeout(() => {
        window.scrollTo(0, savedState.scrollPosition);
      }, 100);
    }

    // Save scroll position before leaving
    const handleBeforeUnload = () => {
      preserveState({
        scrollPosition: window.scrollY,
        timestamp: Date.now()
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save state when component unmounts (route change)
      preserveState({
        scrollPosition: window.scrollY,
        timestamp: Date.now()
      });
    };
  }, [location.pathname, preserveState, getState]);

  return <>{children}</>;
};