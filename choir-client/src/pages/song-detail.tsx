import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSong, useDeleteSong } from '../hooks/use-songs';
import { useAuth } from '../auth/auth-context';
import { Button, buttonVariants } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Loader2, Trash2, ArrowLeft } from 'lucide-react';
import { LinksEditor } from '../components/songs/links-editor';
import { DeleteSongDialog } from '../components/songs/delete-song-dialog';
import { LyricsKeyEditor } from '../components/songs/lyrics-key-editor';
import { cn } from '../lib/utils';

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

export default function SongDetailPage() {
  const { id: songId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';
  const { data: song, isLoading, isError } = useSong(songId!);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div>
          <Skeleton className="h-9 w-32 mb-4 -ml-4" />
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-6 w-40 mt-1" />
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="flex gap-2 items-center">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
          <div className="pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-9 w-28" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
          <div className="pt-6 border-t space-y-4">
            <div className="flex items-center justify-between mb-2">
               <Skeleton className="h-5 w-24" />
               <Skeleton className="h-9 w-20" />
            </div>
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
          <div className="pt-6 border-t space-y-4">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !song) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 text-center">
        <h2 className="text-xl font-semibold text-destructive">Song Not Found</h2>
        <p className="text-muted-foreground">The song you're looking for doesn't exist or failed to load.</p>
        <Button variant="outline" onClick={() => navigate('/')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Library
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 space-y-8">
      <div>
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4 -ml-4 text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Library
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{song.title}</h1>
            <p className="text-lg text-muted-foreground mt-1">{song.composer ?? 'Unknown Composer'}</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
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
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 ml-auto"
              onClick={() => setDeleteConfirmOpen(true)}
              title="Delete song"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="pt-6 border-t">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Voice Parts</h3>
            <Link
              to={`/songs/${song.id}/parts`}
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
            >
              Manage Parts
            </Link>
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
        <div className="pt-6 border-t">
          <LyricsKeyEditor songId={song.id} initialLyrics={song.lyrics} initialKey={song.originalKey} title={song.title} composer={song.composer} />
        </div>
        <div className="pt-6 border-t">
          <LinksEditor songId={song.id} links={song.links ?? []} />
        </div>
      </div>

      <DeleteSongDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        song={song}
        onDeleted={() => navigate('/')}
      />
    </div>
  );
}
