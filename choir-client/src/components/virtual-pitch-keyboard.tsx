import React, { useState } from 'react';
import { playPitch } from '../lib/pitch-synth';
import { cn } from '../lib/utils';

export interface VirtualPitchKeyboardProps {
  selectedKey?: string | null;
  onSelectKey?: (keyName: string) => void;
  className?: string;
}

const WHITE_KEYS = [
  { id: 'C', label: 'C', hasBlackAfter: true },
  { id: 'D', label: 'D', hasBlackAfter: true },
  { id: 'E', label: 'E', hasBlackAfter: false },
  { id: 'F', label: 'F', hasBlackAfter: true },
  { id: 'G', label: 'G', hasBlackAfter: true },
  { id: 'A', label: 'A', hasBlackAfter: true },
  { id: 'B', label: 'B', hasBlackAfter: false },
  { id: 'C5', label: 'C', hasBlackAfter: false }, // extra octave root
];

const BLACK_KEYS_MAP: Record<string, { id: string, label: string }> = {
  'C': { id: 'Db', label: 'C#/Db' }, // Db/C#
  'D': { id: 'Eb', label: 'D#/Eb' }, // Eb/D#
  'F': { id: 'Gb', label: 'F#/Gb' }, // Gb/F#
  'G': { id: 'Ab', label: 'G#/Ab' }, // Ab/G#
  'A': { id: 'Bb', label: 'A#/Bb' }, // Bb/A#
};

// Normalize key names for comparison
const normalizeKey = (k: string) => {
  if (!k) return '';
  const map: Record<string, string> = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
  return map[k] || k;
};

export function VirtualPitchKeyboard({ selectedKey, onSelectKey, className }: VirtualPitchKeyboardProps) {
  const [activeNote, setActiveNote] = useState<string | null>(null);

  const handlePress = (keyId: string) => {
    setActiveNote(keyId);
    playPitch(keyId);
    if (onSelectKey) {
      // Return the base letter if it's a white key or C5, otherwise return the id
      let outputKey = keyId === 'C5' ? 'C' : keyId;
      onSelectKey(outputKey);
    }
    setTimeout(() => setActiveNote(null), 150);
  };

  const normalizedSelected = selectedKey ? normalizeKey(selectedKey) : null;

  return (
    <div className={cn("w-full overflow-x-auto pb-4 no-scrollbar", className)}>
      <div className="relative min-w-[320px] max-w-[480px] mx-auto h-[180px] flex">
        {WHITE_KEYS.map((wk, index) => {
          const isSelected = normalizedSelected === wk.id || (wk.id === 'C5' && normalizedSelected === 'C');
          const isActive = activeNote === wk.id;
          
          return (
            <div key={wk.id} className="relative flex-1 flex justify-center">
              {/* White Key */}
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); handlePress(wk.id); }}
                className={cn(
                  "absolute top-0 w-[96%] h-full rounded-b-md border shadow-sm transition-all flex flex-col justify-end pb-3 active:bg-gray-100 select-none",
                  isSelected ? "bg-primary text-primary-foreground border-primary shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)] z-10 scale-[1.02]" : "bg-white border-gray-300",
                  isActive ? "bg-gray-200 transform translate-y-1" : ""
                )}
              >
                <span className={cn("text-lg font-bold", isSelected ? "text-primary-foreground" : "text-gray-700")}>
                  {wk.label}
                </span>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-white/90 shadow-sm mx-auto mt-1 mb-0.5" />
                )}
              </button>

              {/* Black Key (Overlapping) */}
              {wk.hasBlackAfter && BLACK_KEYS_MAP[wk.id] && (
                <button
                  type="button"
                  onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); handlePress(BLACK_KEYS_MAP[wk.id].id); }}
                  className={cn(
                    "absolute top-0 -right-[25%] w-[50%] h-[60%] rounded-b-sm bg-gray-900 shadow-md z-20 flex flex-col justify-end pb-2 active:bg-gray-700 select-none transition-all",
                    normalizedSelected === BLACK_KEYS_MAP[wk.id].id ? "bg-primary border-white border-2 shadow-[0_0_15px_rgba(var(--primary),0.6)] z-30 scale-105" : "",
                    activeNote === BLACK_KEYS_MAP[wk.id].id ? "bg-gray-700 transform translate-y-1" : ""
                  )}
                >
                  <span className="text-[9px] font-medium text-white/90 leading-tight">
                    {BLACK_KEYS_MAP[wk.id].label.split('/').map((l, i) => <span key={i} className="block">{l}</span>)}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
