import { cn } from '@/lib/utils';
import { AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';
import { ReactNode } from 'react';

interface OnboardingAlertProps {
  variant: 'warning' | 'info' | 'success' | 'danger';
  title?: string;
  children: ReactNode;
  icon?: boolean;
  className?: string;
}

export function OnboardingAlert({
  variant,
  title,
  children,
  icon = true,
  className
}: OnboardingAlertProps) {
  const variants = {
    warning: {
      bg: 'bg-orange-900/95 border-orange-500/60',
      text: 'text-orange-50',
      title: 'text-white',
      icon: <AlertCircle className="w-5 h-5 text-orange-300" />
    },
    info: {
      bg: 'bg-blue-900/95 border-blue-500/60',
      text: 'text-blue-50',
      title: 'text-white',
      icon: <Info className="w-5 h-5 text-blue-300" />
    },
    success: {
      bg: 'bg-green-900/95 border-green-500/60',
      text: 'text-green-50',
      title: 'text-white',
      icon: <CheckCircle className="w-5 h-5 text-green-300" />
    },
    danger: {
      bg: 'bg-red-900/95 border-red-500/60',
      text: 'text-red-50',
      title: 'text-white',
      icon: <XCircle className="w-5 h-5 text-red-300" />
    }
  };

  const config = variants[variant];

  return (
    <div
      className={cn(
        'rounded-xl p-4 backdrop-blur-sm border',
        config.bg,
        className
      )}
    >
      {title && (
        <div className="flex items-center gap-2 mb-2">
          {icon && config.icon}
          <h4 className={cn('font-semibold text-base', config.title)}>
            {title}
          </h4>
        </div>
      )}
      <div className={cn('text-sm font-medium', config.text)}>
        {children}
      </div>
    </div>
  );
}
