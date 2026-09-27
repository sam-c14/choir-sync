import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { CreateVoiceSnippetDto } from '@choir-workspace/shared-validation';

export function useSnippetUploadUrl() {
  return useMutation({
    mutationFn: async (partId: string) => {
      const res = await apiClient.post(`/song-parts/${partId}/snippets/upload-url`);
      return res.data;
    }
  });
}

export function useCreateSnippet() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ partId, data }: { partId: string, data: CreateVoiceSnippetDto }) => {
      const res = await apiClient.post(`/song-parts/${partId}/snippets`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    }
  });
}

export function useDeleteSnippet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/snippets/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] });
    }
  });
}
