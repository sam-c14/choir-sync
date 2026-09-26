import React, { useState } from 'react';
import { useAuth } from '../../auth/auth-context';
import { useUpdatePart, useUpdateLyrics } from '../../hooks/use-songs';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { VoicePartTypeEnum } from '@choir-workspace/shared-validation';
import { Pencil, Check, X, Wand2, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SongPart {
  voicePart: string;
  notes?: string | null;
}

interface RehearsalReaderProps {
  songId: string;
  parts: SongPart[];
  lyrics: string | null;
  title: string;
  composer?: string | null;
}

const TABS = ['SOPRANO', 'ALTO', 'TENOR', 'LYRICS'];

export function RehearsalReader({ songId, parts, lyrics: initialLyrics, title, composer }: RehearsalReaderProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [isEditing, setIsEditing] = useState(false);
  
  // For parts
  const activePartData = parts.find(p => p.voicePart === activeTab);
  const [partNotes, setPartNotes] = useState('');
  
  // For lyrics
  const [lyricsContent, setLyricsContent] = useState(initialLyrics || '');
  const [isGenerating, setIsGenerating] = useState(false);

  const updatePart = useUpdatePart();
  const updateLyrics = useUpdateLyrics();

  const isDirector = user?.role === 'DIRECTOR';
  const isSectionLeader = user?.role === 'SECTION_LEADER';
  
  const canEditCurrentTab = () => {
    if (activeTab === 'LYRICS') return isDirector;
    if (isDirector) return true;
    if (isSectionLeader && user?.leadsVoicePart === activeTab) return true;
    return false;
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      if (activeTab === 'LYRICS') {
        setLyricsContent(initialLyrics || '');
      } else {
        setPartNotes(activePartData?.notes || '');
      }
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    try {
      if (activeTab === 'LYRICS') {
        await updateLyrics.mutateAsync({
          id: songId,
          data: { lyrics: lyricsContent.trim() || null }
        });
        toast.success('Lyrics updated');
      } else {
        await updatePart.mutateAsync({
          songId,
          part: activeTab,
          data: { notes: partNotes.trim() || null }
        });
        toast.success(`${activeTab} notes updated`);
      }
      setIsEditing(false);
    } catch (e) {
      toast.error('Failed to save changes');
    }
  };

  const handleAutoGenerate = async () => {
    if (!title) return;
    setIsGenerating(true);
    try {
      const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}${composer ? `&artist_name=${encodeURIComponent(composer)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.plainLyrics) {
          setLyricsContent(data.plainLyrics);
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

  // Tab change
  const setTab = (tab: string) => {
    setIsEditing(false);
    setActiveTab(tab);
  };

  return (
    <div className="space-y-4">
      {/* Mobile-optimized Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar bg-muted/50 p-1 rounded-lg gap-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setTab(tab)}
            className={cn(
              "flex-1 min-w-[80px] py-2 px-3 text-sm font-medium rounded-md transition-all whitespace-nowrap",
              activeTab === tab 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Reader / Editor Content */}
      <div className="bg-card border rounded-xl overflow-hidden flex flex-col min-h-[300px]">
        {/* Header toolbar */}
        <div className="bg-muted/30 border-b px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {activeTab}
          </span>
          {canEditCurrentTab() && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleEditToggle}>
                    <X className="w-3.5 h-3.5 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" className="h-7 px-2" onClick={handleSave} disabled={updatePart.isPending || updateLyrics.isPending}>
                    <Check className="w-3.5 h-3.5 mr-1" /> Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="h-7 px-2" onClick={handleEditToggle}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Mode
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Editor vs Reader Mode */}
        <div className="p-4 flex-1">
          {isEditing ? (
            <div className="space-y-3 h-full flex flex-col">
              {activeTab === 'LYRICS' && (
                <div className="flex justify-end mb-2">
                  <Button type="button" variant="secondary" size="sm" onClick={handleAutoGenerate} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-1.5" />}
                    Auto-generate
                  </Button>
                </div>
              )}
              <Textarea
                className="flex-1 font-mono text-base resize-none min-h-[250px]"
                placeholder={`Enter ${activeTab.toLowerCase()} content here...`}
                value={activeTab === 'LYRICS' ? lyricsContent : partNotes}
                onChange={e => activeTab === 'LYRICS' ? setLyricsContent(e.target.value) : setPartNotes(e.target.value)}
              />
            </div>
          ) : (
            <div className="h-full">
              {activeTab === 'LYRICS' ? (
                <div className="font-mono whitespace-pre-wrap text-base sm:text-lg leading-relaxed">
                  {initialLyrics || <span className="text-muted-foreground italic">No lyrics provided.</span>}
                </div>
              ) : (
                <div className="font-mono whitespace-pre-wrap text-lg sm:text-xl font-bold tracking-wide leading-loose text-foreground">
                  {activePartData?.notes || <span className="text-muted-foreground italic font-normal text-base">No notes for this part.</span>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
