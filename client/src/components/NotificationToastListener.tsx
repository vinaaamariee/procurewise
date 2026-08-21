import { trpc } from "@/lib/trpc";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export function NotificationToastListener() {
  const notifications = trpc.procurement.notifications.list.useQuery(undefined, { retry: false, refetchInterval: 15_000, refetchIntervalInBackground: true });
  const knownNotificationIds = useRef<Set<number> | null>(null);

  useEffect(() => {
    if (!notifications.data) return;
    const currentIds = new Set(notifications.data.map((notification) => notification.id));
    if (!knownNotificationIds.current) {
      knownNotificationIds.current = currentIds;
      return;
    }
    notifications.data.filter((notification) => !knownNotificationIds.current?.has(notification.id) && !notification.readAt).forEach((notification) => {
      toast.info(notification.title, { description: notification.body, duration: 7_000 });
    });
    knownNotificationIds.current = currentIds;
  }, [notifications.data]);

  return null;
}
