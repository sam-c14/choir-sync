import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { CreateRosterDto } from '@choir-workspace/shared-validation';


export interface RosterMemberResponse {
  id: string;
  userId: string;
  assignedRole: string;
  notes?: string;
  notified: boolean;
}

export interface RosterResponse {
  id: string;
  playlistId: string;
  members: RosterMemberResponse[];
}

export const rosterKeys = {
  all: ['rosters'] as const,
  detail: (playlistId: string) => ['rosters', playlistId] as const,
};

export function useRoster(playlistId: string) {
  return useQuery<RosterResponse | null>({

    queryKey: rosterKeys.detail(playlistId),
    queryFn: async () => {
      const res = await apiClient.get<RosterResponse>(`/playlists/${playlistId}/roster`);
      return res.data;
    },
    enabled: !!playlistId,
  });
}

export function useSaveRoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ playlistId, data }: { playlistId: string; data: CreateRosterDto }) => {
      const res = await apiClient.post(`/playlists/${playlistId}/roster`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: rosterKeys.detail(variables.playlistId) });
    },
  });
}

export function useDispatchRoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (playlistId: string) => {
      const res = await apiClient.post(`/playlists/${playlistId}/roster/dispatch`);
      return res.data;
    },
    onSuccess: (_, playlistId) => {
      queryClient.invalidateQueries({ queryKey: rosterKeys.detail(playlistId) });
    },
  });
}
