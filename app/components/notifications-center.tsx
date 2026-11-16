"use client";

import { useEffect, useState } from "react";
import NotificationService, {
  subscribeToNotifications,
  type AppNotification,
  type NotificationType,
} from "../services/notification-service";

const styles: Record<NotificationType, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-green-200 bg-green-50 text-green-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-900",
};

export default function NotificationCenter() {
  const [notification, setNotification] =
    useState<AppNotification | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications(setNotification);

    try {
      const message = sessionStorage.getItem("finatic:flash");

      if (message) {
        sessionStorage.removeItem("finatic:flash");
        NotificationService(message, "success");
      }
    } catch {
      return unsubscribe;
    }

    return unsubscribe;
  }, []);

  if (!notification) return null;

  return (
    <div
      role={notification.type === "error" ? "alert" : "status"}
      className={`fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm rounded-xl border p-4 shadow-lg sm:right-6 sm:top-6 ${styles[notification.type]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium">
          {notification.message}
        </p>

        <button
          type="button"
          onClick={() => setNotification(null)}
          className="text-lg leading-none opacity-70 hover:opacity-100"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}
