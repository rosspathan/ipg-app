import React, { createContext, useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface NotificationContextType {
  unreadCount: number;
  openNotificationCenter: () => void;
  closeNotificationCenter: () => void;
  isOpen: boolean;
}

export const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  openNotificationCenter: () => {},
  closeNotificationCenter: () => {},
  isOpen: false,
});

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const openNotificationCenter = () => setIsOpen(true);
  const closeNotificationCenter = () => setIsOpen(false);

  return (
    <NotificationContext.Provider 
      value={{ 
        unreadCount, 
        openNotificationCenter,
        closeNotificationCenter,
        isOpen
      }}
    >
      {children}
      <NotificationCenter 
        open={isOpen} 
        onOpenChange={setIsOpen} 
      />
    </NotificationContext.Provider>
  );
};
