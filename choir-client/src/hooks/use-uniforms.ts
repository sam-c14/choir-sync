import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { CreateUniformDto, UpdateUniformDto } from '@choir-workspace/shared-validation';

interface UniformSchedule {
  id: string;
  serviceDate: string;
  femaleOutfit: string;
  maleOutfit: string;
  notes: string | null;
}

export function useUniforms(filter: 'current' | 'past' | 'all' = 'current') {
  return useQuery({
    queryKey: ['uniforms', filter],
    queryFn: async () => {
      const res = await apiClient.get<UniformSchedule[]>(`/uniforms?filter=${filter}`);
      return res.data;
    },
  });
}

export function useCreateUniform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateUniformDto) => {
      const res = await apiClient.post('/uniforms', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uniforms'] });
    },
  });
}

export function useUpdateUniform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUniformDto }) => {
      const res = await apiClient.patch(`/uniforms/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uniforms'] });
    },
  });
}

export function useDeleteUniform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/uniforms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uniforms'] });
    },
  });
}
