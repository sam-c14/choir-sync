import React from 'react';
import { useDeleteSong } from '../../hooks/use-songs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { toast } from 'sonner';

export function DeleteSongDialog({
  song,
  open,
  onOpenChange,
  onDeleted,
}: {
  song: { id: string; title: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const deleteSong = useDeleteSong();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Song</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{song?.title}"? This action cannot be undone.
          </p>
        </DialogHeader>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={deleteSong.isPending}
            onClick={async () => {
              if (!song) return;
              try {
                await deleteSong.mutateAsync(song.id);
                toast.success('Song deleted successfully.');
                onOpenChange(false);
                onDeleted?.();
              } catch {
                toast.error('Failed to delete song.');
              }
            }}
          >
            {deleteSong.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
