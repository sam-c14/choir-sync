import React, { useState } from 'react';
import { useSongs, useSong, useDeleteSong } from '../hooks/use-songs';
import { useAuth } from '../auth/auth-context';
import { AddSongDialog } from '../components/songs/add-song-dialog';
import { PartNotesEditor } from '../components/songs/part-notes-editor';
import { LinksEditor } from '../components/songs/links-editor';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Loader2, Plus, Search, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

type SortKey = 'title' | 'createdAt' | 'complexity';
type VoiceFilter = 'ALL' | 'SOPRANO' | 'ALTO' | 'TENOR';

const COMPLEXITY_ORDER: Record<string, number> = { EASY: 0, MODERATE: 1, CHALLENGING: 2 };
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

interface Song {
  id: string;
  title: string;
  composer: string | null;
  complexity: string;
  status: string;
  tags: string[];
  createdAt: string;
  parts: { voicePart: string; notes?: string | null }[];
  links: { id: string; platform: string; url: string }[];
}

export default function SongsPage() {
  const { user } = useAuth();
  const { data: songs, isLoading, error } = useSongs();
  const isDirector = user?.role === 'DIRECTOR';

  const activeSongs = (songs ?? []).filter((s: Song) => s.status === 'ACTIVE_SUNDAY');
  const otherSongs = (songs ?? []).filter((s: Song) => s.status !== 'ACTIVE_SUNDAY');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Songs Library</h1>
          <p className="text-muted-foreground mt-1">Manage and view the choir's repertoire</p>
        </div>
        {isDirector && (
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Add Song
          </Button>
        )}
      </div>

      <SongSection
        title="Active Sunday"
        songs={activeSongs}
        isLoading={isLoading}
        error={error}
        onSelectSong={setSelectedSong}
        onEditSong={setEditingSong}
        isDirector={isDirector}
      />

      <SongSection
        title="Rehearsal & Archived"
        songs={otherSongs}
        isLoading={isLoading}
        error={error}
        onSelectSong={setSelectedSong}
        onEditSong={setEditingSong}
        isDirector={isDirector}
      />

      {/* Add / Edit song dialog */}
      <AddSongDialog
        open={addDialogOpen || !!editingSong}
        onOpenChange={(o) => { setAddDialogOpen(o); if (!o) setEditingSong(null); }}
        editingSong={editingSong}
      />

      {/* Song detail drawer */}
      {selectedSong && (
        <SongDetailDialog
          songId={selectedSong}
          onClose={() => setSelectedSong(null)}
        />
      )}
    </div>
  );
}

function SongSection({
  title,
  songs,
  isLoading,
  error,
  onSelectSong,
  onEditSong,
  isDirector,
}: {
  title: string;
  songs: Song[];
  isLoading: boolean;
  error: unknown;
  onSelectSong: (id: string) => void;
  onEditSong: (song: Song) => void;
  isDirector: boolean;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');

  const filtered = songs
    .filter((s) => {
      const q = search.toLowerCase();
      return !q || s.title.toLowerCase().includes(q) || (s.composer ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title);
      if (sortKey === 'complexity')
        return (COMPLEXITY_ORDER[a.complexity] ?? 0) - (COMPLEXITY_ORDER[b.complexity] ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  if (!isLoading && !error && songs.length === 0) {
    return null; // Don't show empty sections initially if they literally have 0 songs total
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <h2 className="text-xl font-semibold tracking-tight">{title} <Badge variant="secondary" className="ml-2">{songs.length}</Badge></h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9 w-[200px] h-9"
              placeholder="Search section…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1">
                Sort <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortKey('createdAt')}>Recently Added</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortKey('title')}>Title A–Z</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortKey('complexity')}>Complexity</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse shadow-sm">
              <CardHeader className="pb-3 space-y-2">
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-4 bg-slate-100 dark:bg-slate-800/50 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
                  <div className="h-5 bg-slate-100 dark:bg-slate-800/50 rounded w-12"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
          Failed to load songs.
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          No songs match your search in this section.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((song) => (
          <Card
            key={song.id}
            className="cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            onClick={() => onSelectSong(song.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-base font-semibold line-clamp-2 leading-tight">{song.title}</CardTitle>
                <Badge variant={(STATUS_COLORS[song.status] ?? 'outline') as 'default' | 'secondary' | 'outline'} className="shrink-0 text-xs">
                  {song.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{song.composer ?? 'Unknown Composer'}</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Badge variant="outline" className={COMPLEXITY_COLORS[song.complexity]}>
                    {song.complexity}
                  </Badge>
                  <span className="text-xs text-muted-foreground self-center">{song.parts.length} parts</span>
                </div>
                {isDirector && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onEditSong(song); }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SongDetailDialog({ songId, onClose }: { songId: string; onClose: () => void }) {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';
  const { data: song, isLoading } = useSong(songId);
  const deleteSong = useDeleteSong();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  return (
    <>
      <Dialog open={!deleteConfirmOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto sm:max-h-[90vh]">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading song details...</p>
            </div>
          )}
          {song && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start pr-6">
                  <div>
                    <DialogTitle className="text-xl leading-tight tracking-tight">{song.title}</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">{song.composer ?? 'Unknown Composer'}</p>
                  </div>
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
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div className="flex gap-2">
                  <Badge variant="outline" className={COMPLEXITY_COLORS[song.complexity]}>
                    {song.complexity}
                  </Badge>
                  <Badge variant={(STATUS_COLORS[song.status] ?? 'outline') as 'default' | 'secondary' | 'outline'}>
                    {song.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Voice Parts</h3>
                    <Button variant="secondary" size="sm" asChild>
                      <Link to={`/songs/${song.id}/parts`}>Manage Parts</Link>
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

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Song</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete "{song?.title}"? This action cannot be undone.
            </p>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!song) return;
                try {
                  await deleteSong.mutateAsync(song.id);
                  toast.success('Song deleted successfully.');
                  setDeleteConfirmOpen(false);
                  onClose();
                } catch {
                  toast.error('Failed to delete song.');
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
