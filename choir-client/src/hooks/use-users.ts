import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { UpdateUserRoleDto } from '@choir-workspace/shared-validation';
import { toast } from 'sonner';

export interface User {
  id: string;
  email: string;
  role: 'DIRECTOR' | 'SECTION_LEADER' | 'CHORISTER';
  leadsVoicePart: 'SOPRANO' | 'ALTO' | 'TENOR' | null;
  provider: 'LOCAL' | 'GOOGLE';
  createdAt: string;
}

export interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  totalPages: number;
}

export function useUsers(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['users', page, limit],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedUsers>(`/users?page=${page}&limit=${limit}`);
      return res.data;
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserRoleDto }) => {
      const res = await apiClient.patch(`/users/${id}/role`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update role');
    }
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    }
  });
}
