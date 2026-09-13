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

export interface PaginatedUniforms {
  data: UniformSchedule[];
  total: number;
  page: number;
  totalPages: number;
}

export function useUniforms(options: {
  filter?: 'current' | 'past' | 'all';
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
} = {}) {
  const { filter = 'current', page = 1, limit = 20, from, to } = options;
  return useQuery({
    queryKey: ['uniforms', filter, page, limit, from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('filter', filter);
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      
      const res = await apiClient.get<PaginatedUniforms>(`/uniforms?${params.toString()}`);
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
