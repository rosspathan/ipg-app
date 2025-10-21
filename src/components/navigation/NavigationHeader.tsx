import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Menu, Settings, User } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useNavigation } from '@/hooks/useNavigation';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/config/routes';

interface NavigationHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showMenu?: boolean;
  showNotifications?: boolean;
  showProfile?: boolean;
  rightAction?: {
    icon?: React.ReactNode;
    label?: string;
    onClick?: () => void;
  };
  className?: string;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  showMenu = false,
  showNotifications = false,
  showProfile = false,
  rightAction,
  className = ''
}) => {
  const { goBack, navigate, canGoBack, getCurrentStack } = useNavigation();
  const { user, isAdmin } = useAuth();
  
  const currentStack = getCurrentStack();
  const isUserStack = currentStack === 'USER';
  const isAdminStack = currentStack === 'ADMIN';

  const handleBackPress = () => {
    if (canGoBack()) {
      goBack();
    } else {
      // Fallback to stack root
      if (isUserStack) {
        navigate(ROUTES.APP_HOME);
      } else if (isAdminStack) {
        navigate(ROUTES.ADMIN_DASHBOARD);
      }
    }
  };

  const handleStackSwitch = () => {
    if (isUserStack && isAdmin) {
      navigate(ROUTES.ADMIN_DASHBOARD);
    } else if (isAdminStack) {
      navigate(ROUTES.APP_HOME);
    }
  };

  return (
    <header className={`sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border ${className}`}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {showBack && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleBackPress}
              className="hover:bg-muted/50 -ml-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
          )}
          
          {showMenu && (
            <Button 
              variant="ghost" 
              size="icon"
              className="hover:bg-muted/50"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Stack switcher for admin users - ALWAYS VISIBLE */}
          {user && isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStackSwitch}
              className="text-xs font-medium"
            >
              {isUserStack ? '👑 Admin View' : '👤 User View'}
            </Button>
          )}

          {/* Notifications */}
          {showNotifications && <NotificationBell size="md" />}

          {/* Profile */}
          {showProfile && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(ROUTES.APP_PROFILE)}
              className="hover:bg-muted/50"
            >
              <User className="w-5 h-5" />
            </Button>
          )}

          {/* Custom right action */}
          {rightAction && (
            <Button 
              variant="ghost" 
              size={rightAction.label ? "sm" : "icon"}
              onClick={rightAction.onClick}
              className="hover:bg-muted/50"
            >
              {rightAction.icon || <Settings className="w-5 h-5" />}
              {rightAction.label && (
                <span className="ml-2 text-sm">{rightAction.label}</span>
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

// Specialized headers for different contexts
export const UserAppHeader: React.FC<Omit<NavigationHeaderProps, 'showNotifications' | 'showProfile'>> = (props) => (
  <NavigationHeader 
    {...props} 
    showNotifications={true} 
    showProfile={true} 
  />
);

export const AdminHeader: React.FC<NavigationHeaderProps> = (props) => (
  <NavigationHeader 
    {...props} 
    rightAction={{
      icon: <Settings className="w-5 h-5" />,
      onClick: () => {
        // Navigate to admin settings
      }
    }}
  />
);

export const AuthHeader: React.FC<Omit<NavigationHeaderProps, 'showBack' | 'showNotifications' | 'showProfile'>> = (props) => (
  <NavigationHeader 
    {...props} 
    showBack={false}
    showNotifications={false} 
    showProfile={false} 
  />
);