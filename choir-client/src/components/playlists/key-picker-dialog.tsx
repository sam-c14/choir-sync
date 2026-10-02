import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Music } from 'lucide-react';
import { VirtualPitchKeyboard } from '../virtual-pitch-keyboard';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';

export function KeyPickerDialog({ playlist, isDirector }: { playlist: any, isDirector: boolean }) {
  const [open, setOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(playlist.key || null);
  const queryClient = useQueryClient();

  const updateKeyMutation = useMutation({
    mutationFn: async (keyToSave: string | null) => {
      const res = await apiClient.patch(`/playlists/${playlist.id}`, { key: keyToSave });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Playlist master key updated');
      queryClient.invalidateQueries({ queryKey: ['playlists', playlist.id] });
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setOpen(false);
    },
    onError: () => {
      toast.error('Failed to update key');
    }
  });

  const handleSave = () => {
    updateKeyMutation.mutate(selectedKey);
  };

  const handleClear = () => {
    updateKeyMutation.mutate(null);
  };

  // Ensure local state syncs when opened
  React.useEffect(() => {
    if (open) {
      setSelectedKey(playlist.key || null);
    }
  }, [open, playlist.key]);

  if (!isDirector) {
    if (!playlist.key) return null;
    return (
      <Badge variant="default" className="text-sm font-bold px-3 py-1.5 h-9 shadow-sm flex items-center gap-1.5">
        <Music className="w-4 h-4" />
        Playlist Key: {playlist.key}
      </Badge>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="h-9 gap-2 shadow-md px-4 transition-transform active:scale-95 font-bold tracking-wide">
          <Music className="w-4 h-4" />
          {playlist.key ? `Change Playlist Key: ${playlist.key}` : 'Set Playlist Key'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] p-4 sm:p-6 overflow-hidden max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Select Playlist Key</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Test pitch tones on the keyboard below, then select the overarching key for this service setlist.
          </p>
        </DialogHeader>

        <div className="py-4">
          <VirtualPitchKeyboard 
            selectedKey={selectedKey} 
            onSelectKey={(k) => setSelectedKey(k)} 
          />
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground italic text-center mb-4">
          Note: Setting a playlist key does not modify individual song keys.
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          {playlist.key && (
          <Button variant="ghost" onClick={handleClear} disabled={updateKeyMutation.isPending} className="sm:mr-auto text-destructive hover:bg-destructive/10">
            Clear Key
          </Button>
        )}
          <Button variant="outline" onClick={() => setOpen(false)} disabled={updateKeyMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateKeyMutation.isPending}>
            {updateKeyMutation.isPending ? 'Saving...' : 'Save Key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
