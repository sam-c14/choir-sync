import React, { useState } from 'react';
import { useCurateSetlist, SetlistSuggestion } from '../../hooks/use-ai';
import { useCreatePlaylist, useSetPlaylistSongs } from '../../hooks/use-playlists';
import { useCreateSong } from '../../hooks/use-songs';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Sparkles, Loader2, Wand2, Music, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export function AiCuratorDialog({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState('');
  const [serviceType, setServiceType] = useState('Sunday Morning Service');
  const [targetCount, setTargetCount] = useState(4);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [suggestion, setSuggestion] = useState<SetlistSuggestion | null>(null);

  const curate = useCurateSetlist();
  const createPlaylist = useCreatePlaylist();
  const createSong = useCreateSong();
  const setSongs = useSetPlaylistSongs();
  const navigate = useNavigate();

  const handleCurate = async () => {
    if (!theme) {
      toast.error('Please enter a theme or vibe.');
      return;
    }
    try {
      const res = await curate.mutateAsync({ theme, serviceType, targetCount });
      setSuggestion(res);
      toast.success('Setlist curated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.details || error.response?.data?.error || 'Failed to curate setlist');
    }
  };

  const handleCreatePlaylist = async () => {
    if (!suggestion) return;
    try {
      // 1. Create Playlist
      const payload: any = {
        title: suggestion.setlistTitle,
        description: `AI Generated: ${suggestion.explanation}`
      };
      if (serviceDate) {
        payload.serviceDate = new Date(serviceDate);
      }
      const playlist = await createPlaylist.mutateAsync(payload);

      // 2. Resolve external songs
      const songsToAdd = [];
      for (const [idx, s] of suggestion.songs.entries()) {
        if (s.songId) {
          songsToAdd.push({ songId: s.songId, orderIndex: idx });
        } else {
          // Create draft for external song
          const newSong = await createSong.mutateAsync({
            title: `[AI Draft] ${s.title}`,
            status: 'REHEARSAL',
            tags: ['AI Draft']
          });
          songsToAdd.push({ songId: newSong.id, orderIndex: idx });
        }
      }

      if (songsToAdd.length > 0) {
        await setSongs.mutateAsync({ id: playlist.id, songs: songsToAdd });
      }

      setOpen(false);
      navigate(`/playlists/${playlist.id}`);
      toast.success('Playlist drafted!');
    } catch (error) {
      toast.error('Failed to create playlist');
    }
  };

  const PRESETS = ['Thanksgiving', 'High Praise', 'Communion', 'Easter', 'Reflective Worship'];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="w-[92vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            AI Worship Curator
          </DialogTitle>
        </DialogHeader>

        {!suggestion ? (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>Quick Presets</Label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map(p => (
                  <Button 
                    key={p} 
                    variant={theme === p ? "default" : "secondary"} 
                    size="sm"
                    onClick={() => setTheme(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Theme or Vibe</Label>
              <Textarea 
                placeholder="e.g. Fast tempo Nigerian praise medley opening, followed by deep worship..."
                value={theme}
                onChange={e => setTheme(e.target.value)}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>Service Type</Label>
                <Input 
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label>Target Song Count</Label>
                <Input 
                  type="number"
                  min={1} max={10}
                  value={targetCount}
                  onChange={e => setTargetCount(parseInt(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-3 mt-4">
              <Label>Service Date (Optional)</Label>
              <Input 
                type="date"
                value={serviceDate} 
                onChange={e => setServiceDate(e.target.value)} 
              />
            </div>

            <Button 
              className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleCurate}
              disabled={curate.isPending || !theme || !serviceDate}
            >
              {curate.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Wand2 className="w-5 h-5 mr-2" />}
              Generate Setlist
            </Button>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl space-y-2">
              <h3 className="font-bold text-lg text-indigo-700 dark:text-indigo-300">
                {suggestion.setlistTitle}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {suggestion.explanation}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Suggested Flow</h4>
              <div className="space-y-2">
                {suggestion.songs.sort((a,b) => a.suggestedOrder - b.suggestedOrder).map((song, i) => (
                  <div key={i} className="p-3 border rounded-lg bg-card flex gap-3">
                    <div className="mt-0.5 text-muted-foreground font-medium text-sm w-4">
                      {i + 1}.
                    </div>
                    <div>
                      <h5 className="font-medium text-sm flex items-center gap-2">
                        {song.title}
                        {!song.songId && <span className="text-[10px] uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-sm">External</span>}
                      </h5>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {song.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setSuggestion(null)}>
                Start Over
              </Button>
              <Button 
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleCreatePlaylist}
                disabled={createPlaylist.isPending || setSongs.isPending}
              >
                {createPlaylist.isPending || setSongs.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Create Playlist from This
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
