import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { CreatePlaylistDto, UpdatePlaylistDto, CreatePlaylistSongDto } from '@choir-workspace/shared-validation';

export function usePlaylists() {
  return useQuery({
    queryKey: ['playlists'],
    queryFn: async () => {
      const { data } = await apiClient.get('/playlists');
      return data;
    }
  });
}

export function usePlaylist(id: string) {
  return useQuery({
    queryKey: ['playlists', id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await apiClient.get(`/playlists/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePlaylistDto) => {
      const { data } = await apiClient.post('/playlists', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    }
  });
}

export function useUpdatePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePlaylistDto }) => {
      const res = await apiClient.patch(`/playlists/${id}`, data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlists', variables.id] });
    }
  });
}

export function useDeletePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/playlists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
    }
  });
}

export function useSetPlaylistSongs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, songs }: { id: string; songs: CreatePlaylistSongDto[] }) => {
      const { data } = await apiClient.post(`/playlists/${id}/songs`, songs);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlists', variables.id] });
    }
  });
}
