import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../lib/api-client';
import { queryKeys } from '../lib/query-keys';
import type { CreateSongDto, UpdateSongDto, CreateSongPartDto, CreateSongLinkDto } from '@choir-sync/validation';

export function useSongs() {
  return useQuery({
    queryKey: queryKeys.songs.all,
    queryFn: async () => {
      const response = await apiClient.get('/songs');
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.detail(variables.id) });
    },
  });
}

export function useAddSongPart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateSongPartDto[] }) => {
      const response = await apiClient.put(`/songs/${id}/parts`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.detail(variables.id) });
    },
  });
}

export function useAddSongLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateSongLinkDto }) => {
      const response = await apiClient.post(`/songs/${id}/links`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.songs.detail(variables.id) });
    },
  });
}
