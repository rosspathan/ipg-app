import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotificationContext } from '@/hooks/useNotificationContext';

interface NotificationBellProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ 
  size = 'md', 
  className 
}) => {
  const { unreadCount, openNotificationCenter } = useNotificationContext();

  const getButtonSize = () => {
    if (size === 'sm') return 'sm';
    return 'icon';
  };

  const getIconSize = () => {
    if (size === 'sm') return 'h-4 w-4';
    if (size === 'lg') return 'h-6 w-6';
    return 'h-5 w-5';
  };

  return (
    <Button
      variant="ghost"
      size={getButtonSize()}
      className={cn('relative', size === 'sm' && 'h-9 w-9 p-0', className)}
      onClick={openNotificationCenter}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
    >
      <Bell className={getIconSize()} />
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 h-4 w-4 bg-danger rounded-full flex items-center justify-center">
          <span className="text-[10px] font-bold text-danger-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        </div>
      )}
    </Button>
  );
};
