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

  const [search, setSearch] = useState('');
  const [voiceFilter, setVoiceFilter] = useState<VoiceFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [selectedSong, setSelectedSong] = useState<string | null>(null);

  const filtered: Song[] = (songs ?? [])
    .filter((s: Song) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q || s.title.toLowerCase().includes(q) || (s.composer ?? '').toLowerCase().includes(q);
      const matchesPart =
        voiceFilter === 'ALL' || s.parts.some((p) => p.voicePart === voiceFilter);
      return matchesSearch && matchesPart;
    })
    .sort((a: Song, b: Song) => {
      if (sortKey === 'title') return a.title.localeCompare(b.title);
      if (sortKey === 'complexity')
        return (COMPLEXITY_ORDER[a.complexity] ?? 0) - (COMPLEXITY_ORDER[b.complexity] ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search by title or composer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* Voice part filter chips */}
        <div className="flex gap-1.5">
          {(['ALL', 'SOPRANO', 'ALTO', 'TENOR'] as VoiceFilter[]).map((v) => (
            <button
              key={v}
              onClick={() => setVoiceFilter(v)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                ${voiceFilter === v
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'}`}
            >
              {v === 'ALL' ? 'All parts' : v}
            </button>
          ))}
        </div>
        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              Sort <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSortKey('createdAt')}>Recently Added</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortKey('title')}>Title A–Z</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortKey('complexity')}>Complexity</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {isDirector && (
          <Button size="sm" className="gap-1" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4" /> Add song
          </Button>
        )}
      </div>

      {/* Song grid */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
          Failed to load songs. Please try again.
        </div>
      )}
      {songs && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg flex flex-col items-center justify-center space-y-3">
          <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium">No songs match your search.</p>
          {isDirector && (
            <Button variant="link" onClick={() => setAddDialogOpen(true)}>
              Add a new song
            </Button>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((song) => (
          <Card
            key={song.id}
            className="cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            onClick={() => setSelectedSong(song.id)}
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
                    onClick={(e) => { e.stopPropagation(); setEditingSong(song); }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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

function SongDetailDialog({ songId, onClose }: { songId: string; onClose: () => void }) {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';
  const { data: song, isLoading } = useSong(songId);
  const deleteSong = useDeleteSong();

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
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
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this song?')) {
                        await deleteSong.mutateAsync(song.id);
                        onClose();
                      }
                    }}
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
              <PartNotesEditor songId={song.id} parts={song.parts ?? []} />
              <LinksEditor songId={song.id} links={song.links ?? []} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
