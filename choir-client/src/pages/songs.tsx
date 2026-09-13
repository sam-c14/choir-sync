import React, { useState } from 'react';
import { useSongs, useSong, useDeleteSong } from '../hooks/use-songs';
import { useAuth } from '../auth/auth-context';
import { AddSongDialog } from '../components/songs/add-song-dialog';
import { SongDetailDialog } from '../components/songs/song-detail-dialog';
import { DeleteSongDialog } from '../components/songs/delete-song-dialog';
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
  const isDirector = user?.role === 'DIRECTOR';

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [deletingSong, setDeletingSong] = useState<Song | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Songs Library</h1>
          <p className="text-muted-foreground mt-1">Manage and view the choir's repertoire</p>
        </div>
        {isDirector && (
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Add Song
          </Button>
        )}
      </div>

      <SongSection
        title="Active Sunday"
        status="ACTIVE_SUNDAY"
        onSelectSong={setSelectedSong}
        onEditSong={setEditingSong}
        onDeleteSong={setDeletingSong}
        isDirector={isDirector}
      />

      <SongSection
        title="Rehearsal & Archived"
        status="REHEARSAL,ARCHIVED"
        onSelectSong={setSelectedSong}
        onEditSong={setEditingSong}
        onDeleteSong={setDeletingSong}
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

      {/* Delete song dialog */}
      <DeleteSongDialog
        song={deletingSong}
        open={!!deletingSong}
        onOpenChange={(o) => { if (!o) setDeletingSong(null); }}
      />
    </div>
  );
}

function SongSection({
  title,
  status,
  onSelectSong,
  onEditSong,
  onDeleteSong,
  isDirector,
}: {
  title: string;
  status: string;
  onSelectSong: (id: string) => void;
  onEditSong: (song: Song) => void;
  onDeleteSong: (song: Song) => void;
  isDirector: boolean;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [page, setPage] = useState(1);
  const limit = 12;

  const sortBy = sortKey === 'complexity' ? 'complexity' : sortKey === 'title' ? 'title' : 'createdAt';
  const order = sortKey === 'createdAt' ? 'desc' : 'asc';

  const { data: songsData, isLoading, error } = useSongs({
    page,
    limit,
    status,
    search: search.trim() || undefined,
    sortBy,
    order,
  });

  const songs: Song[] = songsData?.data || [];
  const totalPages = songsData?.totalPages || 1;

  if (!isLoading && !error && songs.length === 0 && !search && page === 1) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <h2 className="text-xl font-semibold tracking-tight">{title} <Badge variant="secondary" className="ml-2">{songsData?.total ?? 0}</Badge></h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9 w-full sm:w-[200px] h-9"
              placeholder="Search section…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1 shrink-0">
                Sort <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSortKey('createdAt'); setPage(1); }}>Recently Added</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortKey('title'); setPage(1); }}>Title A–Z</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setSortKey('complexity'); setPage(1); }}>Complexity</DropdownMenuItem>
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

      {!isLoading && !error && songs.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
          No songs match your search in this section.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {songs.map((song) => (
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
                  <div className="flex">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={(e) => { e.stopPropagation(); onEditSong(song); }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={(e) => { e.stopPropagation(); onDeleteSong(song); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
