import React, { useState } from 'react';
import { usePlayer } from '../contexts/player-context';
import { X, ChevronDown, ChevronUp, PictureInPicture2 } from 'lucide-react';
import { Button } from './ui/button';

export function GlobalPlayer() {
  const { currentTrack, closePlayer, activePreviewUrls } = usePlayer();
  const [isMinimized, setIsMinimized] = useState(false);

  if (!currentTrack) return null;

  const isPreviewAvailable = activePreviewUrls.includes(currentTrack.url);

  return (
    <div 
      className={`fixed z-50 bg-card border shadow-2xl rounded-t-xl sm:rounded-xl overflow-hidden transition-all duration-300 ease-in-out
        bottom-0 left-0 right-0 sm:left-auto sm:right-6 sm:bottom-6 sm:w-80
        ${isMinimized ? 'h-12' : 'h-auto'}
      `}
    >
      {/* Player Header */}
      <div 
        className="flex items-center justify-between px-4 py-2 bg-muted/80 backdrop-blur-sm border-b cursor-pointer h-12"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <span className="text-sm font-semibold truncate flex-1 mr-2 text-foreground">
          {currentTrack.title || 'Now Playing'}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {isPreviewAvailable && (
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-[10px] mr-1 hidden sm:flex"
              onClick={(e) => { e.stopPropagation(); closePlayer(); }}
            >
              <PictureInPicture2 className="w-3 h-3 mr-1.5" />
              Switch to Preview
            </Button>
          )}
          {isPreviewAvailable && (
             <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-full hover:bg-background/50 text-muted-foreground hover:text-foreground sm:hidden"
              onClick={(e) => { e.stopPropagation(); closePlayer(); }}
             >
               <PictureInPicture2 className="w-4 h-4" />
             </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8 rounded-full hover:bg-background/50 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); closePlayer(); }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Media iframe wrapper */}
      <div className={`w-full bg-black transition-all overflow-hidden ${isMinimized ? 'h-0' : 'h-auto'}`}>
        {currentTrack.platform === 'YOUTUBE' && (
          <div className="relative w-full aspect-video">
            <iframe
              className="absolute top-0 left-0 w-full h-full border-0"
              src={`${currentTrack.embedUrl}${currentTrack.embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {currentTrack.platform === 'SPOTIFY' && (
          <iframe
            className="w-full border-0 block"
            src={currentTrack.embedUrl}
            height="152"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        )}
        {currentTrack.platform === 'AUDIOMACK' && (
          <iframe
            className="w-full border-0 block"
            src={currentTrack.embedUrl}
            height="252"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        )}
      </div>
    </div>
  );
}
