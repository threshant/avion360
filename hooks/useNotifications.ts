"use client";

import { invalidateSWRPrefix, withNetworkActivity } from "@/lib/swr-client";
import { api } from "@/services/apiClient";
import useSWR, { useSWRConfig } from "swr";

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  category: "task" | "lead" | "attendance" | "payroll";
  is_read: boolean;
  created_at: string;
};

type NotificationsResponse = {
  data: AppNotification[];
  unreadCount: number;
};

export function useNotifications(limit = 20) {
  const { mutate: globalMutate } = useSWRConfig();
  const key = `/swr/notifications?limit=${limit}`;

  const query = useSWR(key, () =>
    withNetworkActivity(() =>
      api.get<NotificationsResponse>(`/api/notifications?limit=${limit}`),
    ),
  );

  const markAsRead = async (notificationId: string) => {
    await withNetworkActivity(() =>
      api.patch("/api/notifications", { notificationId }),
    );
    await invalidateSWRPrefix(globalMutate, "/swr/notifications");
  };

  const markAllAsRead = async () => {
    await withNetworkActivity(() =>
      api.patch("/api/notifications", { markAllRead: true }),
    );
    await invalidateSWRPrefix(globalMutate, "/swr/notifications");
  };

  return {
    notifications: query.data?.data ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    loading: query.isLoading || query.isValidating,
    error: query.error instanceof Error ? query.error.message : null,
    markAsRead,
    markAllAsRead,
    refetch: query.mutate,
  };
}
