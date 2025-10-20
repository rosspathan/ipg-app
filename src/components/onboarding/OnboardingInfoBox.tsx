import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface OnboardingInfoBoxProps {
  variant?: 'success' | 'info' | 'warning';
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function OnboardingInfoBox({
  variant = 'info',
  title,
  children,
  icon,
  className
}: OnboardingInfoBoxProps) {
  const variants = {
    success: {
      bg: 'bg-gradient-to-r from-green-900/70 to-emerald-900/70',
      border: 'border-green-500/50',
      text: 'text-green-50',
      title: 'text-green-100'
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-900/70 to-cyan-900/70',
      border: 'border-blue-500/50',
      text: 'text-blue-50',
      title: 'text-blue-100'
    },
    warning: {
      bg: 'bg-gradient-to-r from-orange-900/70 to-red-900/70',
      border: 'border-orange-500/50',
      text: 'text-orange-50',
      title: 'text-orange-100'
    }
  };

  const config = variants[variant];

  return (
    <Card className={cn(
      config.bg,
      'backdrop-blur-md border',
      config.border,
      className
    )}>
      <div className="p-4">
        {title && (
          <h4 className={cn('font-semibold text-sm mb-3 flex items-center', config.title)}>
            {icon && <span className="mr-2">{icon}</span>}
            {title}
          </h4>
        )}
        <div className={cn('text-xs', config.text)}>
          {children}
        </div>
      </div>
    </Card>
  );
}
