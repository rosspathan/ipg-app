import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Wallet, TrendingUp, User } from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import ipgLogoPremium from '@/assets/ipg-logo-premium.jpg';

// Main navigation tabs (4 tabs around the center logo)
const MAIN_TABS = [
  { route: ROUTES.APP_HOME, label: 'Home', icon: Home },
  { route: ROUTES.APP_WALLET, label: 'Wallet', icon: Wallet },
  { route: ROUTES.APP_TRADE, label: 'Trading', icon: TrendingUp },
  { route: ROUTES.APP_PROFILE, label: 'Profile', icon: User },
];

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
    <div 
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-background/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between px-4 py-2 relative">
        {/* Left side tabs */}
        <div className="flex gap-8">
          {MAIN_TABS.slice(0, 2).map(({ route, label, icon: IconComponent }) => {
            const isActive = isActiveTab(route);
            
            return (
              <Button
                key={route}
                variant="ghost"
                size="sm"
                onClick={() => handleTabPress(route)}
                className={`flex flex-col items-center gap-1 h-auto py-2 px-3 transition-all duration-200 ${
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="relative">
                  <IconComponent className={`w-6 h-6 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-primary' : ''
                  }`} />
                  
                  {/* Show notification badge for wallet */}
                  {route === ROUTES.APP_WALLET && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 w-2 h-2 p-0"
                    />
                  )}
                </div>
                
                <span className={`text-xs transition-all duration-200 ${
                  isActive ? 'font-semibold text-primary' : 'font-normal'
                }`}>
                  {label}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Center logo */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/30 flex items-center justify-center border-2 border-primary/20 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300">
              <img 
                src={ipgLogoPremium} 
                alt="I-SMART Logo" 
                className="w-10 h-10 rounded-full object-contain filter brightness-110"
              />
            </div>
            {/* Pulsing ring effect */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping opacity-75"></div>
          </div>
        </div>

        {/* Right side tabs */}
        <div className="flex gap-8">
          {MAIN_TABS.slice(2, 4).map(({ route, label, icon: IconComponent }) => {
            const isActive = isActiveTab(route);
            
            return (
              <Button
                key={route}
                variant="ghost"
                size="sm"
                onClick={() => handleTabPress(route)}
                className={`flex flex-col items-center gap-1 h-auto py-2 px-3 transition-all duration-200 ${
                  isActive 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="relative">
                  <IconComponent className={`w-6 h-6 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-primary' : ''
                  }`} />
                </div>
                
                <span className={`text-xs transition-all duration-200 ${
                  isActive ? 'font-semibold text-primary' : 'font-normal'
                }`}>
                  {label}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};