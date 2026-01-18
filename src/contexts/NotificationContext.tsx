import { createContext, useContext, useState, ReactNode } from 'react';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (type: NotificationType, title: string, message: string) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (type: NotificationType, title: string, message: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = { id, type, title, message };
    
    setNotifications(prev => [...prev, newNotification]);
    
    setTimeout(() => {
      removeNotification(id);
    }, 5000);

    const notifyDesktop = async () => {
      try {
        const settings = localStorage.getItem('confutils_settings');
        if (settings) {
          const parsed = JSON.parse(settings);
          if (parsed && parsed.notifications === false) {
            return;
          }
        }
        let granted = await isPermissionGranted();
        if (!granted) {
          const permission = await requestPermission();
          granted = permission === 'granted';
        }
        if (granted) {
          sendNotification({ title, body: message });
        }
      } catch {
        return;
      }
    };

    notifyDesktop();
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
