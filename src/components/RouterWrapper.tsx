import { ReactNode } from 'react';
import { useDeepLinking } from '@/hooks/useDeepLinking';

interface RouterWrapperProps {
  children: ReactNode;
}

/**
 * Wrapper component that initializes features requiring Router context
 * This must be inside <BrowserRouter> but wraps <Routes>
 */
export function RouterWrapper({ children }: RouterWrapperProps) {
  // Initialize deep linking (requires Router context for useNavigate)
  useDeepLinking();
  
  return <>{children}</>;
}
