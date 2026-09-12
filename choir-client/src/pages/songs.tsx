import React, { useState } from 'react';
import { useSongs, useSong } from '../hooks/use-songs';
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
import { Loader2, Plus, Search, ChevronDown, Pencil } from 'lucide-react';

type SortKey = 'title' | 'createdAt' | 'complexity';
type VoiceFilter = 'ALL' | 'SOPRANO' | 'ALTO' | 'TENOR';

const COMPLEXITY_ORDER: Record<string, number> = { EASY: 0, MODERATE: 1, CHALLENGING: 2 };
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
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm">
          Failed to load songs. Please try again.
        </div>
      )}
      {songs && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500 border border-dashed rounded-lg">
          No songs match your search.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((song) => (
          <Card
            key={song.id}
            className="cursor-pointer shadow-sm hover:shadow-md transition-shadow"
            onClick={() => setSelectedSong(song.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-base font-semibold line-clamp-2">{song.title}</CardTitle>
                <Badge variant={(STATUS_COLORS[song.status] ?? 'outline') as 'default' | 'secondary' | 'outline'} className="shrink-0 text-xs">
                  {song.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-sm text-slate-500">{song.composer ?? 'Unknown Composer'}</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Badge variant="outline">{song.complexity}</Badge>
                  <span className="text-xs text-slate-400 self-center">{song.parts.length} parts</span>
                </div>
                {isDirector && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-slate-400 hover:text-slate-700"
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
  const { data: song, isLoading } = useSong(songId);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}
        {song && (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg">{song.title}</DialogTitle>
              <p className="text-sm text-slate-500">{song.composer ?? 'Unknown Composer'}</p>
            </DialogHeader>
            <div className="space-y-6 mt-2">
              <div className="flex gap-2">
                <Badge variant="outline">{song.complexity}</Badge>
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
