import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Play, Pause, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { format } from 'date-fns';

interface AudioPlayerProps {
  snippet: {
    id: string;
    audioUrl: string;
    durationSec: number;
    title?: string | null;
    createdAt: string | Date;
    user: {
      id: string;
      email: string;
    };
  };
  onDelete?: (id: string) => void;
  canDelete?: boolean;
  onEditTitle?: (id: string, newTitle: string) => Promise<void>;
  canEdit?: boolean;
}

export function AudioPlayer({ snippet, onDelete, canDelete, onEditTitle, canEdit }: AudioPlayerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  
  const handleEditStart = () => {
    setEditValue(snippet.title || '');
    setIsEditing(true);
  };

  const handleEditSave = async () => {
    if (!editValue.trim() || !onEditTitle) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onEditTitle(snippet.id, editValue.trim());
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(snippet.audioUrl);
      
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
      });
      
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - bounds.left;
    const percentage = x / bounds.width;
    audioRef.current.currentTime = percentage * audioRef.current.duration;
    setProgress(percentage * 100);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col p-3 bg-card border rounded-lg hover:border-primary/30 transition-colors group">
      <div className="flex items-center gap-3">
        <Button 
          variant={isPlaying ? "default" : "outline"} 
          size="icon" 
          className="h-10 w-10 shrink-0 rounded-full"
          onClick={togglePlay}
        >
          {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
        </Button>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-1">
            {isEditing ? (
              <div className="flex items-center gap-1 pr-2 w-full">
                <Input 
                  value={editValue} 
                  onChange={e => setEditValue(e.target.value)} 
                  className="h-7 text-sm px-2 py-0 border-primary" 
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleEditSave();
                    if (e.key === 'Escape') handleEditCancel();
                  }}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleEditSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-green-500" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleEditCancel} disabled={isSaving}>
                  <X className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ) : (
              <p className="text-sm font-medium truncate pr-2">
                {snippet.title || 'Audio Snippet'}
              </p>
            )}
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTime(snippet.durationSec)}
            </span>
          </div>
          
          <div 
            className="h-1.5 bg-secondary rounded-full cursor-pointer relative"
            onClick={handleSeek}
          >
            <div 
              className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%`, transitionDuration: isPlaying ? '200ms' : '0ms' }}
            />
          </div>
          
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span className="truncate max-w-[120px]">{snippet.user.email}</span>
            <span>{format(new Date(snippet.createdAt), 'MMM d')}</span>
          </div>
        </div>
      </div>

      {(canEdit || canDelete) && !isEditing && (
        <div className="flex justify-end gap-1 mt-3 pt-2 border-t">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
              onClick={handleEditStart}
            >
              <Pencil className="w-3 h-3 mr-1.5" />
              Edit Label
            </Button>
          )}
          
          {canDelete && onDelete && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-3 h-3 mr-1.5" />
                Delete
              </Button>
              
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="max-w-sm sm:max-w-md w-[90vw] p-6">
                  <DialogHeader>
                    <DialogTitle>Delete Audio Recording?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete the audio recording "{snippet.title || 'Audio Snippet'}".
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={() => setDeleteOpen(false)} className="w-full sm:w-auto">Cancel</Button>
                    <Button variant="destructive" onClick={() => { onDelete(snippet.id); setDeleteOpen(false); }} className="w-full sm:w-auto">Delete</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      )}
    </div>
  );
}
