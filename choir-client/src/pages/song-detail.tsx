import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSong } from '../hooks/use-songs';
import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Trash2, ArrowLeft } from 'lucide-react';
import { LinksEditor } from '../components/songs/links-editor';
import { DeleteSongDialog } from '../components/songs/delete-song-dialog';
import { RehearsalReader } from '../components/songs/rehearsal-reader';

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
  const isDirector = user?.role === 'DIRECTOR' || user?.role === 'ADMIN';
  const { data: song, isLoading, isError } = useSong(songId!);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
          <div className="pt-6 border-t space-y-4">
             <Skeleton className="h-64 w-full rounded-lg" />
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
            <p className="text-lg text-muted-foreground mt-1">
              {song.composer ?? 'Unknown Composer'}
              {song.originalKey && <span className="ml-2 font-mono text-sm bg-secondary px-2 py-0.5 rounded-md text-secondary-foreground">Key: {song.originalKey}</span>}
            </p>
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
          <RehearsalReader 
            songId={song.id} 
            parts={song.parts || []} 
            lyrics={song.lyrics} 
            title={song.title} 
            composer={song.composer} 
          />
        </div>

        <div className="pt-6 border-t">
          <LinksEditor songId={song.id} links={song.links ?? []} songTitle={song.title} />
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
