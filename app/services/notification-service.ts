export type NotificationType = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
}

type NotificationListener = (notification: AppNotification) => void;

const listeners = new Set<NotificationListener>();

export default function NotificationService(
  message: string,
  type: NotificationType = "info"
): AppNotification {
  const notification: AppNotification = {
    id: crypto.randomUUID(),
    message,
    type,
    timestamp: new Date(),
  };

  listeners.forEach((listener) => listener(notification));

  return notification;
}

export function subscribeToNotifications(listener: NotificationListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
