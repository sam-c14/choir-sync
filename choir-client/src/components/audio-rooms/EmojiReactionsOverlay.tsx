import React, { useState, useEffect, useCallback } from 'react';
import type { EmojiReactionEvent } from '../../hooks/use-audio-room';

interface FloatingReaction extends EmojiReactionEvent {
  leftPct: number;
  driftPx: number;
}

interface EmojiReactionsOverlayProps {
  currentUserId?: string;
  subscribe: (handler: (reaction: EmojiReactionEvent) => void) => () => void;
}

const MAX_ACTIVE_REACTIONS = 28;

export const EmojiReactionsOverlay = React.memo(function EmojiReactionsOverlay({
  currentUserId,
  subscribe,
}: EmojiReactionsOverlayProps) {
  const [items, setItems] = useState<FloatingReaction[]>([]);

  const removeReaction = useCallback((id: string) => {
    setItems((prev) => {
      if (!prev.some((r) => r.id === id)) return prev;
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    const unsubscribe = subscribe((reaction) => {
      const leftPct = 8 + Math.random() * 28;
      const driftPx = Math.round((Math.random() - 0.5) * 48);

      setItems((prev) => {
        const next = [...prev, { ...reaction, leftPct, driftPx }];
        return next.length > MAX_ACTIVE_REACTIONS
          ? next.slice(next.length - MAX_ACTIVE_REACTIONS)
          : next;
      });

      // Fallback cleanup in case CSS animationend doesn't fire in a backgrounded tab
      const timer = setTimeout(() => {
        timers.delete(reaction.id);
        removeReaction(reaction.id);
      }, 3250);
      timers.set(reaction.id, timer);
    });

    return () => {
      unsubscribe();
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, [subscribe, removeReaction]);

  if (items.length === 0) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-20 top-12 pointer-events-none z-40 overflow-hidden"
      aria-hidden="true"
    >
      {items.map((item) => {
        const isSelf = item.userId === currentUserId;
        const displayName = isSelf ? 'You' : item.senderName.split(' ')[0];

        return (
          <div
            key={item.id}
            onAnimationEnd={(e) => {
              if (e.animationName === 'float-emoji-rise') {
                removeReaction(item.id);
              }
            }}
            style={{ left: `${item.leftPct}%`, bottom: '0px' }}
            className="absolute animate-float-emoji select-none"
          >
            <div
              style={{ '--drift-x': `${item.driftPx}px` } as React.CSSProperties}
              className="flex flex-col items-center animate-float-emoji-sway"
            >
              <span className="text-3xl sm:text-4xl drop-shadow-[0_4px_10px_rgba(0,0,0,0.45)] leading-none animate-float-emoji-pop">
                {item.emoji}
              </span>
              <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-900/90 text-white border border-white/10 shadow-sm max-w-[110px] truncate">
                {displayName}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
});
