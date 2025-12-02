import { useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation, NavigateOptions } from 'react-router-dom';
import { ROUTES, ROUTE_ALIASES, NavigationState, StackType, USER_STACK_ROUTES, ADMIN_STACK_ROUTES, AUTH_STACK_ROUTES } from '@/config/routes';

interface NavigationHelpers {
  navigate: (route: string, params?: Record<string, any>, options?: NavigateOptions & { state?: NavigationState }) => void;
  replace: (route: string, params?: Record<string, any>, options?: NavigateOptions & { state?: NavigationState }) => void;
  goBack: () => void;
  resetTo: (route: string, params?: Record<string, any>) => void;
  canGoBack: () => boolean;
  getCurrentStack: () => StackType;
  isInStack: (stack: StackType) => boolean;
  buildPath: (route: string, params?: Record<string, any>) => string;
  preserveState: (state: NavigationState) => void;
  getState: () => NavigationState | null;
}

// Debounce navigation to prevent rapid taps
const useDebounce = (func: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      func(...args);
    }, delay);
  }, [func, delay]);
};

export const useNavigation = (): NavigationHelpers => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationInProgress = useRef(false);

  // Determine current stack based on pathname
  const getCurrentStack = useCallback((): StackType => {
    const path = location.pathname;
    
    if (USER_STACK_ROUTES.some(route => path.startsWith(route) || path === route)) {
      return 'USER';
    }
    
    if (ADMIN_STACK_ROUTES.some(route => path.startsWith(route) || path === route)) {
      return 'ADMIN';
    }
    
    if (AUTH_STACK_ROUTES.some(route => path.startsWith(route) || path === route)) {
      return 'AUTH';
    }
    
    return 'PUBLIC';
  }, [location.pathname]);

  // Check if currently in a specific stack
  const isInStack = useCallback((stack: StackType): boolean => {
    return getCurrentStack() === stack;
  }, [getCurrentStack]);

  // Build path with parameters
  const buildPath = useCallback((route: string, params?: Record<string, any>): string => {
    // Check for route aliases
    const resolvedRoute = ROUTE_ALIASES[route as keyof typeof ROUTE_ALIASES] || route;
    
    if (!params) return resolvedRoute;
    
    let path = resolvedRoute;
    
    // Replace path parameters (e.g., :pair -> BTC-USDT)
    Object.entries(params).forEach(([key, value]) => {
      path = path.replace(`:${key}`, String(value));
    });
    
    // Add query parameters
    const queryParams = Object.entries(params)
      .filter(([key]) => !resolvedRoute.includes(`:${key}`))
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');
    
    if (queryParams) {
      path += `?${queryParams}`;
    }
    
    return path;
  }, []);

  // Enhanced navigate with debouncing and state preservation
  const navigateWithOptions = useCallback((
    route: string, 
    params?: Record<string, any>, 
    options?: NavigateOptions & { state?: NavigationState }
  ) => {
    if (navigationInProgress.current) return;
    
    navigationInProgress.current = true;
    
    try {
      const path = buildPath(route, params);
      navigate(path, {
        ...options,
        state: {
          ...options?.state,
          previousPath: location.pathname,
          timestamp: Date.now()
        }
      });
    } finally {
      // Reset navigation lock after a short delay
      setTimeout(() => {
        navigationInProgress.current = false;
      }, 300);
    }
  }, [navigate, location.pathname, buildPath]);

  // Replace current route
  const replaceWithOptions = useCallback((
    route: string, 
    params?: Record<string, any>, 
    options?: NavigateOptions & { state?: NavigationState }
  ) => {
    const path = buildPath(route, params);
    navigate(path, { 
      ...options, 
      replace: true,
      state: {
        ...options?.state,
        timestamp: Date.now()
      }
    });
  }, [navigate, buildPath]);

  // Safe go back with stack isolation
  const goBack = useCallback(() => {
    const currentStack = getCurrentStack();
    const historyState = window.history.state;
    
    // Check if we can safely go back within the same stack
    if (historyState?.previousPath) {
      const previousStack = historyState.previousPath.startsWith('/app') ? 'USER' :
                           historyState.previousPath.startsWith('/admin') ? 'ADMIN' :
                           historyState.previousPath.startsWith('/auth') ? 'AUTH' : 'PUBLIC';
      
      if (previousStack === currentStack) {
        navigate(-1);
        return;
      }
    }

    // Define explicit parent routes for specific pages
    const currentPath = location.pathname;
    const explicitParentRoutes: Record<string, string> = {
      '/app/loans/': '/app/loans', // Loan details pages
      '/app/programs/': '/app/programs', // Program subpages
      '/admin/': '/admin', // Admin subpages
    };

    // Check if current path matches any explicit parent route pattern
    for (const [pattern, parentRoute] of Object.entries(explicitParentRoutes)) {
      if (currentPath.startsWith(pattern) && currentPath !== pattern) {
        navigate(parentRoute);
        return;
      }
    }
    
    // Default back behavior based on current stack
    switch (currentStack) {
      case 'USER':
        replaceWithOptions(ROUTES.APP_HOME);
        break;
      case 'ADMIN':
        replaceWithOptions(ROUTES.ADMIN_DASHBOARD);
        break;
      case 'AUTH':
        replaceWithOptions(ROUTES.ONBOARDING);
        break;
      default:
        replaceWithOptions(ROUTES.HOME);
    }
  }, [getCurrentStack, navigate, replaceWithOptions, location.pathname]);

  // Reset to stack root
  const resetTo = useCallback((route: string, params?: Record<string, any>) => {
    replaceWithOptions(route, params);
  }, [replaceWithOptions]);

  // Check if can go back safely
  const canGoBack = useCallback((): boolean => {
    return window.history.length > 1;
  }, []);

  // Preserve navigation state
  const preserveState = useCallback((state: NavigationState) => {
    try {
      const key = `nav_state_${location.pathname}`;
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to preserve navigation state:', error);
    }
  }, [location.pathname]);

  // Get preserved state
  const getState = useCallback((): NavigationState | null => {
    try {
      const key = `nav_state_${location.pathname}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to get navigation state:', error);
      return null;
    }
  }, [location.pathname]);

  // Debounced navigation functions - reduced delay for better UX
  const debouncedNavigate = useDebounce(navigateWithOptions, 100);
  const debouncedReplace = useDebounce(replaceWithOptions, 100);

  // Cleanup navigation locks on unmount
  useEffect(() => {
    return () => {
      if (navigationInProgress.current) {
        navigationInProgress.current = false;
      }
    };
  }, []);

  return {
    navigate: debouncedNavigate,
    replace: debouncedReplace,
    goBack,
    resetTo,
    canGoBack,
    getCurrentStack,
    isInStack,
    buildPath,
    preserveState,
    getState
  };
};

// Custom hook for handling hardware back button (Android)
export const useHardwareBackButton = (handler?: () => boolean) => {
  useEffect(() => {
    const handleBackButton = (event: PopStateEvent) => {
      if (handler) {
        const shouldPreventDefault = handler();
        if (shouldPreventDefault) {
          event.preventDefault();
          return false;
        }
      }
    };

    window.addEventListener('popstate', handleBackButton);
    
    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [handler]);
};