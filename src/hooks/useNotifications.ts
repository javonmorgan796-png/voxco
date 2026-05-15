import { useState, useEffect, useCallback } from "react";

export interface AppNotification {
  id: string;
  type: "cashout" | "win" | "loss" | "deposit" | "withdrawal" | "bet_placed" | "info";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  icon?: string;
}

const NOTIFICATIONS_KEY = "app_notifications";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (stored) {
      try { setNotifications(JSON.parse(stored)); } catch { setNotifications([]); }
    }
  }, []);

  const save = useCallback((updated: AppNotification[]) => {
    setNotifications(updated);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
  }, []);

  const addNotification = useCallback((
    type: AppNotification["type"],
    title: string,
    message: string,
  ) => {
    const notif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      title,
      message,
      createdAt: new Date().toISOString(),
      read: false,
    };
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    let current: AppNotification[] = [];
    try { current = stored ? JSON.parse(stored) : []; } catch { current = []; }
    const updated = [notif, ...current].slice(0, 50); // keep latest 50
    save(updated);
    return notif;
  }, [save]);

  const markAsRead = useCallback((id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    save(updated);
  }, [notifications, save]);

  const markAllAsRead = useCallback(() => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    save(updated);
  }, [notifications, save]);

  const clearAll = useCallback(() => {
    save([]);
  }, [save]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
};
