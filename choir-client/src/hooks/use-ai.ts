import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { CurateSetlistDto } from '@choir-workspace/shared-validation';

export interface SetlistSuggestion {
  setlistTitle: string;
  explanation: string;
  songs: {
    songId: string | null;
    title: string;
    reason: string;
    suggestedOrder: number;
  }[];
}

export function useCurateSetlist() {
  return useMutation({
    mutationFn: async (data: CurateSetlistDto) => {
      const res = await apiClient.post<SetlistSuggestion>('/ai/curate-setlist', data);
      return res.data;
    }
  });
}
