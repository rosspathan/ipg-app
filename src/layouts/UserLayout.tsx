import { Outlet } from "react-router-dom";
import { BottomTabBar } from '@/components/navigation/BottomTabBar';
import { NavigationStateManager } from '@/components/navigation/NavigationGuards';
import { useHardwareBackButton, useNavigation } from '@/hooks/useNavigation';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import React, { useEffect } from 'react';

const UserLayout = () => {
  const location = useLocation();
  const { navigate, getCurrentStack } = useNavigation();
  const { toast } = useToast();

  // Handle Android hardware back button
  const [backPressCount, setBackPressCount] = React.useState(0);
  const backPressTimer = React.useRef<NodeJS.Timeout>();

  useHardwareBackButton(() => {
    const currentStack = getCurrentStack();
    
    // Only handle hardware back in user stack
    if (currentStack !== 'USER') return false;

    const isRootRoute = location.pathname === ROUTES.APP_HOME || 
                       location.pathname === ROUTES.APP;

    if (isRootRoute) {
      // Double-tap to exit on root routes
      setBackPressCount(prev => prev + 1);
      
      if (backPressCount === 0) {
        toast({
          title: "Press back again to exit",
          duration: 2000,
        });
        
        backPressTimer.current = setTimeout(() => {
          setBackPressCount(0);
        }, 2000);
        
        return true; // Prevent default
      } else {
        // Second press - exit app (or go to landing page)
        navigate(ROUTES.HOME);
        return false;
      }
    }

    return false; // Allow default back behavior for non-root routes
  });

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (backPressTimer.current) {
        clearTimeout(backPressTimer.current);
      }
    };
  }, []);

  // Reset back press count on route change
  useEffect(() => {
    setBackPressCount(0);
    if (backPressTimer.current) {
      clearTimeout(backPressTimer.current);
    }
  }, [location.pathname]);

  return (
    <NavigationStateManager>
      <div className="h-screen bg-background w-full max-w-full overflow-hidden flex flex-col">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24">
          <Outlet />
        </div>

        {/* Enhanced bottom navigation */}
        <BottomTabBar />
      </div>
    </NavigationStateManager>
  );
};

export default UserLayout;