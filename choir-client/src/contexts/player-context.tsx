import React, { createContext, useContext, useState, ReactNode } from 'react';

export type TrackInfo = {
  platform: string;
  url: string;
  embedUrl: string;
  title?: string;
};

interface PlayerContextType {
  currentTrack: TrackInfo | null;
  playTrack: (track: TrackInfo) => void;
  closePlayer: () => void;
  activePreviewUrls: string[];
  setActivePreviewUrls: (urls: string[]) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<TrackInfo | null>(null);
  const [activePreviewUrls, setActivePreviewUrls] = useState<string[]>([]);

  const playTrack = (track: TrackInfo) => {
    setCurrentTrack(track);
  };

  const closePlayer = () => setCurrentTrack(null);

  return (
    <PlayerContext.Provider value={{ currentTrack, playTrack, closePlayer, activePreviewUrls, setActivePreviewUrls }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
};
