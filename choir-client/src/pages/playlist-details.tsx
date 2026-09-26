import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePlaylist, useSetPlaylistSongs } from '../hooks/use-playlists';
import { useSongs } from '../hooks/use-songs';
import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/button';
import { Loader2, ArrowLeft, Trash2, Plus, Music } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '../components/ui/input';

export default function PlaylistDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { data: playlist, isLoading } = usePlaylist(id || '');
  const { data: allSongs } = useSongs();
  const setPlaylistSongs = useSetPlaylistSongs();

  const [search, setSearch] = useState('');
  
  const isDirector = user?.role === 'DIRECTOR';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="container mx-auto p-4 text-center mt-12">
        <h2 className="text-xl font-bold">Playlist not found</h2>
        <Button onClick={() => navigate('/playlists')} variant="link">Back to Playlists</Button>
      </div>
    );
  }

  const handleAddSong = async (songId: string) => {
    const currentSongs = playlist.songs || [];
    if (currentSongs.find((s: any) => s.songId === songId)) return;
    
    await setPlaylistSongs.mutateAsync({
      id: playlist.id,
      songs: [
        ...currentSongs.map((s: any) => ({
          songId: s.songId,
          orderIndex: s.orderIndex,
          leadSinger: s.leadSinger,
          customKey: s.customKey
        })),
        { songId, orderIndex: currentSongs.length }
      ]
    });
    setSearch('');
  };

  const handleRemoveSong = async (songId: string) => {
    const currentSongs = playlist.songs || [];
    await setPlaylistSongs.mutateAsync({
      id: playlist.id,
      songs: currentSongs
        .filter((s: any) => s.songId !== songId)
        .map((s: any, idx: number) => ({
          songId: s.songId,
          orderIndex: idx,
          leadSinger: s.leadSinger,
          customKey: s.customKey
        }))
    });
  };

  const filteredSongs = allSongs?.filter((s: any) => 
    s.title.toLowerCase().includes(search.toLowerCase()) || 
    s.composer?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-8">
      <Button variant="ghost" onClick={() => navigate('/playlists')} className="gap-2 -ml-2 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Playlists
      </Button>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{playlist.title}</h1>
        {playlist.description && (
          <p className="text-muted-foreground">{playlist.description}</p>
        )}
        <div className="text-sm text-muted-foreground pt-2">
          Created {format(new Date(playlist.createdAt), 'MMMM d, yyyy')}
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-8">
        {/* Songs List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Music className="w-5 h-5" /> Setlist
          </h3>
          
          {!playlist.songs?.length ? (
            <div className="text-center p-8 border rounded-xl bg-card border-dashed">
              <p className="text-muted-foreground text-sm">No songs added yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {playlist.songs.map((ps: any, idx: number) => (
                <div key={ps.id} className="flex items-center gap-3 p-3 bg-card border rounded-lg shadow-sm">
                  <div className="text-muted-foreground w-6 text-center font-medium text-sm">{idx + 1}</div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/songs/${ps.songId}`} className="font-medium hover:underline truncate block">
                      {ps.song.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {ps.song.originalKey && `Key: ${ps.customKey || ps.song.originalKey}`}
                    </div>
                  </div>
                  {isDirector && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveSong(ps.songId)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar / Quick Add */}
        {isDirector && (
          <div className="space-y-4">
            <div className="bg-card border rounded-xl p-4 sticky top-4">
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide">Add Songs</h3>
              <div className="space-y-3 relative">
                <Input 
                  placeholder="Search repertoire..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                
                {search && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto z-10">
                    {filteredSongs.length > 0 ? (
                      filteredSongs.map((song: any) => {
                        const inPlaylist = playlist.songs?.some((ps: any) => ps.songId === song.id);
                        return (
                          <button
                            key={song.id}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${inPlaylist ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => !inPlaylist && handleAddSong(song.id)}
                            disabled={inPlaylist}
                          >
                            <div className="font-medium">{song.title}</div>
                            <div className="text-xs text-muted-foreground">{song.composer}</div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3">
                        <p className="text-sm text-muted-foreground mb-3">No songs found in repertoire.</p>
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={() => navigate(`/songs/new?playlistId=${playlist.id}`)}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Add New Song to Repertoire & Playlist
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
