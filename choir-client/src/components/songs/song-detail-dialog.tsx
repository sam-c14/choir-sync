import React from 'react';
import { useSong, useDeleteSong } from '../../hooks/use-songs';
import { useAuth } from '../../auth/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Loader2, Trash2 } from 'lucide-react';
import { PartNotesEditor } from './part-notes-editor';
import { LinksEditor } from './links-editor';
import { DeleteSongDialog } from './delete-song-dialog';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const COMPLEXITY_COLORS: Record<string, string> = {
  EASY: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900',
  MODERATE: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900',
  CHALLENGING: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900',
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE_SUNDAY: 'default',
  REHEARSAL: 'secondary',
  ARCHIVED: 'outline',
};

export function SongDetailDialog({ songId, onClose }: { songId: string; onClose: () => void }) {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';
  const { data: song, isLoading } = useSong(songId);
  const deleteSong = useDeleteSong();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  return (
    <>
      <Dialog open={!deleteConfirmOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto sm:max-h-[90vh]">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading song details...</p>
            </div>
          )}
          {song && (
            <>
              <DialogHeader>
                  <div>
                    <DialogTitle className="text-xl leading-tight tracking-tight">{song.title}</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">{song.composer ?? 'Unknown Composer'}</p>
                  </div>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div className="flex gap-2 items-center">
                  <Badge variant="outline" className={COMPLEXITY_COLORS[song.complexity]}>
                    {song.complexity}
                  </Badge>
                  <Badge variant={(STATUS_COLORS[song.status] ?? 'outline') as 'default' | 'secondary' | 'outline'}>
                    {song.status.replace('_', ' ')}
                  </Badge>
                   {isDirector && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => setDeleteConfirmOpen(true)}
                      title="Delete song"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Voice Parts</h3>
                    <Button variant="secondary" size="sm" render={<Link to={`/songs/${song.id}/parts`} />}>
                      Manage Parts
                    </Button>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {song.parts?.map((p: any) => (
                      <Badge key={p.voicePart} variant="outline" className={COMPLEXITY_COLORS[song.complexity] || ''}>
                        {p.voicePart} {p.notes ? '(Has notes)' : ''}
                      </Badge>
                    ))}
                    {!song.parts?.length && <span className="text-sm text-muted-foreground italic">No parts added</span>}
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <LinksEditor songId={song.id} links={song.links ?? []} />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <DeleteSongDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        song={song}
        onDeleted={onClose}
      />
    </>
  );
}
