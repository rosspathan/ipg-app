import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AuthHeader } from '@/components/navigation/NavigationHeader';
import { NavigationStateManager } from '@/components/navigation/NavigationGuards';

// Auth route titles mapping
const AUTH_ROUTE_TITLES: Record<string, string> = {
  '/auth': 'Authentication',
  '/auth/login': 'Sign In',
  '/auth/register': 'Create Account',
  '/auth/verify': 'Verify Email',
  '/auth/reset': 'Reset Password',
  '/onboarding': 'Welcome',
  '/welcome': 'Welcome to IPG',
  '/security-setup': 'Security Setup',
  '/verify-email': 'Verify Email',
  '/email-verified': 'Email Verified'
};

export const AuthLayout: React.FC = () => {
  const location = useLocation();
  
  // Get title based on current route
  const getPageTitle = (): string => {
    const path = location.pathname;
    return AUTH_ROUTE_TITLES[path] || 'Authentication';
  };

  const getSubtitle = (): string | undefined => {
    const path = location.pathname;
    
    switch (path) {
      case '/auth/login':
        return 'Sign in to your account';
      case '/auth/register':
        return 'Join the IPG ecosystem';
      case '/auth/verify':
        return 'Check your email for verification';
      case '/onboarding':
        return 'Let\'s get you started';
      case '/security-setup':
        return 'Secure your account';
      default:
        return undefined;
    }
  };

  return (
    <NavigationStateManager>
      <div className="min-h-screen bg-background">
        {/* Auth Header */}
        <AuthHeader 
          title={getPageTitle()}
          subtitle={getSubtitle()}
        />
        
        {/* Main content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </NavigationStateManager>
  );
};