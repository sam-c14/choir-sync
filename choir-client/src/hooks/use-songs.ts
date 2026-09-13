import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';
import type {
  CreateSongDto,
  UpdateSongDto,
  CreateSongPartDto,
  CreateSongLinkDto,
  UpdateSongPartDto,
} from '@choir-workspace/shared-validation';

export interface PaginatedSongs {
  data: any[];
  total: number;
  page: number;
  totalPages: number;
}

export function useSongs(options: {
  page?: number;
  limit?: number;
  search?: string;
  voicePart?: string;
  complexity?: string;
  status?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
} = {}) {
  const queryParams = new URLSearchParams();
  if (options.page) queryParams.append('page', options.page.toString());
  if (options.limit) queryParams.append('limit', options.limit.toString());
  if (options.search) queryParams.append('search', options.search);
  if (options.voicePart && options.voicePart !== 'ALL') queryParams.append('voicePart', options.voicePart);
  if (options.complexity && options.complexity !== 'ALL') queryParams.append('complexity', options.complexity);
  if (options.status && options.status !== 'ALL') queryParams.append('status', options.status);
  if (options.sortBy) queryParams.append('sortBy', options.sortBy);
  if (options.order) queryParams.append('order', options.order);

  const queryString = queryParams.toString();

  return useQuery({
    queryKey: [...queryKeys.songs.all, options],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedSongs>(`/songs?${queryString}`);
      return response.data;
    },
  });
}

export function useSong(id: string) {
  return useQuery({
    queryKey: queryKeys.songs.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(`/songs/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSongDto) => {
      const response = await apiClient.post('/songs', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
    },
  });
}

export function useUpdateSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSongDto }) => {
      const response = await apiClient.patch(`/songs/${id}`, data);
      return response.data;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.detail(variables.id) });
    },
  });
}

export function useUpdateLyrics() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { lyrics?: string | null, originalKey?: string | null } }) => {
      const response = await apiClient.patch(`/songs/${id}/lyrics`, data);
      return response.data;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.detail(variables.id) });
    },
  });
}

export function useAddSongPart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ songId, data }: { songId: string; data: CreateSongPartDto[] }) => {
      const response = await apiClient.put(`/songs/${songId}/parts`, data);
      return response.data;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.detail(variables.songId) });
    },
  });
}

export function useUpdatePart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ songId, part, data }: { songId: string; part: string; data: UpdateSongPartDto }) => {
      const response = await apiClient.patch(`/songs/${songId}/parts/${part}`, data);
      return response.data;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.detail(variables.songId) });
    },
  });
}

export function useAddSongLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ songId, data }: { songId: string; data: CreateSongLinkDto }) => {
      const response = await apiClient.post(`/songs/${songId}/links`, data);
      return response.data;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.detail(variables.songId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
    },
  });
}

export function useDeleteSongLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ songId, linkId }: { songId: string; linkId: string }) => {
      const response = await apiClient.delete(`/songs/${songId}/links/${linkId}`);
      return response.data;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.detail(variables.songId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
    },
  });
}

export function useDeleteSong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/songs/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
    },
  });
}
