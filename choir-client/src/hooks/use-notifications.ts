import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export const notificationKeys = {
  all: ['notifications'] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: async () => {
      const res = await apiClient.get('/notifications');
      return res.data;
    },
    refetchInterval: 30000, // Poll every 30s
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch(`/notifications/${id}/read`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch('/notifications/read-all');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
