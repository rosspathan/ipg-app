import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Wallet, TrendingUp, ArrowUpDown, Gift, User } from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { useLocation } from 'react-router-dom';
import { ROUTES, USER_TAB_ROUTES } from '@/config/routes';

const TAB_ICONS = {
  Home,
  Wallet,
  TrendingUp,
  ArrowUpDown,
  Gift,
  User
} as const;

export const BottomTabBar: React.FC = () => {
  const { navigate, getCurrentStack } = useNavigation();
  const location = useLocation();
  
  // Only show on user stack routes
  const currentStack = getCurrentStack();
  if (currentStack !== 'USER') return null;

  const isActiveTab = (route: string): boolean => {
    // For home tab, match exact path or app root
    if (route === ROUTES.APP_HOME) {
      return location.pathname === route || location.pathname === ROUTES.APP;
    }
    
    // For other tabs, match if current path starts with tab route
    return location.pathname.startsWith(route);
  };

  const handleTabPress = (route: string) => {
    // Use navigate instead of push to avoid duplicate instances
    navigate(route);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
      <div className="grid grid-cols-6 gap-0 px-2 py-2">
        {USER_TAB_ROUTES.map(({ route, label, icon }) => {
          const IconComponent = TAB_ICONS[icon as keyof typeof TAB_ICONS];
          const isActive = isActiveTab(route);
          
          return (
            <Button
              key={route}
              variant="ghost"
              size="sm"
              onClick={() => handleTabPress(route)}
              className={`flex flex-col items-center gap-1 h-auto py-2 px-1 transition-all duration-200 ${
                isActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <div className="relative">
                <IconComponent className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? 'scale-110' : ''
                }`} />
                
                {/* Show notification badges for specific tabs */}
                {route === ROUTES.APP_WALLET && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 w-2 h-2 p-0"
                  />
                )}
              </div>
              
              <span className={`text-xs transition-all duration-200 ${
                isActive ? 'font-medium' : 'font-normal'
              }`}>
                {label}
              </span>
              
              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" />
              )}
            </Button>
          );
        })}
      </div>
      
      {/* Safe area padding for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-background/95" />
    </div>
  );
};