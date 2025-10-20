import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/hooks/useAuth';

export const NotFound: React.FC = () => {
  const { navigate, goBack, canGoBack, getCurrentStack } = useNavigation();
  const { user } = useAuth();
  
  const currentStack = getCurrentStack();

  const handleGoHome = () => {
    if (user) {
      // Authenticated user - go to app home
      navigate(ROUTES.APP_HOME);
    } else {
      // Unauthenticated user - go to landing page
      navigate(ROUTES.HOME);
    }
  };

  const handleGoBack = () => {
    if (canGoBack()) {
      goBack();
    } else {
      handleGoHome();
    }
  };

  const getContextualHome = () => {
    switch (currentStack) {
      case 'USER':
        return { route: ROUTES.APP_HOME, label: 'App Home' };
      case 'ADMIN':
        return { route: ROUTES.ADMIN_DASHBOARD, label: 'Admin Dashboard' };
      case 'AUTH':
        return { route: ROUTES.ONBOARDING, label: 'Sign In' };
      default:
        return { route: ROUTES.HOME, label: 'Home' };
    }
  };

  const contextualHome = getContextualHome();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Page Not Found</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-muted-foreground">
            <p className="mb-2">The page you're looking for doesn't exist.</p>
            <p className="text-sm">It might have been moved, deleted, or you entered the wrong URL.</p>
          </div>

          <div className="space-y-3 pt-4">
            {/* Go Back Button */}
            {canGoBack() && (
              <Button 
                onClick={handleGoBack}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            )}

            {/* Contextual Home Button */}
            <Button 
              onClick={() => navigate(contextualHome.route)}
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Go to {contextualHome.label}
            </Button>

            {/* Global Home Button (if different from contextual) */}
            {contextualHome.route !== ROUTES.HOME && (
              <Button 
                onClick={handleGoHome}
                variant="ghost"
                className="w-full"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Main Page
              </Button>
            )}
          </div>

          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-3 bg-muted rounded text-xs text-left">
              <p><strong>Debug Info:</strong></p>
              <p>Path: {window.location.pathname}</p>
              <p>Stack: {currentStack}</p>
              <p>User: {user ? 'Authenticated' : 'Anonymous'}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};