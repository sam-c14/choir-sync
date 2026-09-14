import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Pencil, Check, X, Wand2, Loader2 } from 'lucide-react';
import { useUpdateLyrics } from '../../hooks/use-songs';
import { toast } from 'sonner';

export function LyricsKeyEditor({ songId, initialLyrics, initialKey, title, composer }: { songId: string; initialLyrics: string | null; initialKey: string | null; title: string; composer?: string | null }) {
  const [isEditing, setIsEditing] = useState(false);
  const [lyrics, setLyrics] = useState(initialLyrics || '');
  const [originalKey, setOriginalKey] = useState(initialKey || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const updateLyrics = useUpdateLyrics();

  const handleAutoGenerate = async () => {
    if (!title) return;
    setIsGenerating(true);
    try {
      const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}${composer ? `&artist_name=${encodeURIComponent(composer)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.plainLyrics) {
          setLyrics(data.plainLyrics);
          toast.success('Lyrics auto-generated. Click Save to apply changes.');
          return;
        }
      }
      toast.error('No lyrics could be found for this song.');
    } catch (e) {
      toast.error('No lyrics could be found for this song.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateLyrics.mutateAsync({
        id: songId,
        data: {
          lyrics: lyrics.trim() || null,
          originalKey: originalKey.trim() || null,
        },
      });
      setIsEditing(false);
      toast.success('Lyrics and key updated');
    } catch (e) {
      toast.error('Failed to update lyrics and key');
    }
  };

  const handleCancel = () => {
    setLyrics(initialLyrics || '');
    setOriginalKey(initialKey || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Edit Details</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Original Key</label>
            <Input 
              value={originalKey}
              onChange={(e) => setOriginalKey(e.target.value)}
              placeholder="e.g. C Major, Gm, Eb..."
              className="w-full sm:w-1/2"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-muted-foreground block">Lyrics</label>
              <Button type="button" variant="outline" size="sm" onClick={handleAutoGenerate} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-1.5" />}
                Auto-generate
              </Button>
            </div>
            <Textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Enter song lyrics..."
              className="min-h-32 max-h-40 font-mono text-sm"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="w-3.5 h-3.5 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateLyrics.isPending}>
              <Check className="w-3.5 h-3.5 mr-1" /> {updateLyrics.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative group">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Original Key & Lyrics</h3>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground" onClick={() => setIsEditing(true)}>
          <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
        </Button>
      </div>
      
      {initialKey && (
        <div>
          <span className="text-xs font-medium text-muted-foreground">Key:</span>
          <span className="ml-2 text-sm font-semibold bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md">{initialKey}</span>
        </div>
      )}

      {initialLyrics ? (
        <div className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap font-mono text-muted-foreground max-h-48 overflow-y-auto">
          {initialLyrics}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No lyrics provided.</p>
      )}
    </div>
  );
}
