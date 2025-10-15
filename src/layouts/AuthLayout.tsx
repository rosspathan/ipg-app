import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AuthHeader } from '@/components/navigation/NavigationHeader';
import { NavigationStateManager } from '@/components/navigation/NavigationGuards';

// Auth route titles mapping
const AUTH_ROUTE_TITLES: Record<string, string> = {
  '/auth': 'Authentication',
  '/auth/login': 'Sign In',
  '/auth/check-email': 'Check Your Email',
  '/auth/verify-code': 'Verify Email',
  '/auth/register': 'Create Account',
  '/auth/reset': 'Reset Password',
  '/onboarding': 'Welcome',
  '/onboarding/security': 'Security Setup',
  '/welcome': 'Welcome to IPG'
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
      case '/auth/check-email':
        return 'Check your inbox for verification code';
      case '/auth/verify-code':
        return 'Enter the 6-digit code from your email';
      case '/onboarding':
        return 'Let\'s get you started';
      case '/onboarding/security':
        return 'Protect your account';
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