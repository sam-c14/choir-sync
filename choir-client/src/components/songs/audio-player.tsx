import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Play, Pause, Trash2 } from 'lucide-react';
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
}

export function AudioPlayer({ snippet, onDelete, canDelete }: AudioPlayerProps) {
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
    <div className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:border-primary/30 transition-colors group">
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
          <p className="text-sm font-medium truncate pr-2">
            {snippet.title || 'Audio Snippet'}
          </p>
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

      {canDelete && onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          onClick={() => onDelete(snippet.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
