import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, Loader2, Plus, Music } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface AddSongDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  songs: any[];
  playlistSongs: any[];
  onAddSong: (songId: string) => void;
  isAdding: boolean;
  playlistId: string;
}

export function AddSongDialog({ open, onOpenChange, songs, playlistSongs, onAddSong, isAdding, playlistId }: AddSongDialogProps) {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filteredSongs = songs.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.composer?.toLowerCase().includes(q);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Song to Setlist</DialogTitle>
        </DialogHeader>
        
        <div className="relative mt-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search repertoire..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-2">
          {filteredSongs.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Music className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium">No songs found</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">You can add a new song to your repertoire first.</p>
                <Button 
                  size="sm" 
                  onClick={() => navigate(`/songs/new?playlistId=${playlistId}`)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" /> Create New Song
                </Button>
              </div>
            </div>
          ) : (
            filteredSongs.map(song => {
              const inPlaylist = playlistSongs.some(ps => ps.songId === song.id);
              
              return (
                <div 
                  key={song.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    inPlaylist 
                      ? "bg-muted/50 border-transparent opacity-60" 
                      : "bg-card hover:bg-muted/50 border-border"
                  )}
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-medium leading-none truncate">{song.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{song.composer || 'Unknown Composer'}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={inPlaylist ? "outline" : "default"}
                    disabled={inPlaylist || isAdding}
                    onClick={() => onAddSong(song.id)}
                  >
                    {inPlaylist ? 'Added' : 'Add'}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
