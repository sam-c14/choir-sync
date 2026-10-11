import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { toast } from 'sonner';
import { CreatePlaylistDto, UpdatePlaylistDto, CreatePlaylistSongDto } from '@choir-workspace/shared-validation';

export interface PaginatedPlaylists {
  data: any[];
  total: number;
  page: number;
  totalPages: number;
}

export function usePlaylists(options: {
  page?: number;
  limit?: number;
  search?: string;
} = {}) {
  const queryParams = new URLSearchParams();
  if (options.page) queryParams.append('page', options.page.toString());
  if (options.limit) queryParams.append('limit', options.limit.toString());
  if (options.search) queryParams.append('search', options.search);

  const queryString = queryParams.toString();
  const url = queryString ? `/playlists?${queryString}` : '/playlists';

  return useQuery<PaginatedPlaylists>({
    queryKey: ['playlists', options],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedPlaylists>(url);
      return data;
    },
    placeholderData: keepPreviousData,
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

export function useSetActivePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive = true }: { id: string; isActive?: boolean }) => {
      const { data } = await apiClient.patch(`/playlists/${id}/active`, { isActive });
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      queryClient.invalidateQueries({ queryKey: ['playlists', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      toast.success(variables.isActive === false ? 'Playlist deactivated' : 'Playlist set as active Sunday lineup');
    },
    onError: () => {
      toast.error('Failed to update active playlist status');
    }
  });
}
